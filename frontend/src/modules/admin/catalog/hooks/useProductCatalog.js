import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

// --- IMPORT NOU ---
import { fetchGlobalCatalog } from '../../../../shared/store/globalCatalogSlice';

import { 
    fetchCatalogContent, 
    fetchCompositeMenus,
    toggleCategoryStatus,
    toggleProductStatus,
    setOptimisticCategory,
    selectSubcategories, 
    selectProducts, 
    selectCurrentCategoryDetails,
    selectCatalogLoading 
} from '../store/catalogSlice';

export const useProductCatalog = () => {
    const dispatch = useDispatch();
    
    const [searchParams, setSearchParams] = useSearchParams();
    const paramId = searchParams.get('categoryId');
    const currentCategoryId = paramId ? Number(paramId) : null;

    useEffect(() => {
        dispatch(fetchCatalogContent(currentCategoryId));
    }, [dispatch, currentCategoryId]);

    const rawSubcats = useSelector(selectSubcategories);
    const rawProds = useSelector(selectProducts);
    const currentCategoryDetails = useSelector(selectCurrentCategoryDetails);
    const loading = useSelector(selectCatalogLoading);
    
    const hasAnyProducts = rawProds && rawProds.length > 0;
    const hasAnySubcategories = rawSubcats && rawSubcats.length > 0;

    const [tabIndex, setTabIndex] = useState(0);

    const viewData = useMemo(() => {
        const activeCats = rawSubcats.filter(c => (c.isActive !== undefined ? c.isActive : c.active) === true);
        const inactiveCats = rawSubcats.filter(c => (c.isActive !== undefined ? c.isActive : c.active) === false);
        const activeProds = rawProds.filter(p => p.isActive === true);
        const inactiveProds = rawProds.filter(p => p.isActive === false);

        return {
            categories: tabIndex === 0 ? activeCats : inactiveCats,
            products:   tabIndex === 0 ? activeProds : inactiveProds,
            cntActive: activeCats.length + activeProds.length,
            cntInactive: inactiveCats.length + inactiveProds.length
        };
    }, [rawSubcats, rawProds, tabIndex]);

    const [catModalOpen, setCatModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [currentParentId, setCurrentParentId] = useState(null);
    const [prodModalOpen, setProdModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [viewingCategoryId, setViewingCategoryId] = useState(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const blurAndOpen = useCallback((fn) => (e) => { 
        if(e) e.currentTarget.blur(); 
        fn(); 
    }, []);

    const openCreateCategory = useCallback((parentId) => {
        setCategoryToEdit(null);
        setCurrentParentId(parentId || currentCategoryId); 
        setCatModalOpen(true);
    }, [currentCategoryId]);

    const openEditCategory = useCallback((cat) => { setCategoryToEdit(cat); setCatModalOpen(true); }, []);
    const openCreateProduct = useCallback((cid) => { setProductToEdit(null); setViewingCategoryId(cid); setProdModalOpen(true); }, []);
    const openEditProduct = useCallback((prod) => { setProductToEdit(prod); setProdModalOpen(true); }, []);

    const handleToggleItem = useCallback(async (item, type = 'CATEGORY') => {
        try {
            const currentStatus = (item.isActive !== undefined) ? item.isActive : item.active;
            const newStatus = !currentStatus;
            const isProduct = type === 'PRODUCT' || item.productTypeCode || item.barcode;

            if (isProduct) {
                await dispatch(toggleProductStatus({ id: item.id, isActive: newStatus })).unwrap();
            } else {
                await dispatch(toggleCategoryStatus({ id: item.id, isActive: newStatus })).unwrap();
            }
            setSnackbar({ open: true, message: `${isProduct ? 'Produsul' : 'Categoria'} a fost ${newStatus ? 'activat(ă)' : 'dezactivat(ă)'}!`, severity: 'success' });
            
            dispatch(fetchCatalogContent(currentCategoryId));
            dispatch(fetchCompositeMenus());
        } catch (error) {
            setSnackbar({ open: true, message: `Eroare: ${error}`, severity: 'error' });
        }
    }, [dispatch, currentCategoryId]);

    const handleSuccess = useCallback((msg) => {
        setRefreshCounter(prev => prev + 1);
        setSnackbar({ open: true, message: msg || 'Succes!', severity: 'success' });
        
        // 1. Refresh Admin UI
        dispatch(fetchCatalogContent(currentCategoryId));
        dispatch(fetchCompositeMenus());

        // 2. --- REFRESH GLOBAL UI (POS/Stocks) ---
        dispatch(fetchGlobalCatalog());

    }, [dispatch, currentCategoryId]);

    const handleCloseSnackbar = useCallback(() => setSnackbar(prev => ({ ...prev, open: false })), []);

    const handleCategorySelect = useCallback((id) => {
        if (id) {
            const clickedCategory = rawSubcats.find(c => c.id === id);
            if (clickedCategory) {
                dispatch(setOptimisticCategory(clickedCategory));
            }
        } else {
             dispatch(setOptimisticCategory(null));
        }

        const newParams = new URLSearchParams(searchParams);
        if (id) newParams.set('categoryId', id);
        else newParams.delete('categoryId');
        setSearchParams(newParams);
    }, [dispatch, rawSubcats, searchParams, setSearchParams]);

    return useMemo(() => ({
        state: {
            catModalOpen, categoryToEdit, currentParentId,
            prodModalOpen, productToEdit, viewingCategoryId,
            refreshCounter, snackbar,
            tabIndex, currentCategoryId, loading,
            filteredCategories: viewData.categories,
            filteredProducts: viewData.products,
            countActive: viewData.cntActive,
            countInactive: viewData.cntInactive,
            hasAnyProducts,
            hasAnySubcategories,
            currentCategoryDetails
        },
        actions: {
            setCatModalOpen, setProdModalOpen, setTabIndex,
            openCreateCategory, openEditCategory,
            openCreateProduct, openEditProduct,
            handleSuccess, handleCloseSnackbar, blurAndOpen,
            handleCategorySelect,
            handleToggleItem
        }
    }), [
        catModalOpen, categoryToEdit, currentParentId,
        prodModalOpen, productToEdit, viewingCategoryId,
        refreshCounter, snackbar,
        tabIndex, currentCategoryId, loading,
        viewData, hasAnyProducts, hasAnySubcategories, currentCategoryDetails,
        blurAndOpen, openCreateCategory, openEditCategory,
        openCreateProduct, openEditProduct,
        handleSuccess, handleCloseSnackbar,
        handleCategorySelect, handleToggleItem
    ]);
};