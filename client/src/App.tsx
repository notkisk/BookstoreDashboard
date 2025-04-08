import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import DashboardLayout from "@/layouts/dashboard-layout";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import CreateOrder from "@/pages/create-order";
import ViewOrders from "@/pages/view-orders";
import Customers from "@/pages/customers";
import ImportCsv from "@/pages/import-csv";
import ExportCsv from "@/pages/export-csv";
import LocationData from "@/pages/location-data";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

// Custom hook to check if user is authenticated
function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/auth/me', {
          method: 'GET'
        });
        return response.user;
      } catch (error) {
        if ((error as Response)?.status === 401) {
          return null;
        }
        throw error;
      }
    }
  });

  // Temporarily bypass authentication for development
  return {
    user: data || { id: 1, username: 'admin' },
    isLoading: false,
    isAuthenticated: true,
    error: null
  };
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Temporarily bypass authentication checks for development
  return <>{children}</>;
}

function AuthenticatedRouter() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/orders" component={CreateOrder} />
          <Route path="/view-orders" component={ViewOrders} />
          <Route path="/customers" component={Customers} />
          <Route path="/import" component={ImportCsv} />
          <Route path="/export" component={ExportCsv} />
          <Route path="/location-data" component={LocationData} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/:rest*">
        <AuthenticatedRouter />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
