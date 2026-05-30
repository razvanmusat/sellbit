import { useState, useEffect, useMemo } from 'react';
import { StockCurrentService } from '../api/StockCurrentService';

export const useInventoryPrintList = (warehouseId) => {
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filterQuery, setFilterQuery] = useState('');

    useEffect(() => {
        if (!warehouseId) return;

        let isMounted = true;
        setLoading(true);
        StockCurrentService.getStockByWarehouseForPrint(warehouseId)
            .then(data => {
                if (isMounted) setStockData(data || []);
            })
            .catch(err => {
                if (isMounted) setError("Eroare la încărcarea listei de inventar.");
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [warehouseId]);

    // LOGICA NOUĂ: Filtrare după CATEGORIE, nu după produs
    const groupedStock = useMemo(() => {
        const groups = {};
        
        // 1. Filtrăm lista brută doar dacă subcategoria conține textul căutat
        const filtered = stockData.filter(item => {
            const catName = item.subcategoryName || 'FĂRĂ CATEGORIE';
            return catName.toLowerCase().includes(filterQuery.toLowerCase());
        });

        // 2. Grupăm rezultatele (dacă cauți "Băuturi", va rămâne doar grupul Băuturi)
        filtered.forEach(item => {
            const sub = item.subcategoryName || 'FĂRĂ CATEGORIE';
            if (!groups[sub]) groups[sub] = [];
            groups[sub].push(item);
        });
        return groups;
    }, [stockData, filterQuery]);

    const handlePrint = () => {
        window.print();
    };

    return {
        loading,
        error,
        filterQuery, 
        setFilterQuery,
        groupedStock,
        handlePrint
    };
};