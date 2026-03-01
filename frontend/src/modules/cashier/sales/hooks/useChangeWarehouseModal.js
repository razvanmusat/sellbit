import { useState } from 'react';
import { SalesService } from '../api/SalesService';

export const useChangeWarehouseModal = ({ warehouseId, warehouses, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [error, setError] = useState(null);

  // Funcție pentru a aduce bonurile închise din gestiunea curentă
  const fetchClosedReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Statusul pentru bon închis este 'CLOSED'
      // Poți ajusta intervalul după nevoie, aici se aduc toate
      const now = new Date();
      const start = new Date(now.getFullYear() - 1, 0, 1).toISOString(); // 1 an în urmă
      const end = now.toISOString();
      const data = await SalesService.getReceiptsReport(warehouseId, 'CLOSED', start, end);
      setReceipts(data);
    } catch (e) {
      setError(e.message || 'Eroare la încărcarea bonurilor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setSelectedReceiptId(null);
    setSelectedWarehouseId(null);
    setError(null);
    fetchClosedReceipts();
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
  };

  const handleConfirm = async (receiptId, newWarehouseId) => {
    setLoading(true);
    setError(null);
    try {
      await SalesService.changeReceiptWarehouse(receiptId, newWarehouseId);
      setOpen(false);
      setSelectedReceiptId(null);
      setSelectedWarehouseId(null);
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e.message || 'Eroare la schimbarea gestiunii');
    } finally {
      setLoading(false);
    }
  };

  return {
    open,
    loading,
    error,
    receipts,
    selectedReceiptId,
    setSelectedReceiptId,
    selectedWarehouseId,
    setSelectedWarehouseId,
    handleOpen,
    handleClose,
    handleConfirm
  };
};
