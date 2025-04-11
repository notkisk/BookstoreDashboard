import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/pages/login";
import DashboardLayout from "@/layouts/dashboard-layout";
import Dashboard from "@/pages/dashboard";

// Temporary simplified version to debug white screen issue
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          <div className="flex h-screen w-full items-center justify-center">
            <div className="bg-white shadow-md rounded p-8 max-w-sm">
              <h1 className="text-3xl font-bold text-center mb-6 text-primary">Bookstore Management</h1>
              <p className="mb-4 text-gray-700">Welcome to the bookstore management application</p>
              <div className="flex justify-center">
                <a 
                  href="/login" 
                  className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90 transition-colors"
                >
                  Go to Login
                </a>
              </div>
            </div>
          </div>
        </Route>
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
