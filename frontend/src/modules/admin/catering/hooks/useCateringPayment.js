import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { processCateringPayment } from '../store/cateringSlice';

export const useCateringPayment = () => {
    const dispatch = useDispatch();
    const { unpaidOrders, minUnpaidDate, priceMap, loading } = useSelector((state) => state.catering);
    const [searchParams, setSearchParams] = useSearchParams();

    // State Local - Inițializare din URL sau logică default
    const [startDate, setStartDate] = useState(() => {
        const paramDate = searchParams.get('startDate');
        if (paramDate) return dayjs(paramDate);
        return minUnpaidDate ? dayjs(minUnpaidDate) : dayjs().startOf('year');
    });

    const [endDate, setEndDate] = useState(() => {
        const paramDate = searchParams.get('endDate');
        return paramDate ? dayjs(paramDate) : dayjs();
    });

    const [selectedIds, setSelectedIds] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Sync URL
    useEffect(() => {
        const currentParams = Object.fromEntries(searchParams);
        if (currentParams.startDate !== startDate.format('YYYY-MM-DD') || 
            currentParams.endDate !== endDate.format('YYYY-MM-DD')) {
            
            setSearchParams({
                ...currentParams,
                startDate: startDate.format('YYYY-MM-DD'),
                endDate: endDate.format('YYYY-MM-DD')
            }, { replace: true });
        }
    }, [startDate, endDate, setSearchParams, searchParams]);

    // Effect: Actualizare start date din Redux (doar dacă nu a fost setat explicit din URL recent, 
    // dar păstrăm logica ta originală de siguranță: dacă data selectată e după minimul neplătit, o corectăm)
    useEffect(() => {
        if (minUnpaidDate) {
            const min = dayjs(minUnpaidDate);
            if (startDate.isAfter(min)) setStartDate(min);
        }
    }, [minUnpaidDate]); // Am scos startDate din dependency pentru a evita conflicte cu URL-ul, lăsăm doar verificarea la schimbarea minUnpaid

    // 1. FILTRARE SI GRUPARE
    const groupedData = useMemo(() => {
        if (!startDate || !endDate) return [];
        
        const filtered = unpaidOrders.filter(order => {
            const oDate = dayjs(order.orderDate);
            return (oDate.isSame(startDate, 'day') || oDate.isAfter(startDate, 'day')) &&
                   (oDate.isSame(endDate, 'day') || oDate.isBefore(endDate, 'day'));
        });

        const dayGroups = {};
        
        filtered.forEach(order => {
            const dateKey = dayjs(order.orderDate).format('YYYY-MM-DD');
            if (!dayGroups[dateKey]) {
                dayGroups[dateKey] = { date: dateKey, totalDay: 0, allIds: [], subGroups: {} };
            }

            const orderDateStr = dayjs(order.orderDate).format('YYYY-MM-DD');
            const resIdPart = order.reservationId ? `res-${order.reservationId}` : `no-res`;
            const subGroupKey = `${orderDateStr}_${resIdPart}`;

            if (!dayGroups[dateKey].subGroups[subGroupKey]) {
                dayGroups[dateKey].subGroups[subGroupKey] = {
                    id: subGroupKey,
                    orderDate: orderDateStr,
                    reservationName: order.reservationId ? `Rezervare: ${order.reservationName}` : "Comenzi Bar / Fără Rezervare",
                    isReservation: !!order.reservationId,
                    totalSubGroup: 0,
                    allIds: [],
                    items: []
                };
            }

            const price = priceMap[order.productId] || 0;
            const lineTotal = price * order.quantity;

            dayGroups[dateKey].totalDay += lineTotal;
            dayGroups[dateKey].allIds.push(order.id);

            const subGroup = dayGroups[dateKey].subGroups[subGroupKey];
            subGroup.totalSubGroup += lineTotal;
            subGroup.allIds.push(order.id);

            const existingItem = subGroup.items.find(i => i.productId === order.productId);
            if (existingItem) {
                existingItem.quantity += order.quantity;
                existingItem.lineTotal += lineTotal;
                existingItem.originalIds.push(order.id);
            } else {
                subGroup.items.push({
                    ...order, unitPrice: price, lineTotal, originalIds: [order.id]
                });
            }
        });

        return Object.values(dayGroups).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
            .map(dg => {
                const sortedSubs = Object.values(dg.subGroups).sort((a, b) => {
                    const dateDiff = dayjs(a.orderDate).diff(dayjs(b.orderDate));
                    if (dateDiff !== 0) return dateDiff;
                    if (a.isReservation && !b.isReservation) return -1;
                    if (!a.isReservation && b.isReservation) return 1;
                    return 0;
                });
                return { ...dg, subGroups: sortedSubs };
            });
    }, [unpaidOrders, startDate, endDate, priceMap]);

    // --- HANDLERS SELECȚIE ---
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(groupedData.flatMap(g => g.allIds));
        } else {
            setSelectedIds([]);
        }
    };
    
    const handleSelectDay = (ids, checked) => setSelectedIds(prev => checked ? [...new Set([...prev, ...ids])] : prev.filter(id => !ids.includes(id)));
    const handleSelectSub = (ids, checked) => setSelectedIds(prev => checked ? [...new Set([...prev, ...ids])] : prev.filter(id => !ids.includes(id)));
    const handleSelectRow = (ids, checked) => setSelectedIds(prev => checked ? [...new Set([...prev, ...ids])] : prev.filter(id => !ids.includes(id)));

    const totalToPay = useMemo(() => {
        return selectedIds.reduce((sum, orderId) => {
            const order = unpaidOrders.find(o => o.id === orderId);
            if (!order) return sum;
            const price = priceMap[order.productId] || 0;
            return sum + (price * order.quantity);
        }, 0);
    }, [selectedIds, unpaidOrders, priceMap]);

    const handlePayConfirm = async () => {
        await dispatch(processCateringPayment(selectedIds));
        setSelectedIds([]);
        setIsConfirmOpen(false);
    };

    const flatFilteredCount = groupedData.reduce((acc, g) => acc + g.allIds.length, 0);

    return {
        startDate, setStartDate,
        endDate, setEndDate,
        selectedIds,
        isConfirmOpen, setIsConfirmOpen,
        loading,
        groupedData,
        totalToPay,
        flatFilteredCount,
        handleSelectAll,
        handleSelectDay,
        handleSelectSub,
        handleSelectRow,
        handlePayConfirm
    };
};