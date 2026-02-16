import { useState, useEffect, useCallback } from 'react';
import { client } from '../api/client';
import { StockCurrentService } from '../../modules/cashier/sales/api/StockCurrentService';

export const useProductGridItem = (product, mode, warehouseId, isMenuCategory, onClick) => {
    const isAdmin = mode === 'ADMIN';

    // --- STATE ---
    const [quantity, setQuantity] = useState(1);
    const [liveStock, setLiveStock] = useState(null);
    const [loadingStock, setLoadingStock] = useState(false);

    // State pentru Meniu (Lazy Loading)
    const [menuComponents, setMenuComponents] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailsLoaded, setDetailsLoaded] = useState(false);

    // --- 1. FETCH STOC ---
    useEffect(() => {
        let isMounted = true;
        if (!isAdmin && product.trackStock && warehouseId) {
            setLoadingStock(true);
            StockCurrentService.getProductStockLive(warehouseId, product.id)
                .then(qty => { if (isMounted) setLiveStock(qty); })
                .catch(() => { if (isMounted) setLiveStock(null); })
                .finally(() => { if (isMounted) setLoadingStock(false); });
        }
        return () => { isMounted = false; };
    }, [product.id, product.trackStock, warehouseId, isAdmin]);

    const isOutOfStock = !isAdmin && product.trackStock && liveStock !== null && liveStock <= 0;

    // --- 2. FETCH DETALII MENIU (LA HOVER) ---
    const handleTooltipOpen = useCallback(async () => {
        if (detailsLoaded || !isMenuCategory) return;

        setLoadingDetails(true);
        try {
            // APELUL EXACT IDENTIFICAT ANTERIOR
            const response = await client(`catalog/product-components/parent/${product.id}/active`);
            setMenuComponents(response || []);
            setDetailsLoaded(true);
        } catch (error) {
            console.error("Eroare încărcare rețetă:", error);
        } finally {
            setLoadingDetails(false);
        }
    }, [detailsLoaded, isMenuCategory, product.id]);

    // --- HANDLERS ---
    const handleIncrement = (e) => {
        e?.stopPropagation();
        if (product.trackStock && liveStock !== null && quantity >= liveStock) return;
        setQuantity(prev => prev + 1);
    };

    const handleDecrement = (e) => {
        e?.stopPropagation();
        if (quantity > 1) setQuantity(prev => prev - 1);
    };

    const handleAddClick = (e) => {
        e?.stopPropagation();
        if (!isOutOfStock) {
            onClick(product, quantity);
            // Optimizare optimistică stoc local
            if (product.trackStock && liveStock !== null) {
                setLiveStock(prev => prev - quantity);
            }
            setQuantity(1);
        }
    };

    const handleEditClick = (e) => {
        e?.stopPropagation();
        onClick(product);
    };

    return {
        // Data
        isAdmin,
        quantity,
        liveStock,
        loadingStock,
        isOutOfStock,
        menuComponents,
        loadingDetails,
        
        // Handlers
        handleTooltipOpen,
        handleIncrement,
        handleDecrement,
        handleAddClick,
        handleEditClick
    };
};