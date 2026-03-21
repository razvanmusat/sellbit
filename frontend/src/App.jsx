import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Typography, Box, Snackbar, Alert, Button } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

// --- PAGINI LOGIN & CASIER ---
import LoginPage from './modules/auth/pages/LoginPage';
import Home from './modules/cashier/sales/pages/Home'; 
import SellPage from './modules/cashier/sales/pages/SellPage';

// Import Casierie (Rapoarte/Sertar)
import CashierMainPage from './modules/cashier/cashierReports/pages/CashierMainPage';
import CashDrawerPage from './modules/cashier/cashierReports/pages/CashDrawerPage';
import SellReports from './modules/cashier/cashierReports/pages/SellReports';
import CashMovementHistory from './modules/cashier/cashierReports/pages/CashMovementHistory';
import RefundPage from './modules/cashier/cashierReports/pages/RefundPage';

// Import Rezervări
import ReservationsMainPage from './modules/cashier/reservations/pages/ReservationsMainPage';

// Import Catering
import CateringMainPage from './modules/cashier/catering/pages/CateringMainPage';

// Import Stoc (Casier)
import StockMainPage from './modules/cashier/stock/pages/StockMainPage';

// Import Catalog Full-Screen pentru Vânzare
import SalesCatalogPage from './modules/cashier/sales/pages/SalesCatalogPage';

// --- IMPORTURI ADMIN ---
import AdminLayout from './modules/admin/layout/AdminLayout';

// Import Catalog Admin
import CatalogMainPage from './modules/admin/catalog/pages/CatalogMainPage'; 

// Import Catering Admin
import CateringMainPageAdmin from './modules/admin/catering/pages/CateringMainPage';

// 👇 IMPORT NOU: Modulul de Inventar (Achiziții, Ajustări, Stoc)
import InventoryMainPage from './modules/admin/inventory/pages/InventoryMainPage';

import WarehousesMainPage from './modules/admin/settings/warehouses/pages/WarehousesMainPage';

import SalesMainPage from './modules/admin/sales/pages/SalesMainPage';
import UsersMainPage from './modules/admin/settings/users/pages/UsersMainPage';
import SystemSettingsPage from './modules/admin/settings/pages/SystemSettingsPage';
import CompanySettingsPage from './modules/admin/settings/company/pages/CompanySettingsPage';
import VatRatesSettingsPage from './modules/admin/settings/vat/pages/VatRatesSettingsPage';
import VoucherMainPage from './modules/admin/vouchers/pages/VoucherMainPage';
import { StoreService } from './modules/admin/settings/company/api/StoreService';

// --- COMPONENTE DE SISTEM ---
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import MainLayout from './shared/components/layout/MainLayout';

dayjs.locale('ro');

// --- PLACEHOLDERS ADMIN (Pagini temporare) ---
const AdminDashboard = () => (
  <Box
    sx={{
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      opacity: 0.7,
    }}
  >
    <Typography variant="h5" fontWeight="bold" color="text.secondary">
      👆 Alege o opțiune din meniul de sus pentru a începe
    </Typography>
  </Box>
);

// Componentă generică pentru paginile "În lucru"
const PlaceholderPage = ({ title }) => (
  <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, opacity: 0.6 }}>
    <Typography variant="h4" gutterBottom>{title}</Typography>
    <Typography variant="body1">Modul în curs de dezvoltare...</Typography>
  </Box>
);


function App() {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const isAuthenticated = token && user;
  const [showStoreSetupWarning, setShowStoreSetupWarning] = useState(false);
  
  // Verificăm nivelul de autoritate curent
  const userAuthority = user ? user.authorityLevel : 0;

  useEffect(() => {
    let isCancelled = false;

    const checkStoreConfigured = async () => {
      if (!isAuthenticated || userAuthority < 100) {
        if (!isCancelled) {
          setShowStoreSetupWarning(false);
        }
        return;
      }

      try {
        const configured = await StoreService.isConfigured();
        if (!isCancelled) {
          setShowStoreSetupWarning(!configured);
        }
      } catch {
        if (!isCancelled) {
          setShowStoreSetupWarning(false);
        }
      }
    };

    checkStoreConfigured();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, userAuthority]);

  return (
    <>
      <Routes>
        <Route 
          path="/"
          element={<Navigate to={isAuthenticated ? "/home" : "/login"} replace />}
        />

        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />} 
        />

      {/* CATALOG VÂNZARE (FULL SCREEN) */}
        <Route 
          path="/sales/catalog" 
          element={
            <ProtectedRoute authorityLevel={50}> 
               <SalesCatalogPage />
            </ProtectedRoute>
          } 
        />

      {/* --- ZONA CASIER (MainLayout) --- */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute authorityLevel={50}> 
               <MainLayout />
            </ProtectedRoute>
          } 
        >
        {/* Componenta Home default */}
        <Route index element={<Home />} />
        
        {/* 1. Vânzare */}
        <Route path="sell/:receiptId?" element={<SellPage />} />
        {/* Pagina de schimbare gestiune bonuri */}
        
        {/* 2. Casierie */}
        <Route path="cashier" element={<CashierMainPage />}>
          <Route path="drawer" element={<CashDrawerPage />} />
          <Route path="reports" element={<SellReports />} />
          <Route path="history" element={<CashMovementHistory />} />
          <Route path="refund" element={<RefundPage />} />
        </Route>

        {/* 3. Rezervări */}
        <Route path="reservations" element={<ReservationsMainPage />} />
        
        {/* 4. Catering */}
        <Route path="catering" element={<CateringMainPage />} />
        
        {/* 5. Stoc */}
        <Route path="stock" element={<StockMainPage />} />
        </Route>

      {/* --- ZONA ADMIN (AdminLayout) --- */}
        <Route 
          path="/admin"
          element={
            isAuthenticated && userAuthority < 100 ? (
              <Navigate to="/home" replace />
            ) : (
              <ProtectedRoute authorityLevel={100}>
                  <AdminLayout />
              </ProtectedRoute>
            )
          } 
        >
        {/* 1. Dashboard */}
        <Route path="dashboard" element={<AdminDashboard />} />
        
        {/* 2. CATALOG */}
        <Route path="catalog" element={<CatalogMainPage />} />

        {/* 3. CATERING */}
        <Route path="catering" element={<CateringMainPageAdmin />} />
        
        {/* 4. INVENTORY (Achiziții / Ajustări / Inventar) */}        
        <Route path="inventory" element={<InventoryMainPage />} />

        <Route path="sales" element={<SalesMainPage />} />
        {/* 5. Setări sistem */}
        <Route path="settings" element={<SystemSettingsPage />}>
          <Route index element={<Navigate to="warehouses" replace />} />
          <Route path="warehouses" element={<WarehousesMainPage />} />
          <Route path="users" element={<UsersMainPage />} />
          <Route path="company" element={<CompanySettingsPage />} />
          <Route path="vat-rates" element={<VatRatesSettingsPage />} />
        </Route>

        {/* Redirecturi pentru căile vechi */}
        <Route path="warehouses" element={<Navigate to="/admin/settings/warehouses" replace />} />
        <Route path="users" element={<Navigate to="/admin/settings/users" replace />} />
        <Route path="company" element={<Navigate to="/admin/settings/company" replace />} />

        <Route path="vouchers" element={<VoucherMainPage />} />
        </Route>

      {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Snackbar
        open={showStoreSetupWarning}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          variant="filled"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/admin/settings/company')}
            >
              Configurează
            </Button>
          }
        >
          Lipsesc datele companiei. Completează-le pentru funcționare corectă.
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;