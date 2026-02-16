import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchGlobalCatalog, 
    selectGlobalStatus, 
    selectAllGlobalCategories, 
    selectAllGlobalProducts 
} from '../store/globalCatalogSlice';

export const useGlobalCatalog = (selectedCategoryId) => {
    const dispatch = useDispatch();
    
    const status = useSelector(selectGlobalStatus);
    const allCategories = useSelector(selectAllGlobalCategories);
    const allProducts = useSelector(selectAllGlobalProducts);

    // 1. Inițializare: Dacă nu avem date, le cerem.
    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchGlobalCatalog());
        }
    }, [status, dispatch]);

    // 2. Filtrare Instantanee
    const viewData = useMemo(() => {
        // A. Găsim categoria curentă
        const currentCategory = selectedCategoryId 
            ? allCategories.find(c => c.id === selectedCategoryId) 
            : null;

        // B. Găsim subcategoriile (unde parentId === selectedCategoryId)
        const subcategories = allCategories.filter(c => {
            // Verificare extra pentru isActive
            const isActive = c.isActive !== undefined ? c.isActive : c.active !== false;
            if (!isActive) return false;

            if (selectedCategoryId) {
                return c.parentId === selectedCategoryId;
            } else {
                return !c.parentId; // Root (parentId null sau 0)
            }
        });

        // C. Găsim produsele (unde categoryId === selectedCategoryId)
        const products = selectedCategoryId 
            ? allProducts.filter(p => {
                const isActive = p.isActive !== false; 
                return isActive && p.categoryId === selectedCategoryId;
            })
            : []; 

        return {
            currentCategory,
            subcategories,
            products
        };
    }, [allCategories, allProducts, selectedCategoryId]);

    return {
        loading: status === 'loading',
        error: useSelector(state => state.globalCatalog.error),
        subcategories: viewData.subcategories,
        products: viewData.products,
        currentCategory: viewData.currentCategory
    };
};