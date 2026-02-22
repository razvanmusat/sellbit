import { useState, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { SalesService } from '../../sales/api/SalesService';

export const useSellReports = (warehouseId) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cache: (warehouseId_YYYY-MM-DD) → receipts
  const cacheRef = useRef({});

  const fetchReportData = async (dateToFetch, warehouseToFetch) => {
    if (!warehouseToFetch || !dateToFetch) return;
    
    const cacheKey = `${warehouseToFetch}_${dateToFetch.format('YYYY-MM-DD')}`;
    
    // CHECK CACHE FIRST - BEFORE SETTING LOADING!
    // Aceasta e diferența care face ca rapoartele să fie instant
    if (cacheRef.current[cacheKey]) {
      console.log(`[Cache HIT] ${cacheKey} - instant load`);
      setReceipts(cacheRef.current[cacheKey]);
      setLoading(false);
      setError(null);
      return; // EXIT EARLY - nu mai facem API call!
    }
    
    // Doar dacă NU avem în cache, atunci setez loading
    console.log(`[Cache MISS] ${cacheKey} - API call`);
    setLoading(true);
    setError(null);

    try {
      const start = dateToFetch.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
      const end = dateToFetch.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

      const data = await SalesService.getReceiptsReport(
        warehouseToFetch, 
        'CLOSED', 
        start, 
        end
      );
      
      // Safety check
      const receiptsData = data || [];
      cacheRef.current[cacheKey] = receiptsData; // Cache pe date + warehouse
      setReceipts(receiptsData);
      
    } catch (err) {
      console.error("Eroare raport:", err);
      setError("Nu am putut încărca raportul de casă.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(selectedDate, warehouseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, selectedDate]);

  // Calculul rămâne neschimbat - este corect și necesar pentru UI
  const totals = useMemo(() => {
    const stats = {
      CASH: 0, CARD: 0, VOUCHER: 0, BANK_TRANSFER: 0, ADVANCE: 0,
      grandTotal: 0
    };

    const REAL_MONEY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER'];

    receipts.forEach(receipt => {
      if (receipt.payments) {
        receipt.payments.forEach(payment => {
          if (stats.hasOwnProperty(payment.methodCode)) {
             stats[payment.methodCode] += payment.amount;
             
             // Adunăm la grandTotal doar dacă este metodă de încasare reală
             if (REAL_MONEY_METHODS.includes(payment.methodCode)) {
                stats.grandTotal += payment.amount;
             }
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