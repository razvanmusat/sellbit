import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Tabs, Tab, Typography, CircularProgress, Alert } from '@mui/material';

import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaymentsIcon from '@mui/icons-material/Payments';
import SavingsIcon from '@mui/icons-material/Savings';

import { WarehouseService } from '../../settings/warehouses/api/WarehouseService';
import Receipts from '../components/Receipts';
import ProductStats from '../components/ProductStats';
import PaymentStats from '../components/PaymentStats';
import ProfitStats from '../components/ProfitStats';

import { resetStats } from '../store/productStatsSlice';
import { resetReceipts } from '../store/receiptsSlice';
import { resetPayments } from '../store/paymentsSlice';

const SalesMainPage = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();

    const [warehouses, setWarehouses] = useState([]);
    const filteredWarehouses = warehouses.filter(w => w.code !== 'GP');
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);
    const [error, setError] = useState(null);

    const activeTabParam = searchParams.get('tab');
    const activeTab = activeTabParam !== null ? parseInt(activeTabParam, 10) : -1;

    // Curăță warehouseId din URL dacă există din versiunea veche
    useEffect(() => {
        if (searchParams.get('warehouseId')) {
            const currentParams = Object.fromEntries(searchParams);
            delete currentParams.warehouseId;
            setSearchParams(currentParams, { replace: true });
        }
    }, []);

    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const data = await WarehouseService.getAllActive();
                setWarehouses(data || []);
            } catch (err) {
                setError('Eroare la încărcarea gestiunilor.');
            } finally {
                setLoadingWarehouses(false);
            }
        };
        loadWarehouses();
    }, []);

    useEffect(() => {
        return () => {
            dispatch(resetStats());
            dispatch(resetReceipts());
            dispatch(resetPayments());
        };
    }, [dispatch]);

    const handleTabChange = (e, val) => {
        const currentParams = Object.fromEntries(searchParams);
        setSearchParams({ ...currentParams, tab: val }, { replace: true });
    };

    if (loadingWarehouses) {
        return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* TABS PRINCIPALE */}
            <Box sx={{ flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={activeTab === -1 ? false : activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ minHeight: 48 }}
                >
                    <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Bonuri Fiscale" value={0} />
                    <Tab icon={<PaymentsIcon />} iconPosition="start" label="Situație Încasări" value={1} />
                    <Tab icon={<AssessmentIcon />} iconPosition="start" label="Raport Produse" value={2} />                    
                    <Tab icon={<SavingsIcon />} iconPosition="start" label="Profitabilitate" value={3} />
                </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5', scrollbarGutter: 'stable' }}>
                {activeTab === -1 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" color="text.secondary">📊 Alege un tip de raport</Typography>
                    </Box>
                ) : (
                    <>
                        {activeTab === 0 && <Receipts />}
                        {activeTab === 1 && <PaymentStats warehouses={filteredWarehouses} />}
                        {activeTab === 2 && <ProductStats warehouses={filteredWarehouses} />}                        
                        {activeTab === 3 && <ProfitStats warehouses={filteredWarehouses} />}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default SalesMainPage;