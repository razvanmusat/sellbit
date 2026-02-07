import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { SalesService } from '../../sales/api/SalesService';

export const useRefundPage = (warehouseId) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Implicit: Ziua curentă
  const [selectedDate, setSelectedDate] = useState(dayjs());

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
      setReceipts(data || []);
      
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