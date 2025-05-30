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
import HistoricalSales from "@/pages/historical-sales";
import CostManagement from "@/pages/cost-management";
import LoyaltyManagement from "@/pages/loyalty-management";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

// Custom hook to check if user is authenticated
function useAuth() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/auth/me', {
          method: 'GET'
        });
        console.log("Auth response:", response);
        return response.user;
      } catch (error) {
        console.error("Authentication error:", error);
        return null;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 1
  });

  // Add a manual refetch function to be used when needed
  useEffect(() => {
    // Refetch authentication on component mount
    refetch();
  }, [refetch]);

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data,
    error,
    refetch
  };
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  // Show loading indicator while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated, don't render children
  if (!isAuthenticated) {
    return null;
  }

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
          <Route path="/historical-sales" component={HistoricalSales} />
          <Route path="/cost-management" component={CostManagement} />
          <Route path="/loyalty-management" component={LoyaltyManagement} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/:rest*">
          <AuthenticatedRouter />
        </Route>
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
