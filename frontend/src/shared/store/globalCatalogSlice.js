import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { CategoryBrowserService } from '../api/CategoryBrowserService';
import { ProductService } from '../../modules/admin/catalog/api/ProductService'; 

export const fetchGlobalCatalog = createAsyncThunk(
    'globalCatalog/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            // Executăm request-urile în paralel pentru viteză maximă
            const [categoriesData, productsData] = await Promise.all([
                // 1. Luăm toate categoriile (listă plată)
                CategoryBrowserService.getAllCategories(),
                
                // 2. Luăm toate produsele active (search cu query gol returnează tot)
                ProductService.searchForPos('') 
            ]);

            return {
                categories: Array.isArray(categoriesData) ? categoriesData : [],
                products: Array.isArray(productsData) ? productsData : []
            };
        } catch (error) {
            console.error("Global Catalog Fetch Error:", error);
            return rejectWithValue(error.message || 'Eroare la încărcarea catalogului global.');
        }
    }
);

const initialState = {
    categories: [],     // Listă plată
    products: [],       // Listă plată
    status: 'idle',     // 'idle' | 'loading' | 'succeeded' | 'failed'
    lastUpdated: null,
    error: null
};

const globalCatalogSlice = createSlice({
    name: 'globalCatalog',
    initialState,
    reducers: {
        invalidateCatalog: (state) => {
            state.status = 'idle';
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchGlobalCatalog.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchGlobalCatalog.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.categories = action.payload.categories;
                state.products = action.payload.products;
                state.lastUpdated = Date.now();
            })
            .addCase(fetchGlobalCatalog.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            });
    }
});

export const { invalidateCatalog } = globalCatalogSlice.actions;

// --- SELECTORI ---
export const selectGlobalStatus = (state) => state.globalCatalog.status;
export const selectGlobalError = (state) => state.globalCatalog.error;
export const selectAllGlobalCategories = (state) => state.globalCatalog.categories;
export const selectAllGlobalProducts = (state) => state.globalCatalog.products;

export default globalCatalogSlice.reducer;