import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../../shared/store/hooks';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAppSelector((state) => state.auth);

  // 1. Dacă nu e logat -> Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Fallback-ul universal este acum HOME-ul casierului
  const defaultHome = '/cashier/home';

  // 3. Dacă ruta cere un rol (ex: ADMIN) și userul nu-l are -> Trimite la Home
  if (allowedRole && user.roleCode !== allowedRole) {
    return <Navigate to={defaultHome} replace />;
  }

  // 4. Acces permis
  return children;
};

export default ProtectedRoute;