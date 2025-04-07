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
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  isActive: boolean;
}

const NavLink = ({ href, icon, children, isActive }: NavLinkProps) => (
  <Link href={href}>
    <a className={cn(
      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
      isActive 
        ? "bg-primary-50 text-primary-800" 
        : "text-gray-600 hover:bg-gray-100"
    )}>
      <span className="mr-3 text-lg">{icon}</span>
      {children}
    </a>
  </Link>
);

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const routes = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard /> },
    { path: "/inventory", label: "Book Inventory", icon: <BookOpen /> },
    { path: "/orders", label: "Orders", icon: <ShoppingCart /> },
    { path: "/customers", label: "Customers", icon: <User /> },
    { path: "/import", label: "CSV Import", icon: <Upload /> },
    { path: "/export", label: "CSV Export", icon: <Download /> },
  ];

  // Extract the title from the current route
  const getCurrentTitle = () => {
    const route = routes.find(r => r.path === location);
    return route ? route.label : "Dashboard";
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block transition-all duration-300">
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 flex items-center border-b border-gray-200">
            <div className="h-10 w-10 rounded-full bg-primary-300 flex items-center justify-center text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="ml-2 font-semibold text-lg text-gray-800">BookStore</h1>
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
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Admin User</p>
                <a href="#settings" className="text-xs font-medium text-primary-600 hover:text-primary-800">
                  Settings
                </a>
              </div>
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
          "fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary-300 flex items-center justify-center text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <h1 className="ml-2 font-semibold text-lg text-gray-800">BookStore</h1>
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
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Admin User</p>
                <a href="#settings" className="text-xs font-medium text-primary-600 hover:text-primary-800">
                  Settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {getCurrentTitle()}
            </h2>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Search className="h-5 w-5 text-gray-600" />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-gray-100 md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5 text-gray-600" />
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
