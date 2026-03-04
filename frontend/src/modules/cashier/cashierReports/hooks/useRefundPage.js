import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { SalesService } from '../../sales/api/SalesService';

export const useRefundPage = (warehouseId, urlDate) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Inițializează selectedDate cu data din URL dacă există, altfel cu ziua curentă
  const [selectedDate, setSelectedDate] = useState(urlDate ? dayjs(urlDate) : dayjs());
  // Sincronizează selectedDate cu modificările din URL (ex: la schimbare warehouse/tab)
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
    if (!warehouseId) return;

    setLoading(true);
    setReceipts([]); // Resetăm datele vechi pentru UX curat
    setError(null);

    try {
      // Standardizare numire variabile (start/end)
      const start = selectedDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const end = selectedDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

      const data = await SalesService.getReceiptsReport(
        warehouseId, 
        'CLOSED', 
        start, 
        end
      );
      
      // Tratare sigură: dacă data e null/undefined, punem array gol
      const sortedReceipts = [...(data || [])].sort((a, b) => {
        const aTime = dayjs(a?.closedAt);
        const bTime = dayjs(b?.closedAt);
        if (!aTime.isValid() && !bTime.isValid()) return 0;
        if (!aTime.isValid()) return 1;
        if (!bTime.isValid()) return -1;
        return aTime.diff(bTime);
      });

      setReceipts(sortedReceipts);
      
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
  }, [selectedDate, warehouseId]);

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