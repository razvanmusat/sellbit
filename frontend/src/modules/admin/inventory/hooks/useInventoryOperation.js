import { useState, useEffect, useMemo } from 'react';
import { StockCurrentService } from '../api/StockCurrentService';

export const useInventoryOperation = (warehouseId) => {
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // UI State pentru înlocuirea alertelor
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [confirmDialog, setConfirmDialog] = useState({ open: false, items: [] });

    // Mapare: productId -> string value (ce a tastat userul)
    const [physicalStockMap, setPhysicalStockMap] = useState({});
    const [filterQuery, setFilterQuery] = useState('');

    const fetchStock = async () => {
        if (!warehouseId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await StockCurrentService.getStockByWarehouse(warehouseId);
            setStockData(data || []);
            setPhysicalStockMap({}); // Resetăm editările după încărcare
        } catch (err) {
            setError("Eroare la încărcarea stocului.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, [warehouseId]);

    const groupedStock = useMemo(() => {
        const groups = {};
        const filtered = stockData.filter(item => 
            item.productName.toLowerCase().includes(filterQuery.toLowerCase())
        );
        filtered.forEach(item => {
            const sub = item.subcategoryName || 'FĂRĂ CATEGORIE';
            if (!groups[sub]) groups[sub] = [];
            groups[sub].push(item);
        });
        return groups;
    }, [stockData, filterQuery]);

    // Pasul 1: Validare și deschidere Dialog de confirmare
    const requestSave = () => {
        const itemsToUpdate = [];
        
        Object.keys(physicalStockMap).forEach(productId => {
            const newQty = physicalStockMap[productId];
            // Validăm input-ul
            if (newQty !== '' && !isNaN(newQty)) {
                itemsToUpdate.push({
                    productId: Number(productId),
                    newQuantity: Number(newQty)
                });
            }
        });

        if (itemsToUpdate.length === 0) {
            setSnackbar({ open: true, message: "Nu ai introdus nicio valoare faptică.", severity: 'warning' });
            return;
        }

        // Deschidem dialogul cu itemele pregătite
        setConfirmDialog({ open: true, items: itemsToUpdate });
    };

    // Pasul 2: Executarea salvării după confirmarea din Dialog
    const confirmSave = async () => {
        setConfirmDialog(prev => ({ ...prev, open: false })); // Închidem dialogul
        
        try {
            await StockCurrentService.setPhysicalStock({
                warehouseId: warehouseId,
                reason: "Inventar " + dayjs().format('DD/MM/YYYY'),
                items: confirmDialog.items
            });
            
            setSnackbar({ open: true, message: "Inventar salvat cu succes!", severity: 'success' });
            fetchStock(); // Reîncărcăm datele
        } catch (err) {
            setSnackbar({ open: true, message: "Eroare la salvare: " + (err.message || "Necunoscută"), severity: 'error' });
        }
    };

    // Helper pentru închiderea snackbar-ului
    const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));
    const closeConfirmDialog = () => setConfirmDialog(prev => ({ ...prev, open: false }));

    return {
        loading,
        error,
        filterQuery, 
        setFilterQuery,
        groupedStock,
        physicalStockMap, 
        setPhysicalStockMap,
        requestSave,     
        confirmSave,      
        snackbar,         
        closeSnackbar,    
        confirmDialog,    
        closeConfirmDialog 
    };
};