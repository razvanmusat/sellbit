import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux'; 

import { CategoryBrowserService } from '../api/CategoryBrowserService';
import { SearchProductService } from '../../modules/cashier/sales/api/SearchProductService'; 

// Adăugăm parametrul 'isControlled' (default false)
export const useCategoryBrowser = (mode = 'SALES', refreshTrigger = 0, isControlled = false) => {
    const { user } = useSelector((state) => state.auth);
    const isAdminMode = mode === 'ADMIN' && user?.authorityLevel === 100;

    const [searchParams, setSearchParams] = useSearchParams();
    const paramId = searchParams.get('categoryId');
    const currentCategoryId = paramId ? Number(paramId) : null;

    const [currentCategory, setCurrentCategory] = useState(null);
    const [subcategories, setSubcategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        // --- FIX CRITIC: STOP FETCH DACĂ E CONTROLAT DIN EXTERIOR ---
        if (isControlled) {
            return; 
        }
        // -----------------------------------------------------------

        setLoading(true);
        setError(null);
        
        try {
            // 1. Detalii Categorie Curentă
            if (currentCategoryId) {
                try {
                    const details = await CategoryBrowserService.getCategoryDetails(currentCategoryId);
                    
                    // --- VALIDARE DE SECURITATE (Doar dacă NU e Admin) ---
                    if (!isAdminMode) {
                        const isInactive = (details.isActive === false) || (details.active === false);
                        if (isInactive) throw new Error("Această categorie este dezactivată.");
                    }
                    setCurrentCategory(details);
                } catch (e) {
                    console.warn("Acces interzis sau categorie inexistentă", e);
                    setError(e.message || "Categoria nu poate fi accesată.");
                    setCurrentCategory(null);
                    setSubcategories([]);
                    setProducts([]);
                    setLoading(false);
                    return; 
                }
            } else {
                setCurrentCategory(null);
            }

            // 2. Fetch Subcategorii
            let fetchedCats = [];
            if (isAdminMode) {
                fetchedCats = await CategoryBrowserService.getAdminCategories(currentCategoryId);
            } else {
                fetchedCats = await CategoryBrowserService.getActiveCategories(currentCategoryId);
            }

            // 3. Fetch Produse
            let fetchedProds = [];
            if (currentCategoryId) {
                fetchedProds = await SearchProductService.getProductsByCategory(currentCategoryId, isAdminMode);
            }

            setSubcategories(fetchedCats || []);
            setProducts(fetchedProds || []);

        } catch (err) {
            console.error("Browser Error:", err);
            const msg = err.response?.data?.message || err.message || 'Eroare la încărcare catalog.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [currentCategoryId, isAdminMode, refreshTrigger, isControlled]); // Dependență nouă: isControlled

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const navigateToCategory = (category) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('categoryId', category.id);
        setSearchParams(newParams);
    };

    const navigateBack = () => {
        const newParams = new URLSearchParams(searchParams);
        if (currentCategory && currentCategory.parentId) {
            newParams.set('categoryId', currentCategory.parentId);
        } else {
            newParams.delete('categoryId');
        }
        setSearchParams(newParams);
    };

    return {
        currentCategoryId,
        currentCategoryLabel: currentCategory ? currentCategory.label : (isAdminMode ? 'Catalog Admin' : 'Meniu'),
        currentCategory,
        subcategories,
        products,
        loading,
        error,
        navigateToCategory,
        navigateBack,
        isRoot: !currentCategoryId,
        isAdmin: isAdminMode
    };
};