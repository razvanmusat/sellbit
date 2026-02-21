import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { CateringService } from '../api/CateringService';

// --- THUNKS ---

// 1. Fetch Date Inițiale (DASHBOARD LOAD - Se apelează la intrarea pe pagină)
// Acum încarcă SI Istoricul (Start An -> Azi)
export const fetchCateringDashboardData = createAsyncThunk(
    'catering/fetchDashboardData',
    async (_, { rejectWithValue }) => {
        try {
            // Interval default (Start An -> Azi)
            const startYear = dayjs().startOf('year').format('YYYY-MM-DD');
            const today = dayjs().format('YYYY-MM-DD');

            // Cereri în paralel (mai rapid)
            const [products, unpaid] = await Promise.all([
                CateringService.getAvailableProducts(),
                CateringService.getUnpaidOrders(startYear, today)
            ]);

            const prices = {};
            (products || []).forEach((p) => {
                prices[p.id] = p.purchasePrice || 0;
            });

            return { unpaid, prices };
        } catch (error) {
            return rejectWithValue(error.message || 'Eroare date catering.');
        }
    }
);

// 2. Fetch Istoric Manual (Când userul schimbă filtrele de dată)
export const fetchHistoryRange = createAsyncThunk(
    'catering/fetchHistoryRange',
    async ({ start, end }, { rejectWithValue }) => {
        try {
            const data = await CateringService.getPaidHistory(start, end);
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// 3. Procesare Plată
export const processCateringPayment = createAsyncThunk(
    'catering/processPayment',
    async (orderIds, { dispatch, rejectWithValue }) => {
        try {
            await CateringService.processBulkPayment({ orderIds });
            // Reîncărcăm tot dashboard-ul pentru a actualiza listele (mută din unpaid în history)
            dispatch(fetchCateringDashboardData());
            return orderIds;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// --- SLICE ---

const initialState = {
    unpaidOrders: [],       
    historyOrders: [],      // <--- STATE NOU PENTRU ISTORIC
    priceMap: {},           
    minUnpaidDate: null,    
    loading: false,         // Loading general (inițial)
    historyLoading: false,  // Loading specific pt filtrare istoric
    error: null,
    lastUpdated: null
};

const cateringSlice = createSlice({
    name: 'catering',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; }
    },
    extraReducers: (builder) => {
        builder
            // --- Dashboard Data ---
            .addCase(fetchCateringDashboardData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCateringDashboardData.fulfilled, (state, action) => {
                state.loading = false;
                state.unpaidOrders = action.payload.unpaid;
                state.priceMap = action.payload.prices;
                state.lastUpdated = Date.now();

                // Calcul minUnpaidDate
                if (action.payload.unpaid.length > 0) {
                    const sorted = [...action.payload.unpaid].sort((a, b) => dayjs(a.orderDate).diff(dayjs(b.orderDate)));
                    state.minUnpaidDate = sorted[0].orderDate;
                } else {
                    state.minUnpaidDate = dayjs().startOf('month').format('YYYY-MM-DD');
                }
            })
            .addCase(fetchCateringDashboardData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // --- Fetch History Range ---
            .addCase(fetchHistoryRange.pending, (state) => {
                state.historyLoading = true;
            })
            .addCase(fetchHistoryRange.fulfilled, (state, action) => {
                state.historyLoading = false;
                state.historyOrders = action.payload; // Înlocuim istoricul cu cel filtrat
            })
            .addCase(fetchHistoryRange.rejected, (state, action) => {
                state.historyLoading = false;
                state.error = action.payload;
            });
    }
});

export const { clearError } = cateringSlice.actions;
export default cateringSlice.reducer;

// --- SELECTORI ---

const selectUnpaidOrders = (state) => state.catering.unpaidOrders;
const selectHistoryOrders = (state) => state.catering.historyOrders;
const selectPriceMap = (state) => state.catering.priceMap;

// 1. Selector Neplătite (deja existent)
export const selectGroupedUnpaidOrders = createSelector(
    [selectUnpaidOrders, selectPriceMap],
    (orders, prices) => {
        // ... (Logica existentă pentru Unpaid - nu o modificăm)
        // (Pentru economie de spațiu nu o copiez aici, ea rămâne identică cu ce ai deja)
        const dayGroups = {};
        let grandTotal = 0;
        orders.forEach(order => {
            const dateKey = dayjs(order.orderDate).format('YYYY-MM-DD');
            if (!dayGroups[dateKey]) dayGroups[dateKey] = { date: dateKey, totalDay: 0, subGroups: {} };
            
            const resIdPart = order.reservationId ? `res-${order.reservationId}` : `no-res`;
            if (!dayGroups[dateKey].subGroups[resIdPart]) {
                dayGroups[dateKey].subGroups[resIdPart] = {
                    id: `${dateKey}_${resIdPart}`,
                    reservationName: order.reservationId ? `Rezervare: ${order.reservationName}` : "Comenzi Bar / Fără Rezervare",
                    isReservation: !!order.reservationId,
                    totalSubGroup: 0, items: []
                };
            }
            const price = prices[order.productId] || 0;
            const lineTotal = price * order.quantity;
            grandTotal += lineTotal;
            dayGroups[dateKey].totalDay += lineTotal;
            dayGroups[dateKey].subGroups[resIdPart].totalSubGroup += lineTotal;
            
            const curSub = dayGroups[dateKey].subGroups[resIdPart];
            const exItem = curSub.items.find(i => i.productId === order.productId);
            if(exItem) { exItem.quantity += order.quantity; exItem.lineTotal += lineTotal; }
            else { curSub.items.push({ ...order, unitPrice: price, lineTotal }); }
        });
        const sorted = Object.values(dayGroups).sort((a,b) => dayjs(a.date).diff(dayjs(b.date))).map(dg => {
            const subs = Object.values(dg.subGroups).sort((a,b) => (a.isReservation === b.isReservation ? 0 : a.isReservation ? -1 : 1));
            return { ...dg, subGroups: subs };
        });
        return { groups: sorted, grandTotal };
    }
);

// 2. Selector ISTORIC (NOU - Logică Zi Plată -> [Dată Comandă + Client])
export const selectGroupedHistoryOrders = createSelector(
    [selectHistoryOrders, selectPriceMap],
    (orders, prices) => {
        const dayGroups = {};
        let grandTotal = 0;

        orders.forEach(order => {
            // NIVEL 1: Data Plății
            const payDateRaw = order.paidAt || order.orderDate;
            const payDayKey = dayjs(payDateRaw).format('YYYY-MM-DD');

            if (!dayGroups[payDayKey]) {
                dayGroups[payDayKey] = { date: payDayKey, totalDay: 0, subGroups: {} };
            }

            // NIVEL 2: Data Comenzii + Client
            const orderDateStr = dayjs(order.orderDate).format('YYYY-MM-DD');
            const resIdPart = order.reservationId ? `res-${order.reservationId}` : `no-res`;
            const subGroupKey = `${orderDateStr}_${resIdPart}`;

            if (!dayGroups[payDayKey].subGroups[subGroupKey]) {
                dayGroups[payDayKey].subGroups[subGroupKey] = {
                    id: subGroupKey,
                    orderDate: orderDateStr,
                    reservationName: order.reservationId ? `Rezervare: ${order.reservationName}` : "Comenzi Bar / Fără Rezervare",
                    isReservation: !!order.reservationId,
                    totalSubGroup: 0, items: []
                };
            }

            // Calcule
            const price = prices[order.productId] || 0;
            const lineTotal = price * order.quantity;
            grandTotal += lineTotal;

            dayGroups[payDayKey].totalDay += lineTotal;
            dayGroups[payDayKey].subGroups[subGroupKey].totalSubGroup += lineTotal;

            // NIVEL 3: Item
            const currentSubGroup = dayGroups[payDayKey].subGroups[subGroupKey];
            const existingItem = currentSubGroup.items.find(i => i.productId === order.productId);

            if (existingItem) {
                existingItem.quantity += order.quantity;
                existingItem.lineTotal += lineTotal;
            } else {
                currentSubGroup.items.push({ ...order, unitPrice: price, lineTotal });
            }
        });

        // SORTARE
        const sortedGroups = Object.values(dayGroups).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
            .map(dayGroup => {
                const sortedSubGroups = Object.values(dayGroup.subGroups).sort((a, b) => {
                    const dateDiff = dayjs(a.orderDate).diff(dayjs(b.orderDate));
                    if (dateDiff !== 0) return dateDiff;
                    if (a.isReservation && !b.isReservation) return -1;
                    if (!a.isReservation && b.isReservation) return 1;
                    return 0;
                });
                return { ...dayGroup, subGroups: sortedSubGroups };
            });

        return { groups: sortedGroups, grandTotal };
    }
);