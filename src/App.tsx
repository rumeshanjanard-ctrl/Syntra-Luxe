/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './Login';
import TmDashboard from './TmDashboard';
import SkuEntry from './SkuEntry';
import RsmDashboard from './RsmDashboard';
import AdminDashboard from './AdminDashboard';
import StockRequest from './StockRequest';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const userStr = localStorage.getItem('currentUser');
  const location = useLocation();

  if (!userStr) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!user || !user.email) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'Admin') return <Navigate to="/admin-dashboard" replace />;
      if (user.role === 'RSM') return <Navigate to="/admin-dashboard" replace />;
      return <Navigate to="/tm-dashboard" replace />;
    }
    
    return <>{children}</>;
  } catch (e) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* TM Routes */}
        <Route path="/tm-dashboard" element={
          <ProtectedRoute allowedRoles={['TM']}>
            <TmDashboard />
          </ProtectedRoute>
        } />
        <Route path="/sku-entry" element={
          <ProtectedRoute allowedRoles={['TM']}>
            <SkuEntry />
          </ProtectedRoute>
        } />
        <Route path="/stock-request" element={
          <ProtectedRoute allowedRoles={['TM']}>
            <StockRequest />
          </ProtectedRoute>
        } />

        {/* RSM Routes */}
        <Route path="/rsm-dashboard" element={
          <ProtectedRoute allowedRoles={['RSM']}>
            <RsmDashboard />
          </ProtectedRoute>
        } />

        {/* Admin and RSM Routes */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={['Admin', 'RSM']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
