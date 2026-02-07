import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { SalesService } from '../../sales/api/SalesService';

export const useSellReports = (warehouseId) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReportData = async () => {
    if (!warehouseId || !selectedDate) return;
    
    setLoading(true);
    setReceipts([]); // Resetare date (UX Consistency)
    setError(null);

    try {
      const start = selectedDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const end = selectedDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

      const data = await SalesService.getReceiptsReport(
        warehouseId, 
        'CLOSED', 
        start, 
        end
      );
      
      // Safety check
      setReceipts(data || []);
      
    } catch (err) {
      console.error("Eroare raport:", err);
      setError("Nu am putut încărca raportul de casă.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, selectedDate]);

  // Calculul rămâne neschimbat - este corect și necesar pentru UI
  const totals = useMemo(() => {
    const stats = {
      CASH: 0, CARD: 0, VOUCHER: 0, BANK_TRANSFER: 0, ADVANCE: 0,
      grandTotal: 0
    };

    receipts.forEach(receipt => {
      stats.grandTotal += receipt.totalAmount;
      if (receipt.payments) {
        receipt.payments.forEach(payment => {
          if (stats.hasOwnProperty(payment.methodCode)) {
             stats[payment.methodCode] += payment.amount;
          }
        });
      }
    });
    return stats;
  }, [receipts]);

  return {
    selectedDate,
    setSelectedDate,
    receipts,
    loading,
    error,
    totals,
    fetchReportData
  };
};