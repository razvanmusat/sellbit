import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { SalesService } from '../api/SalesService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';
import { onSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

export const usePaymentStats = (warehouseId, methodCode) => {
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const REAL_INCOME_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER'];

    useEffect(() => {
        if (!warehouseId) {
            return;
        }

        const unsubscribe = onSalesDataChanged(() => {
            setRefreshTick((value) => value + 1);
        });

        return unsubscribe;
    }, [warehouseId]);

    useEffect(() => {
        if (!warehouseId) return;

        let mounted = true;

        const doFetch = async () => {
            try {
                setLoading(true);
                setError(null);

                const params = {
                    warehouseId,
                    // Formatăm strict cum cere backend-ul tău Spring
                    start: dayjs(startDate).startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                    end: dayjs(endDate).endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
                    status: 'CLOSED'
                };

                const receipts = await SalesService.getReceiptsHistory(params);

                if (!mounted) return;

                if (!methodCode || methodCode === 'ALL') {
                    // Resetăm harta de totaluri la fiecare fetch
                    const totalsMap = {
                        'CASH': { methodCode: 'CASH', totalAmount: 0 },
                        'CARD': { methodCode: 'CARD', totalAmount: 0 },
                        'BANK_TRANSFER': { methodCode: 'BANK_TRANSFER', totalAmount: 0 },
                        'VOUCHER': { methodCode: 'VOUCHER', totalAmount: 0 },
                        'ADVANCE': { methodCode: 'ADVANCE', totalAmount: 0 }
                    };

                    if (Array.isArray(receipts)) {
                        receipts.forEach(r => {
                            (r.payments || []).forEach(p => {
                                if (totalsMap[p.methodCode]) {
                                    totalsMap[p.methodCode].totalAmount += Number(p.amount || 0);
                                }
                            });
                        });
                    }
                    setData(Object.values(totalsMap));
                } else {
                    const filtered = (receipts || []).reduce((acc, r) => {
                        const methodPayments = (r.payments || []).filter(p => p.methodCode === methodCode);
                        if (methodPayments.length > 0) {
                            const sum = methodPayments.reduce((s, p) => s + (p.amount || 0), 0);
                            acc.push({ ...r, totalAmount: sum });
                        }
                        return acc;
                    }, []);
                    setData(filtered);
                }
            } catch (err) {
                if (mounted) {
                    setError(getFriendlyErrorMessage(err));
                    setData([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        doFetch();
        return () => { mounted = false; };
        // Folosim .format() ca dependență pentru a declanșa useEffect-ul doar când data se schimbă efectiv
    }, [warehouseId, methodCode, dayjs(startDate).format('YYYY-MM-DD'), dayjs(endDate).format('YYYY-MM-DD'), refreshTick]);

    const totalGeneral = useMemo(() => {
        if (!data || data.length === 0) return 0;
        return data.reduce((sum, item) => {
            if (!methodCode || methodCode === 'ALL') {
                return REAL_INCOME_METHODS.includes(item.methodCode) 
                    ? sum + Number(item.totalAmount || 0) 
                    : sum;
            }
            return sum + Number(item.totalAmount || 0);
        }, 0);
    }, [data, methodCode]);

    return { startDate, setStartDate, endDate, setEndDate, data, loading, error, totalGeneral };
};