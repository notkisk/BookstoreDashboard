import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  ShoppingCart, 
  User, 
  Upload, 
  Download, 
  Search, 
  Bell, 
  X, 
  Menu,
  FileText,
  MapPin,
  LogOut,
  Award,
  BarChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface NavLinkProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  isActive: boolean;
}

const NavLink = ({ href, icon, children, isActive }: NavLinkProps) => (
  <Link href={href}>
    <div className={cn(
      "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors",
      isActive 
        ? "text-black bg-white" 
        : "text-gray-700 hover:bg-white hover:bg-opacity-50"
    )}>
      <span className="mr-3 text-lg">{icon}</span>
      {children}
    </div>
  </Link>
);

interface DashboardLayoutProps {
  children: ReactNode;
}

// Export the routes for use in other components
export const dashboardRoutes = [
  { path: "/", label: "Dashboard", icon: <LayoutDashboard /> },
  { path: "/inventory", label: "Book Inventory", icon: <BookOpen /> },
  { path: "/orders", label: "Orders", icon: <ShoppingCart /> },
  { path: "/customers", label: "Customers", icon: <User /> },
  { path: "/historical-sales", label: "Historical Sales", icon: <BarChart /> },
  { path: "/cost-management", label: "Cost Management", icon: <FileText /> },
  { path: "/loyalty-management", label: "Loyalty Program", icon: <Award /> },
  { path: "/location-data", label: "Location Data", icon: <MapPin /> },
  { path: "/import", label: "Import Books", icon: <Upload /> },
  { path: "/export", label: "Export Orders", icon: <Download /> },
];

// Export this component for reuse in other layouts
export function DashboardSidebarContent() {
  const [location] = useLocation();
  
  return (
    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
      {dashboardRoutes.map(route => (
        <NavLink 
          key={route.path} 
          href={route.path} 
          icon={route.icon}
          isActive={location === route.path}
        >
          {route.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get the current user data from the API
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/auth/me', {
          method: 'GET'
        });
        return response.user;
      } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST'
      });
      
      // Clear all queries from cache
      queryClient.clear();
      
      // Show success message
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of the system."
      });
      
      // Redirect to login
      setLocation('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was a problem logging out. Please try again."
      });
    }
  };

  // Use the exported routes
  const routes = dashboardRoutes;

  // Extract the title from the current route
  const getCurrentTitle = () => {
    const route = routes.find(r => r.path === location);
    return route ? route.label : "Dashboard";
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-gray-200 hidden md:block transition-all duration-300" style={{ backgroundColor: "#e2d1b5" }}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 flex items-center border-b border-gray-200">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="ml-2 font-semibold text-lg text-black">BookStore</h1>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {routes.map(route => (
              <NavLink 
                key={route.path} 
                href={route.path} 
                icon={route.icon}
                isActive={location === route.path}
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
          
          {/* User Profile */}
          <div className="p-4 pt-2 border-t border-gray-200">
            <div className="flex items-center px-3 py-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="ml-3 flex-1 truncate">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {userLoading ? "Loading..." : user?.fullName || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.username || ""}
                </p>
              </div>
            </div>
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={handleLogout}
            >
              <span className="mr-3 text-lg"><LogOut className="h-4 w-4" /></span>
              <span>Log out</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="w-12 h-12 rounded-full bg-primary-300 flex items-center justify-center text-white shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#e2d1b5" }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <h1 className="ml-2 font-semibold text-lg text-black">BookStore</h1>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Navigation Links (Same as desktop) */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {routes.map(route => (
              <NavLink 
                key={route.path} 
                href={route.path} 
                icon={route.icon}
                isActive={location === route.path}
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
          
          {/* User Profile */}
          <div className="p-4 pt-2 border-t border-gray-200">
            <div className="flex items-center px-3 py-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="ml-3 flex-1 truncate">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {userLoading ? "Loading..." : user?.fullName || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.username || ""}
                </p>
              </div>
            </div>
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={handleLogout}
            >
              <span className="mr-3 text-lg"><LogOut className="h-4 w-4" /></span>
              <span>Log out</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "#e2d1b5" }}>
        {/* Top header bar */}
        <header className="border-b border-gray-200 shadow-sm" style={{ backgroundColor: "#e2d1b5" }}>
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black">
              {getCurrentTitle()}
            </h2>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full hover:bg-secondary">
                <Bell className="h-5 w-5 text-gray-700" />
              </button>
              <button className="p-2 rounded-full hover:bg-secondary">
                <Search className="h-5 w-5 text-gray-700" />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-secondary md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}