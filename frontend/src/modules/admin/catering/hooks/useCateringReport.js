import { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

export const useCateringReport = () => {
    const { unpaidOrders, historyOrders, priceMap, loading } = useSelector((state) => state.catering);
    const [searchParams, setSearchParams] = useSearchParams();

    // 2. STATE LOCAL - Inițializare din URL sau Default
    const [startDate, setStartDate] = useState(() => {
        const paramDate = searchParams.get('startDate');
        return paramDate ? dayjs(paramDate) : dayjs().startOf('month');
    });

    const [endDate, setEndDate] = useState(() => {
        const paramDate = searchParams.get('endDate');
        return paramDate ? dayjs(paramDate) : dayjs();
    });

    // Sincronizare URL când se schimbă datele (și suntem pe tab-ul corect implicit prin montarea componentei)
    useEffect(() => {
        const currentParams = Object.fromEntries(searchParams);
        // Actualizăm doar dacă datele din state diferă de URL pentru a evita loop-uri
        if (currentParams.startDate !== startDate.format('YYYY-MM-DD') || 
            currentParams.endDate !== endDate.format('YYYY-MM-DD')) {
            
            setSearchParams({
                ...currentParams,
                startDate: startDate.format('YYYY-MM-DD'),
                endDate: endDate.format('YYYY-MM-DD')
            }, { replace: true });
        }
    }, [startDate, endDate, setSearchParams, searchParams]);

    // 3. LOGICA CENTRALIZATĂ
    const reportData = useMemo(() => {
        if (!startDate || !endDate) return { groups: [], totals: { total: 0, paid: 0, unpaid: 0 } };

        const allOrders = [
            ...unpaidOrders.map(o => ({ ...o, isPaid: false })),
            ...historyOrders.map(o => ({ ...o, isPaid: true }))
        ];

        const filtered = allOrders.filter(order => {
            const oDate = dayjs(order.orderDate);
            return (oDate.isSame(startDate, 'day') || oDate.isAfter(startDate, 'day')) &&
                   (oDate.isSame(endDate, 'day') || oDate.isBefore(endDate, 'day'));
        });

        const dayGroups = {};
        const globalStats = { total: 0, paid: 0, unpaid: 0 };

        filtered.forEach(order => {
            const dateKey = dayjs(order.orderDate).format('YYYY-MM-DD');
            if (!dayGroups[dateKey]) {
                dayGroups[dateKey] = { 
                    date: dateKey, 
                    totalDay: 0, 
                    paidDay: 0, 
                    unpaidDay: 0, 
                    subGroups: {} 
                };
            }

            const resIdPart = order.reservationId ? `res-${order.reservationId}` : `no-res`;
            const subGroupKey = `${dateKey}_${resIdPart}`;

            if (!dayGroups[dateKey].subGroups[subGroupKey]) {
                dayGroups[dateKey].subGroups[subGroupKey] = {
                    id: subGroupKey,
                    orderDate: dateKey,
                    reservationName: order.reservationId ? `Rezervare: ${order.reservationName}` : "Comenzi Bar / Fără Rezervare",
                    isReservation: !!order.reservationId,
                    totalSub: 0,
                    paidSub: 0,
                    unpaidSub: 0,
                    items: []
                };
            }

            const price = priceMap[order.productId] || 0;
            const lineTotal = price * order.quantity;

            globalStats.total += lineTotal;
            if (order.isPaid) globalStats.paid += lineTotal;
            else globalStats.unpaid += lineTotal;

            const dGroup = dayGroups[dateKey];
            dGroup.totalDay += lineTotal;
            if (order.isPaid) dGroup.paidDay += lineTotal;
            else dGroup.unpaidDay += lineTotal;

            const sGroup = dGroup.subGroups[subGroupKey];
            sGroup.totalSub += lineTotal;
            if (order.isPaid) sGroup.paidSub += lineTotal;
            else sGroup.unpaidSub += lineTotal;

            const existingItem = sGroup.items.find(i => i.productId === order.productId && i.isPaid === order.isPaid);
            if (existingItem) {
                existingItem.quantity += order.quantity;
                existingItem.lineTotal += lineTotal;
            } else {
                sGroup.items.push({
                    ...order, unitPrice: price, lineTotal
                });
            }
        });

        const sortedGroups = Object.values(dayGroups).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
            .map(dg => {
                let status = 'PARTIAL'; 

                if (dg.unpaidDay === 0 && dg.totalDay > 0) {
                    status = 'PAID';
                } else if (dg.paidDay === 0 && dg.totalDay > 0) {
                    status = 'UNPAID';
                }

                const sortedSubs = Object.values(dg.subGroups).sort((a, b) => {
                    if (a.isReservation && !b.isReservation) return -1;
                    if (!a.isReservation && b.isReservation) return 1;
                    return 0;
                }).map(sg => {
                    let subStatus = 'PARTIAL';

                    if (sg.unpaidSub === 0) {
                        subStatus = 'PAID';
                    } else if (sg.paidSub === 0) {
                        subStatus = 'UNPAID';
                    }

                    return { ...sg, subStatus }; 
                });

                return { ...dg, status, subGroups: sortedSubs };
            });

        return { groups: sortedGroups, totals: globalStats };
    }, [unpaidOrders, historyOrders, startDate, endDate, priceMap]);

    return {
        startDate, setStartDate,
        endDate, setEndDate,
        reportData,
        loading
    };
};