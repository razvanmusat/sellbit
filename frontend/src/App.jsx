import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Typography } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';

// --- PAGINI ---
import LoginPage from './modules/auth/pages/LoginPage';
import Home from './modules/cashier/sales/pages/Home'; 
import SellPage from './modules/cashier/sales/pages/SellPage';

// Import Casierie (Rapoarte/Sertar)
import CashierReportsTabs from './modules/cashier/cashierReports/components/CashierReportsTabs';

// Import Rezervări
import ReservationsMainPage from './modules/cashier/reservations/pages/ReservationsMainPage';

// Import Catering
import CateringMainPage from './modules/cashier/catering/pages/CateringMainPage';

// 👇 IMPORT NOU STOC (Pagina Reală)
import StockMainPage from './modules/cashier/stock/pages/StockMainPage';

// --- COMPONENTE DE SISTEM ---
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import MainLayout from './shared/components/layout/MainLayout';

dayjs.locale('ro');

// --- PAGINI PLACEHOLDER RĂMASE (Doar Admin mai e placeholder momentan) ---
const AdminDashboard = () => <Typography variant="h4" sx={{p:2}}>Panou de Administrare</Typography>;

function App() {
  const { token, user } = useSelector((state) => state.auth);
  const isAuthenticated = token && user;

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
        
        {/* 5. Stoc (Ruta Actualizată) */}
        <Route path="stock" element={<StockMainPage />} />
      </Route>

      <Route 
        path="/admin"
        element={
          <ProtectedRoute authorityLevel={100}>
            <MainLayout />
          </ProtectedRoute>
        } 
      >
        <Route path="dashboard" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;