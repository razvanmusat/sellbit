import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { SalesService } from '../../sales/api/SalesService';

// Fetch bonuri închise pentru TOATE gestiunile, deduplicate după id
export const useRefundPage = (warehouses, urlDate) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(urlDate ? dayjs(urlDate) : dayjs());

  useEffect(() => {
    if (!urlDate) return;
    const urlDayjs = dayjs(urlDate);
    if (!selectedDate.isSame(urlDayjs, 'day')) {
      setSelectedDate(urlDayjs);
    }
  }, [urlDate]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchClosedReceipts = async () => {
    if (!warehouses || warehouses.length === 0) return;

    setLoading(true);
    setReceipts([]);
    setError(null);

    try {
      const start = selectedDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const end = selectedDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

      // Fetch pentru fiecare gestiune în paralel
      const results = await Promise.all(
        warehouses.map(w => SalesService.getReceiptsReport(w.id, 'CLOSED', start, end))
      );

      // Merge și deduplică după receipt.id
      const seen = new Set();
      const merged = [];
      for (const batch of results) {
        for (const receipt of (batch || [])) {
          if (!seen.has(receipt.id)) {
            seen.add(receipt.id);
            merged.push(receipt);
          }
        }
      }

      // Sortare cronologică
      merged.sort((a, b) => {
        const aTime = dayjs(a?.closedAt);
        const bTime = dayjs(b?.closedAt);
        if (!aTime.isValid() && !bTime.isValid()) return 0;
        if (!aTime.isValid()) return 1;
        if (!bTime.isValid()) return -1;
        return aTime.diff(bTime);
      });

      setReceipts(merged);

    } catch (err) {
      console.error("Eroare la căutare bonuri:", err);
      setError("A apărut o eroare la comunicarea cu serverul.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, warehouses.map(w => w.id).join(',')]);

  const handleOpenModal = (receipt) => {
    setSelectedReceipt(receipt);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleRefundSuccess = () => {
    fetchClosedReceipts();
  };

  return {
    receipts,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    modalOpen,
    selectedReceipt,
    handleOpenModal,
    handleCloseModal,
    handleRefundSuccess
  };
};