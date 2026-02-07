import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { StockAdjustmentService } from '../api/StockAdjustmentService';
import { SearchProductService } from '../../sales/api/SearchProductService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useStockAdjustmentPage = (warehouseId) => {
  // --- REDUX ---
  const { user } = useSelector((state) => state.auth);
  const { warehouses } = useSelector((state) => state.cashier);

  // --- STATE ---
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [reasons, setReasons] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToDeduct, setQuantityToDeduct] = useState(1);
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // --- DERIVED STATE ---
  const currentWarehouseName = warehouses?.find(w => w.id === Number(warehouseId))?.name || "Gestiune";

  // --- EFFECTS ---
  useEffect(() => {
    const loadReasons = async () => {
      try {
        const data = await StockAdjustmentService.getActiveReasons();
        setReasons(data);
      } catch (err) {
        setNotification({ open: true, message: getFriendlyErrorMessage(err), severity: 'error' });
      }
    };
    loadReasons();
  }, []);

  // --- HANDLERS ---
  const handleProductSelect = async (productId) => {
    try {
      const results = await SearchProductService.searchProductsByName(""); 
      const fullProduct = results.find(p => p.id === productId);
      setSelectedProduct(fullProduct || { id: productId, name: `Produs #${productId}` });
    } catch (err) {
      setSelectedProduct({ id: productId, name: `Produs #${productId}` });
    }
  };

  const handleSave = async () => {
    if (!reasonId) {
      setNotification({ open: true, message: "Selectează motivul scăderii!", severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await StockAdjustmentService.createAdjustment({
        warehouseId, 
        productId: selectedProduct.id, 
        userId: user.id,
        reasonId, 
        quantityChange: quantityToDeduct * -1, // Logica de business: transformăm în negativ
        note
      });
      
      setNotification({ open: true, message: "Ajustare salvată cu succes.", severity: 'success' });
      
      // Reset Form
      setSelectedProduct(null); 
      setNote(''); 
      setQuantityToDeduct(1); 
      setReasonId('');
      
    } catch (err) {
      setNotification({ open: true, message: getFriendlyErrorMessage(err), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
  };

  // Returnăm tot ce are nevoie UI-ul
  return {
    // Data
    currentWarehouseName,
    reasons,
    selectedProduct,
    quantityToDeduct,
    reasonId,
    note,
    loading,
    notification,
    
    // Setters (pentru input-uri simple)
    setQuantityToDeduct,
    setReasonId,
    setNote,
    
    // Actions
    handleProductSelect,
    handleSave,
    handleCloseNotification,
    handleClearProduct
  };
};