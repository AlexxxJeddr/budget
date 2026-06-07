import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BudgetProvider } from '@/contexts/BudgetContext';
import { Login } from '@/pages/Login';
import { BudgetDashboard } from '@/pages/BudgetDashboard';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Main App component
function AppRoutes() {
  const { logout } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BudgetDashboard onLogout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <BudgetDashboard onLogout={logout} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// Root App component with providers
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BudgetProvider>
          <AppRoutes />
        </BudgetProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
