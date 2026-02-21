import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Tabs, Tab, Typography, CircularProgress, Alert } from '@mui/material';

import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaymentsIcon from '@mui/icons-material/Payments';
import SavingsIcon from '@mui/icons-material/Savings';

import WarehouseTabs from '../../../cashier/sales/components/common/WarehouseTabs';
import { WarehouseService } from '../../settings/warehouses/api/WarehouseService'; 
import Receipts from '../components/Receipts';
import ProductStats from '../components/ProductStats';
import PaymentStats from '../components/PaymentStats';
import ProfitStats from '../components/ProfitStats';

import { fetchProductStats, resetStats } from '../store/productStatsSlice';
import { fetchReceipts, resetReceipts } from '../store/receiptsSlice';
import { resetPayments } from '../store/paymentsSlice';

const SalesMainPage = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [warehouses, setWarehouses] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);
    const [error, setError] = useState(null);

    const activeTabParam = searchParams.get('tab');
    const activeTab = activeTabParam !== null ? parseInt(activeTabParam, 10) : -1;
    
    const paramId = searchParams.get('warehouseId');
    const selectedWarehouseId = paramId ? parseInt(paramId, 10) : null;

    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const data = await WarehouseService.getAllActive();
                setWarehouses(data || []);
            } catch (err) {
                setError("Eroare la încărcarea gestiunilor.");
            } finally {
                setLoadingWarehouses(false);
            }
        };
        loadWarehouses();
    }, []);
    
    useEffect(() => {
        if (selectedWarehouseId) {
            dispatch(fetchProductStats({ warehouseId: selectedWarehouseId }));
            dispatch(fetchReceipts({ warehouseId: selectedWarehouseId }));
        }
    }, [dispatch, selectedWarehouseId]);

    useEffect(() => {
        return () => {
            dispatch(resetStats());
            dispatch(resetReceipts());
            dispatch(resetPayments());
        };
    }, [dispatch]);

    const updateParams = (newParams) => {
        const currentParams = Object.fromEntries(searchParams);
        setSearchParams({ ...currentParams, ...newParams }, { replace: true });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ flexShrink: 0, pt: 1 }}>
                {loadingWarehouses ? (
                    <Box p={2}><CircularProgress size={20} /></Box>
                ) : error ? (
                    <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
                ) : (
                    <WarehouseTabs 
                        warehouses={warehouses}
                        selectedWarehouseId={selectedWarehouseId}
                        onWarehouseChange={(e, val) => updateParams({ warehouseId: val })}
                    />
                )}

                {selectedWarehouseId && (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs 
                            value={activeTab === -1 ? false : activeTab} 
                            onChange={(e, val) => updateParams({ tab: val })} 
                            variant="scrollable"
                            textColor="primary"
                            indicatorColor="primary"
                            sx={{ minHeight: 48 }}
                        >
                            <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Bonuri Fiscale" value={0} />
                            <Tab icon={<AssessmentIcon />} iconPosition="start" label="Raport Produse" value={1} />
                            <Tab icon={<PaymentsIcon />} iconPosition="start" label="Situație Încasări" value={2} />
                            <Tab icon={<SavingsIcon />} iconPosition="start" label="Profitabilitate" value={3} />
                        </Tabs>
                    </Box>
                )}
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5', scrollbarGutter: 'stable' }}>
                {!selectedWarehouseId ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" color="text.secondary">👆 Selectează o gestiune</Typography>
                    </Box>
                ) : activeTab === -1 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" color="text.secondary">📊 Alege un tip de raport</Typography>
                    </Box>
                ) : (
                    <>
                        {activeTab === 0 && <Receipts warehouseId={selectedWarehouseId} />}
                        {activeTab === 1 && <ProductStats warehouseId={selectedWarehouseId} />}
                        {activeTab === 2 && <PaymentStats warehouseId={selectedWarehouseId} />}
                        {activeTab === 3 && (
                            <ProfitStats 
                                warehouseId={selectedWarehouseId} 
                                warehouseName={warehouses.find(w => w.id === selectedWarehouseId)?.name}
                            />
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default SalesMainPage;