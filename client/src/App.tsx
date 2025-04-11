import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
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

// Simplified App for troubleshooting
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Login />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
