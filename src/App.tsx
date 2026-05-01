/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
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
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('currentUser');
      }
    });

    // Handle initial global background token errors here 
    // to prevent the unhandled promise rejection loops
    const checkSession = async () => {
      const { error } = await supabase.auth.getSession();
      if (error && (error.message.includes('refresh_token_not_found') || error.message.includes('Refresh Token Not Found'))) {
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem('currentUser');
        if (window.location.pathname !== '/') {
           window.location.href = '/';
        }
      }
    }
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
