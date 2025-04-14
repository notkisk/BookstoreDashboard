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
import gazalLogo from "../assets/gazal-black-logo.png";
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

const NavLink = ({ href, icon, children, isActive }: NavLinkProps) => {
  const [, navigate] = useLocation();
  
  return (
    <a
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      className={cn(
        "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-all duration-300 hover-scale",
        isActive 
          ? "text-black bg-white" 
          : "text-black hover:bg-white hover:bg-opacity-50"
      )}
    >
      <span className="mr-3">{icon}</span>
      <span>{children}</span>
    </a>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
}

// Export the routes for use in other components
export const dashboardRoutes = [
  { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
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
      <aside className="w-54 border-r border-gray-200 hidden md:block transition-all duration-300" style={{ backgroundColor: "#e1dbd0" }}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 flex items-center border-b border-gray-200">
            <div className="h-9 w-14 flex items-center justify-center hover-scale animate-scale-in">
              <img src={gazalLogo} alt="Gazal Logo" className="h-18 w-auto object-contain" />
            </div>
            <h1 className="ml-2 font-semibold text-lg text-black animate-fade-in">GazalBookStore</h1>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 animate-slide-in">
            {routes.map((route, index) => (
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
            <div className="flex items-center px-3 py-2 mb-1 animate-fade-in">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center shadow-md hover-scale transition-all duration-300">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="ml-3 flex-1 truncate">
                <p className="text-sm font-medium text-black truncate">
                  {userLoading ? "Loading..." : user?.fullName || "User"}
                </p>
                <p className="text-xs text-black truncate opacity-70">
                  {user?.username || ""}
                </p>
              </div>
            </div>
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer text-black hover:bg-white hover:bg-opacity-50 transition-all duration-300 hover-scale"
              onClick={handleLogout}
            >
              <span className="mr-3 text-lg"><LogOut className="h-4 w-4" /></span>
              <span>Log out</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-50 animate-pulse-light">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white shadow-lg hover-scale transition-all duration-300"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-40 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#e1dbd0" }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-14 w-14 flex items-center justify-center hover-scale animate-scale-in">
                <img src={gazalLogo} alt="Gazal Logo" className="h-14 w-auto object-contain" />
              </div>
              <h1 className="ml-2 font-semibold text-lg text-black animate-fade-in">GazalBookStore</h1>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="text-black hover:text-gray-800 hover-scale transition-all duration-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Navigation Links (Same as desktop) */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 animate-slide-in">
            {routes.map((route, index) => (
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
            <div className="flex items-center px-3 py-2 mb-1 animate-fade-in">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center shadow-md hover-scale transition-all duration-300">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="ml-3 flex-1 truncate">
                <p className="text-sm font-medium text-black truncate">
                  {userLoading ? "Loading..." : user?.fullName || "User"}
                </p>
                <p className="text-xs text-black truncate opacity-70">
                  {user?.username || ""}
                </p>
              </div>
            </div>
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer text-black hover:bg-white hover:bg-opacity-50 transition-all duration-300 hover-scale"
              onClick={handleLogout}
            >
              <span className="mr-3 text-lg"><LogOut className="h-4 w-4" /></span>
              <span>Log out</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto animate-fade-in" style={{ backgroundColor: "#e1dbd0" }}>
        {/* Top header bar - height matches sidebar header */}
        <header className="border-b border-gray-200 shadow-sm" style={{ backgroundColor: "#e1dbd0" }}>
          <div className="px-4 flex items-center justify-between h-[69px]">
            <h2 className="text-lg font-semibold text-black animate-fade-in">
              {getCurrentTitle()}
            </h2>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full hover:bg-white hover:bg-opacity-50 hover-scale transition-all duration-300">
                <Bell className="h-5 w-5 text-black" />
              </button>
              <button className="p-2 rounded-full hover:bg-white hover:bg-opacity-50 hover-scale transition-all duration-300">
                <Search className="h-5 w-5 text-black" />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-white hover:bg-opacity-50 hover-scale transition-all duration-300 md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 text-black" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 animate-slide-in">
          {children}
        </div>
      </main>
    </div>
  );
}