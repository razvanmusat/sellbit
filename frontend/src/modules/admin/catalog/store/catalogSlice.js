import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CategoryService } from '../api/CategoryService';
import { ProductService } from '../api/ProductService'; 
import { LookupService } from '../api/LookupService';
import { CategoryBrowserService } from '../../../../shared/api/CategoryBrowserService';

// Importăm acțiunea care reîncarcă tot cache-ul aplicației
import { fetchGlobalCatalog } from '../../../../shared/store/globalCatalogSlice';

// --- 1. INITIALIZARE ---
export const initCatalog = createAsyncThunk(
    'catalog/init',
    async (_, { rejectWithValue }) => {
        try {
            const [types, units, vatRates] = await Promise.all([
                LookupService.getAllProductTypes(),
                LookupService.getAllUnits(),
                LookupService.getAllVatRates()
            ]);
            return { types, units, vatRates };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// --- 2. FETCH CONTENT (Navigare Folder cu Folder) ---
export const fetchCatalogContent = createAsyncThunk(
    'catalog/fetchContent',
    async (categoryId, { rejectWithValue }) => {
        try {
            const subcatsPromise = CategoryService.getAdminTree(categoryId);
            let prodsPromise = Promise.resolve([]); 
            let detailsPromise = Promise.resolve(null);

            if (categoryId) {
                prodsPromise = ProductService.getProductsForAdmin(categoryId);
                detailsPromise = CategoryBrowserService.getCategoryDetails(categoryId);
            }

            const [subcats, prods, details] = await Promise.all([subcatsPromise, prodsPromise, detailsPromise]);

            return {
                categoryId,
                subcategories: Array.isArray(subcats) ? subcats : [],
                products: Array.isArray(prods) ? prods : [],
                currentCategoryDetails: details 
            };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// --- 3. CREATE & UPDATE OPERATIONS (Cu Auto-Refresh) ---

// A. CREARE CATEGORIE
export const createCategory = createAsyncThunk(
    'catalog/createCategory',
    async ({ data, currentParentId }, { dispatch, rejectWithValue }) => {
        try {
            await CategoryService.createCategory(data);
            
            // 1. Reîmprospătăm folderul curent din Admin (ca să vedem folderul nou)
            dispatch(fetchCatalogContent(currentParentId));
            
            // 2. Reîmprospătăm cache-ul global (pentru POS/Search)
            dispatch(fetchGlobalCatalog());
            
            return true;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// B. ACTUALIZARE CATEGORIE
export const updateCategory = createAsyncThunk(
    'catalog/updateCategory',
    async ({ id, data, currentParentId }, { dispatch, rejectWithValue }) => {
        try {
            await CategoryService.updateCategory(id, data);
            dispatch(fetchCatalogContent(currentParentId));
            dispatch(fetchGlobalCatalog());
            return true;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// C. CREARE PRODUS
export const createProduct = createAsyncThunk(
    'catalog/createProduct',
    async ({ data, currentCategoryId }, { dispatch, rejectWithValue }) => {
        try {
            await ProductService.create(data);
            
            // 1. Refresh local (Admin View)
            if (currentCategoryId) {
                dispatch(fetchCatalogContent(currentCategoryId));
            }
            
            // 2. Refresh global (Cache)
            dispatch(fetchGlobalCatalog());
            
            return true;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// D. ACTUALIZARE PRODUS
export const updateProduct = createAsyncThunk(
    'catalog/updateProduct',
    async ({ id, data, currentCategoryId }, { dispatch, rejectWithValue }) => {
        try {
            await ProductService.update(id, data);
            
            if (currentCategoryId) {
                dispatch(fetchCatalogContent(currentCategoryId));
            }
            dispatch(fetchGlobalCatalog());
            
            return true;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// --- 4. STATUS TOGGLES (Deja existente + Refresh Global) ---

export const toggleMenuStatus = createAsyncThunk(
    'catalog/toggleMenuStatus',
    async ({ id, isActive }, { dispatch, rejectWithValue }) => {
        try {
            await ProductService.toggleStatus(id, isActive);
            dispatch(fetchCompositeMenus());
            dispatch(fetchGlobalCatalog()); // Actualizare globală
            return { id, isActive };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const toggleCategoryStatus = createAsyncThunk(
    'catalog/toggleCategoryStatus',
    async ({ id, isActive }, { dispatch, rejectWithValue }) => {
        try {
            await CategoryService.toggleStatus(id, isActive);
            dispatch(fetchGlobalCatalog()); // Actualizare globală
            return { id, isActive };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const toggleProductStatus = createAsyncThunk(
    'catalog/toggleProductStatus',
    async ({ id, isActive }, { dispatch, rejectWithValue }) => {
        try {
            await ProductService.toggleStatus(id, isActive);
            dispatch(fetchGlobalCatalog()); // Actualizare globală
            return { id, isActive };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// --- 5. COMPOSITE MENUS ---
export const fetchCompositeMenus = createAsyncThunk(
    'catalog/fetchCompositeMenus',
    async (_, { rejectWithValue }) => {
        try {
            const menus = await ProductService.getMenusForAdmin();
            return {
                active: menus.filter(m => m.isActive === true),
                inactive: menus.filter(m => m.isActive === false)
            };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    },
    {
        condition: (_, { getState }) => {
            const catalogState = getState()?.catalog;
            if (!catalogState) return true;

            if (catalogState.compositeLoading) {
                return false;
            }

            const lastFetchedAt = catalogState.compositeLastFetchedAt;
            if (!lastFetchedAt) return true;

            return Date.now() - lastFetchedAt > 300;
        }
    }
);

const initialState = {
    subcategories: [],
    products: [],
    currentCategoryDetails: null, 
    compositeMenus: { active: [], inactive: [] },
    compositeLoading: false,
    compositeLastFetchedAt: null,
    lookups: {}, 
    loading: false,
    error: null
};

const catalogSlice = createSlice({
    name: 'catalog',
    initialState,
    reducers: {
        clearCatalogData: (state) => {
            state.subcategories = [];
            state.products = [];
            state.currentCategoryDetails = null;
        },
        setOptimisticCategory: (state, action) => {
            state.currentCategoryDetails = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            // Init
            .addCase(initCatalog.fulfilled, (state, action) => { state.lookups = action.payload; })
            
            // Fetch Content
            .addCase(fetchCatalogContent.pending, (state) => { 
                state.loading = true; 
                state.error = null;
            })
            .addCase(fetchCatalogContent.fulfilled, (state, action) => {
                state.loading = false;
                state.subcategories = action.payload.subcategories;
                state.products = action.payload.products;
                state.currentCategoryDetails = action.payload.currentCategoryDetails;
            })
            .addCase(fetchCatalogContent.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            
            // Toggles (Optimistic updates local, dar refresh-ul global e async)
            .addCase(toggleCategoryStatus.fulfilled, (state, action) => {
                const cat = state.subcategories.find(c => c.id === action.payload.id);
                if (cat) cat.isActive = action.payload.isActive;
            })
            .addCase(toggleProductStatus.fulfilled, (state, action) => {
                const prod = state.products.find(p => p.id === action.payload.id);
                if (prod) prod.isActive = action.payload.isActive;
            })

            // Composite Menus
            .addCase(fetchCompositeMenus.pending, (state) => { state.compositeLoading = true; })
            .addCase(fetchCompositeMenus.fulfilled, (state, action) => {
                state.compositeLoading = false;
                state.compositeMenus.active = action.payload.active;
                state.compositeMenus.inactive = action.payload.inactive;
                state.compositeLastFetchedAt = Date.now();
            })
            .addCase(fetchCompositeMenus.rejected, (state) => { state.compositeLoading = false; });
    }
});

export const { clearCatalogData, setOptimisticCategory } = catalogSlice.actions;

export const selectSubcategories = (state) => state.catalog.subcategories;
export const selectProducts = (state) => state.catalog.products;
export const selectCurrentCategoryDetails = (state) => state.catalog.currentCategoryDetails;
export const selectCatalogLoading = (state) => state.catalog.loading;
export const selectActiveMenus = (state) => state.catalog.compositeMenus.active;
export const selectInactiveMenus = (state) => state.catalog.compositeMenus.inactive;
export const selectCompositeLoading = (state) => state.catalog.compositeLoading;
export const selectLookups = (state) => state.catalog.lookups; // Selector util pt formulare

export default catalogSlice.reducer;