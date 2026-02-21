import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { SalesService } from '../api/SalesService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const fetchProductStats = createAsyncThunk(
    'productStats/fetch',
    async ({ warehouseId, force = false, overrideDates = null }, { getState, rejectWithValue }) => {
        const state = getState().productStats;
        
        // Folosim datele din override (dacă există) sau din state-ul curent
        const start = overrideDates ? overrideDates.start : state.startDate;
        const end = overrideDates ? overrideDates.end : state.endDate;

        // Protecție Cache: Nu facem fetch dacă avem datele pentru aceeași gestiune și nu e selecție de produs
        if (!force && state.loadedWarehouseId === warehouseId && state.topData.length > 0 && !state.selectedProduct) {
            return { data: state.topData, type: 'TOP', warehouseId, cached: true };
        }

        try {
            if (state.selectedProduct) {
                const timeline = await SalesService.getProductTimeline({
                    start,
                    end,
                    warehouseId,
                    productId: state.selectedProduct.id
                });

                const productSales = (timeline || []).map((item) => ({
                    id: item.id,
                    receiptId: item.receiptId,
                    date: item.date,
                    quantity: Number(item.quantity || 0),
                    price: Number(item.price || 0),
                    total: Number(item.total || 0),
                    userName: item.userName
                }));

                return { type: 'TIMELINE', data: productSales, warehouseId, cached: false };
            } else {
                const receipts = await SalesService.getReceiptsHistory({
                    start,
                    end,
                    warehouseId,
                    status: 'CLOSED'
                });

                // MOD DASHBOARD (Topuri)
                const aggregations = {};
                for (const r of receipts) {
                    if (!r.items) continue;
                    for (const item of r.items) {
                        if (!item.productId) continue;

                        const name = (item.name || "").toLowerCase();
                        if (name.includes("avans")) continue; 

                        if (!aggregations[item.productId]) {
                            aggregations[item.productId] = { 
                                productId: item.productId, 
                                productName: item.name, 
                                quantity: 0, 
                                totalAmount: 0 
                            };
                        }
                        aggregations[item.productId].quantity += Number(item.quantity || 0);
                        aggregations[item.productId].totalAmount += Number(item.lineTotal || 0);
                    }
                }
                return { type: 'TOP', data: Object.values(aggregations), warehouseId, cached: false };
            }
        } catch (err) {
            return rejectWithValue(getFriendlyErrorMessage(err));
        }
    }
);

const initialState = {
    selectedProduct: null,
    startDate: dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss'),
    endDate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    timelineData: [],
    topData: [],
    loadedWarehouseId: null,
    loading: false,
    error: null
};

const productStatsSlice = createSlice({
    name: 'productStats',
    initialState,
    reducers: {
        setSelectedProduct: (state, action) => {
            state.selectedProduct = action.payload;
            state.timelineData = []; // Clear vechiul timeline la schimbare
        },
        setDateRange: (state, action) => {
            state.startDate = action.payload.start;
            state.endDate = action.payload.end;
        },
        resetStats: () => initialState
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProductStats.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProductStats.fulfilled, (state, action) => {
                state.loading = false;
                if (!action.payload.cached) {
                    if (action.payload.type === 'TIMELINE') {
                        state.timelineData = action.payload.data;
                    } else {
                        state.topData = action.payload.data;
                    }
                    state.loadedWarehouseId = action.payload.warehouseId;
                }
            })
            .addCase(fetchProductStats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

// SELECTORI OPTIMIZAȚI
export const selectDashboardStats = createSelector(
    (state) => state.productStats.topData,
    (topData) => {
        if (!topData || topData.length === 0) return null;
        const validItems = topData.filter(i => i.quantity > 0);
        
        return {
            bestSellers: [...validItems].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
            bestRevenue: [...validItems].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5),
            worstSellers: [...validItems].sort((a, b) => a.quantity - b.quantity).slice(0, 5),
            worstRevenue: [...validItems].sort((a, b) => a.totalAmount - b.totalAmount).slice(0, 5),
            globalStats: { 
                totalQty: validItems.reduce((acc, curr) => acc + curr.quantity, 0), 
                totalValue: validItems.reduce((acc, curr) => acc + curr.totalAmount, 0) 
            }
        };
    }
);

export const selectProductTimeline = createSelector(
    (state) => state.productStats.timelineData,
    (timelineData) => {
        const result = { groups: [], stats: { totalQty: 0, totalValue: 0 } };
        if (!timelineData || timelineData.length === 0) return result;

        const groupsObj = {};
        let totalQty = 0;
        let totalValue = 0;

        timelineData.forEach(item => {
            const date = dayjs(item.date);
            const key = date.format('MM-YYYY');
            
            if (!groupsObj[key]) {
                groupsObj[key] = { 
                    id: key, 
                    label: date.format('MMMM YYYY').toUpperCase(), 
                    items: [], 
                    groupQty: 0, 
                    groupValue: 0, 
                    sortKey: date.valueOf() 
                };
            }
            
            groupsObj[key].items.push(item);
            groupsObj[key].groupQty += item.quantity;
            groupsObj[key].groupValue += item.total;
            
            totalQty += item.quantity;
            totalValue += item.total;
        });

        result.groups = Object.values(groupsObj).sort((a, b) => b.sortKey - a.sortKey);
        result.stats = { totalQty, totalValue };
        
        return result;
    }
);

export const { setSelectedProduct, setDateRange, resetStats } = productStatsSlice.actions;
export default productStatsSlice.reducer;