import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Typography, Box } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

// --- PAGINI LOGIN & CASIER ---
import LoginPage from './modules/auth/pages/LoginPage';
import Home from './modules/cashier/sales/pages/Home'; 
import SellPage from './modules/cashier/sales/pages/SellPage';

// Import Casierie (Rapoarte/Sertar)
import CashierReportsTabs from './modules/cashier/cashierReports/components/CashierReportsTabs';

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

// --- COMPONENTE DE SISTEM ---
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import MainLayout from './shared/components/layout/MainLayout';

dayjs.locale('ro');

// --- PLACEHOLDERS ADMIN (Pagini temporare) ---
const AdminDashboard = () => <Typography variant="h4" sx={{p:2}}>Panou de Administrare</Typography>;

// Componentă generică pentru paginile "În lucru"
const PlaceholderPage = ({ title }) => (
  <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, opacity: 0.6 }}>
    <Typography variant="h4" gutterBottom>{title}</Typography>
    <Typography variant="body1">Modul în curs de dezvoltare...</Typography>
  </Box>
);

function App() {
  const { token, user } = useSelector((state) => state.auth);
  const isAuthenticated = token && user;
  
  // Verificăm nivelul de autoritate curent
  const userAuthority = user ? user.authorityLevel : 0;

  return (
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
        <Route path="sell/:warehouseId?/:receiptId?" element={<SellPage />} />
        
        {/* 2. Casierie */}
        <Route path="cashier" element={<CashierReportsTabs />} />

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
        {/* 👇 AICI AM LEGAT PAGINA REALĂ */}
        <Route path="inventory" element={<InventoryMainPage />} />

        {/* 5. Restul Tab-urilor (Placeholders pentru moment) */}
        <Route path="warehouses" element={<PlaceholderPage title="Configurare Gestiuni" />} />
        <Route path="sales" element={<PlaceholderPage title="Rapoarte Vânzări" />} />
        <Route path="users" element={<PlaceholderPage title="Administrare Utilizatori" />} />
        <Route path="company" element={<PlaceholderPage title="Date Companie" />} />
        <Route path="vouchers" element={<PlaceholderPage title="Vouchere & Campanii" />} />
      </Route>

      {/* CATCH ALL */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;