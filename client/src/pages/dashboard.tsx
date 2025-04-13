import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Chart } from "@/components/ui/chart";
import {
  BookOpen,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  BarChart as BarChartIcon,
  CheckCircle,
  Truck,
  Clock,
  RefreshCcw,
  MapPin,
  PercentSquare,
  Tag,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface DashboardStats {
  ordersCount: number;
  totalSales: number;
  profit: number;
  discounts: {
    amount: number;
    percentage: number;
  };
  bestSellingBooks: {
    book: {
      id: number;
      title: string;
      author: string;
      price: number;
      buyPrice: number;
    };
    soldCount: number;
  }[];
  ordersByStatus: {
    status: string;
    count: number;
  }[];
  ordersByWilaya: {
    wilayaId: string;
    wilayaName: string;
    count: number;
  }[];
  totalBooksSold?: number;
  comparisons?: {
    ordersCount: {
      current: number;
      previous: number;
      percentChange: number;
    };
    totalSales: {
      current: number;
      previous: number;
      percentChange: number;
    };
    profit: {
      current: number;
      previous: number;
      percentChange: number;
    };
    totalBooksSold?: {
      current: number;
      previous: number;
      percentChange: number;
    };
  };
}

interface Order {
  id: number;
  reference: string;
  customerId: number;
  totalAmount: number;
  finalAmount?: number;
  status: string;
  createdAt: string;
  deliveryPrice?: number;
  discountAmount?: number;
  discountPercentage?: number;
  customer?: {
    name: string;
    phone: string;
  };
  items?: {
    book: {
      title: string;
      price?: number;
    };
    quantity: number;
  }[];
}

export default function Dashboard() {
  const [period, setPeriod] = useState<string>("week");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  
  // Fetch dashboard analytics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/analytics/dashboard?period=${period}`],
    enabled: true,
    retry: 1,
    staleTime: 60000
  });

  // Fetch recent orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: true,
    retry: 1,
    staleTime: 60000
  });

  // Safe casting
  const typedStats = stats as DashboardStats | undefined;
  const typedOrders = orders as Order[] | undefined;

  // Process the orders data to get sales by day of the week
  const dailySalesByDay = useMemo(() => {
    if (!typedOrders || typedOrders.length === 0) {
      // Return default structure with zero values if no orders
      return [
        { name: "الاحد", sales: 0 },
        { name: "الاثنين", sales: 0 },
        { name: "الثلاثاء", sales: 0 },
        { name: "الاربعاء", sales: 0 },
        { name: "الخميس", sales: 0 },
        { name: "الجمعة", sales: 0 },
        { name: "السبت", sales: 0 }
      ];
    }

    // Group orders by day of the week
    const salesByDayOfWeek: Record<string, number> = {
      "الاحد": 0,    // Sunday (0)
      "الاثنين": 0,  // Monday (1)
      "الثلاثاء": 0, // Tuesday (2)
      "الاربعاء": 0, // Wednesday (3)
      "الخميس": 0,   // Thursday (4)
      "الجمعة": 0,   // Friday (5)
      "السبت": 0     // Saturday (6)
    };

    // Map JS day index (0-6, Sun-Sat) to Arabic day names
    const dayIndexToArabic = [
      "الاحد",    // Sunday (0)
      "الاثنين",  // Monday (1)
      "الثلاثاء", // Tuesday (2)
      "الاربعاء", // Wednesday (3)
      "الخميس",   // Thursday (4)
      "الجمعة",   // Friday (5)
      "السبت"     // Saturday (6)
    ];

    // Calculate sales for each day of the week
    typedOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dayOfWeek = orderDate.getDay(); // 0-6 (Sunday-Saturday)
      const dayName = dayIndexToArabic[dayOfWeek];
      const amount = order.finalAmount || order.totalAmount || 0;
      
      salesByDayOfWeek[dayName] += Number(amount);
    });

    // Transform to array format required by chart component
    return [
      { name: "الاحد", sales: salesByDayOfWeek["الاحد"] },
      { name: "الاثنين", sales: salesByDayOfWeek["الاثنين"] },
      { name: "الثلاثاء", sales: salesByDayOfWeek["الثلاثاء"] },
      { name: "الاربعاء", sales: salesByDayOfWeek["الاربعاء"] },
      { name: "الخميس", sales: salesByDayOfWeek["الخميس"] },
      { name: "الجمعة", sales: salesByDayOfWeek["الجمعة"] },
      { name: "السبت", sales: salesByDayOfWeek["السبت"] }
    ];
  }, [typedOrders]);

  const queryClient = useQueryClient();

  // Create a mutation for updating order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest<any>(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({
        title: "Status updated",
        description: "Order status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating order status:", error);
    },
  });

  // Define order columns for the data table
  const isOrderSelected = (order: Order) => selectedOrders.includes(order.id);
  const toggleOrderSelected = (order: Order, isSelected: boolean) => {
    if (isSelected) {
      setSelectedOrders(prev => [...prev, order.id]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== order.id));
    }
  };
  
  const orderColumns = [
    {
      id: "select",
      header: "Select",
      cell: (order: Order) => (
        <input
          type="checkbox"
          className="w-5 h-5 rounded border-2 border-gray-400 text-primary-600 focus:ring-primary-500 cursor-pointer"
          checked={isOrderSelected(order)}
          onChange={(e) => toggleOrderSelected(order, e.target.checked)}
        />
      ),
    },
    {
      header: "Order ID",
      accessorKey: "reference" as const,
    },
    {
      header: "Customer",
      accessorKey: "customerId" as const,
      cell: (order: Order) => order.customer?.name || "Unknown",
    },
    {
      header: "Books",
      accessorKey: "items" as const,
      cell: (order: Order) => {
        if (!order.items?.length) return "N/A";
        
        // Show only the first book title with a popup for details
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="link" className="p-0 h-auto text-left font-normal text-black-600 hover:underline">
                {order.items[0].book.title} {order.items.length > 1 ? `(+${order.items.length - 1} more)` : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h3 className="font-medium text-base border-b pb-2">Order Details</h3>
                <div className="text-sm">
                  <p className="font-semibold">Reference: {order.reference}</p>
                  <p>Customer: {order.customer?.name || "Unknown"}</p>
                  <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                  <p>Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
                  <div className="mt-2">
                    <p className="font-semibold mb-1">Items:</p>
                    <ul className="space-y-1">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex justify-between">
                          <span>{item.book.title}</span>
                          <span>x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2 border-t pt-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery:</span>
                      <span>{formatCurrency(order.deliveryPrice || 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Discount:</span>
                      <span>
                        {formatCurrency(
                          (order.discountAmount || 0) + 
                          ((order.discountPercentage || 0) / 100 * order.totalAmount)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold mt-1 pt-1 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(order.finalAmount || order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      header: "Total",
      accessorKey: "totalAmount" as const,
      cell: (order: Order) => {
        // Calculate the total with delivery price
        const total = order.finalAmount || (order.totalAmount + (order.deliveryPrice || 0));
        return formatCurrency(total);
      },
    },
    {
      header: "Date",
      accessorKey: "createdAt" as const,
      cell: (order: Order) => new Date(order.createdAt).toLocaleDateString(),
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (order: Order) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${
            order.status === "delivered"
              ? "bg-green-100 text-green-800"
              : order.status === "delivering"
                ? "bg-yellow-100 text-yellow-800"
                : order.status === "returned" || order.status === "reactionary"
                  ? "bg-red-100 text-red-800"
                  : order.status === "pending"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
          }`}
        >
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      ),
    },
    {
      header: "Actions",
      id: "actions",
      accessorKey: "id" as keyof Order,
      cell: (order: Order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                updateOrderStatus.mutate({ id: order.id, status: "pending" })
              }
              disabled={
                order.status === "pending" || updateOrderStatus.isPending
              }
            >
              <Clock className="mr-2 h-4 w-4" />
              <span>Mark as Pending</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                updateOrderStatus.mutate({ id: order.id, status: "delivering" })
              }
              disabled={
                order.status === "delivering" || updateOrderStatus.isPending
              }
            >
              <Truck className="mr-2 h-4 w-4" />
              <span>Mark as Delivering</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                updateOrderStatus.mutate({ id: order.id, status: "delivered" })
              }
              disabled={
                order.status === "delivered" || updateOrderStatus.isPending
              }
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Mark as Delivered</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                updateOrderStatus.mutate({
                  id: order.id,
                  status: "reactionary",
                })
              }
              disabled={
                order.status === "reactionary" || updateOrderStatus.isPending
              }
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              <span>Mark as Reactionary</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      {/* Overview Cards */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 dashboard-grid">
          {/* Total Books Card */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Books
                  </p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">
                      {typedStats?.totalBooksSold || 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <BookOpen className="text-primary-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center">
                {statsLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : typedStats?.comparisons?.totalBooksSold ? (
                  <>
                    <span className={`text-xs font-medium flex items-center ${
                      typedStats.comparisons.totalBooksSold.percentChange >= 0 
                        ? "text-green-600" 
                        : "text-red-600"
                    }`}>
                      {typedStats.comparisons.totalBooksSold.percentChange >= 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )} 
                      {Math.abs(typedStats.comparisons.totalBooksSold.percentChange)}%
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      from last {period}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">No previous data for comparison</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Orders Card */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Orders
                  </p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">
                      {typedStats?.ordersCount || 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="text-blue-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center">
                {statsLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : typedStats?.comparisons?.ordersCount ? (
                  <>
                    <span className={`text-xs font-medium flex items-center ${
                      typedStats.comparisons.ordersCount.percentChange >= 0 
                        ? "text-green-600" 
                        : "text-red-600"
                    }`}>
                      {typedStats.comparisons.ordersCount.percentChange >= 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )} 
                      {Math.abs(typedStats.comparisons.ordersCount.percentChange)}%
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      from last {period}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">No previous data for comparison</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Revenue</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatCurrency(typedStats?.totalSales || 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="text-green-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center">
                {statsLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : typedStats?.comparisons?.totalSales ? (
                  <>
                    <span className={`text-xs font-medium flex items-center ${
                      typedStats.comparisons.totalSales.percentChange >= 0 
                        ? "text-green-600" 
                        : "text-red-600"
                    }`}>
                      {typedStats.comparisons.totalSales.percentChange >= 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )} 
                      {Math.abs(typedStats.comparisons.totalSales.percentChange)}%
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      from last {period}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">No previous data for comparison</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profit Card */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-500">Profit</p>
                    <Link href="/cost-management">
                      <Button variant="link" size="sm" className="text-primary-600 font-medium flex items-center p-0 h-auto">
                        View More
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Button>
                    </Link>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatCurrency(typedStats?.profit || 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-blue-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  {statsLoading ? (
                    <Skeleton className="h-3 w-16" />
                  ) : typedStats?.comparisons?.profit ? (
                    <>
                      <span className={`text-xs font-medium flex items-center ${
                        typedStats.comparisons.profit.percentChange >= 0 
                          ? "text-green-600" 
                          : "text-red-600"
                      }`}>
                        {typedStats.comparisons.profit.percentChange >= 0 ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )} 
                        {Math.abs(typedStats.comparisons.profit.percentChange)}%
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        from last {period}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">No previous data for comparison</span>
                  )}
                </div>
                {!statsLoading && typedStats?.totalSales ? (
                  <span className="text-xs font-medium text-blue-600 flex items-center">
                    <PercentSquare className="h-3 w-3 mr-1" />
                    {(
                      (typedStats.profit / typedStats.totalSales) *
                      100
                    ).toFixed(1)}
                    % margin
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Discounts Card */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Discounts</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatCurrency(typedStats?.discounts?.amount || 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Tag className="text-purple-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs font-medium text-purple-600 flex items-center">
                    <PercentSquare className="h-3 w-3 mr-1" />
                    {typedStats?.discounts?.percentage
                      ? (typedStats.discounts.percentage * 100).toFixed(1) + "%"
                      : "0%"}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    of total sales
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            Recent Orders
          </h3>
          <Link href="/view-orders">
            <span className="text-sm font-medium text-primary-600 hover:text-primary-800 black">
              View All
            </span>
          </Link>
        </div>

        {ordersLoading ? (
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : (
          <>
            <DataTable
              data={typedOrders?.slice(0, 5) || []}
              columns={orderColumns}
              pagination={false}
              searchable={false}
            />
            
            {selectedOrders.length > 0 && (
              <div className="mt-4 flex gap-2 items-center">
                <p className="text-sm text-gray-600">
                  {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex-1"></div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="flex items-center bg-gray-200 text-gray-800 border border-gray-300 hover:bg-gray-300"
                      disabled={isChangingStatus}
                    >
                      Change Status
                      {isChangingStatus && <span className="ml-2 animate-spin">⟳</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-2">
                      <Button
                        variant="ghost" className="flex w-full items-center justify-start hover:bg-gray-100 text-gray-800"
                        onClick={async () => {
                          setIsChangingStatus(true);
                          try {
                            for (const id of selectedOrders) {
                              await updateOrderStatus.mutateAsync({ id, status: "pending" });
                            }
                            setSelectedOrders([]);
                            toast({
                              title: "Status updated",
                              description: `${selectedOrders.length} orders marked as pending.`,
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update some order statuses.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsChangingStatus(false);
                          }
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Mark as Pending</span>
                      </Button>
                      <Button
                        variant="ghost" className="flex w-full items-center justify-start hover:bg-gray-100 text-gray-800"
                        onClick={async () => {
                          setIsChangingStatus(true);
                          try {
                            for (const id of selectedOrders) {
                              await updateOrderStatus.mutateAsync({ id, status: "delivering" });
                            }
                            setSelectedOrders([]);
                            toast({
                              title: "Status updated",
                              description: `${selectedOrders.length} orders marked as delivering.`,
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update some order statuses.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsChangingStatus(false);
                          }
                        }}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        <span>Mark as Delivering</span>
                      </Button>
                      <Button
                        variant="ghost" className="flex w-full items-center justify-start hover:bg-gray-100 text-gray-800"
                        onClick={async () => {
                          setIsChangingStatus(true);
                          try {
                            for (const id of selectedOrders) {
                              await updateOrderStatus.mutateAsync({ id, status: "delivered" });
                            }
                            setSelectedOrders([]);
                            toast({
                              title: "Status updated",
                              description: `${selectedOrders.length} orders marked as delivered.`,
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update some order statuses.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsChangingStatus(false);
                          }
                        }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>Mark as Delivered</span>
                      </Button>
                      <Button
                        variant="ghost" className="flex w-full items-center justify-start hover:bg-gray-100 text-gray-800"
                        onClick={async () => {
                          setIsChangingStatus(true);
                          try {
                            for (const id of selectedOrders) {
                              await updateOrderStatus.mutateAsync({ id, status: "reactionary" });
                            }
                            setSelectedOrders([]);
                            toast({
                              title: "Status updated",
                              description: `${selectedOrders.length} orders marked as reactionary.`,
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update some order statuses.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsChangingStatus(false);
                          }
                        }}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        <span>Mark as Reactionary</span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                  onClick={() => setSelectedOrders([])}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sales Analytics */}
      {/* Order Status Overview */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Order Status Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 dashboard-grid">
          {/* Pending Orders */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Pending</h4>
                  <p className="text-xs text-gray-500">Awaiting processing</p>
                </div>
              </div>

              {statsLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-gray-800">
                  {typedStats?.ordersByStatus?.find(
                    (s) => s.status === "pending",
                  )?.count || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Delivering Orders */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <Truck className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Delivering</h4>
                  <p className="text-xs text-gray-500">
                    In transit to customer
                  </p>
                </div>
              </div>

              {statsLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-gray-800">
                  {typedStats?.ordersByStatus?.find(
                    (s) => s.status === "delivering",
                  )?.count || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Delivered Orders */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Delivered</h4>
                  <p className="text-xs text-gray-500">
                    Successfully completed
                  </p>
                </div>
              </div>

              {statsLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-gray-800">
                  {typedStats?.ordersByStatus?.find(
                    (s) => s.status === "delivered",
                  )?.count || 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Returned Orders */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <RefreshCcw className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Reactionary</h4>
                  <p className="text-xs text-gray-500">Returned orders</p>
                </div>
              </div>

              {statsLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-gray-800">
                  {(typedStats?.ordersByStatus?.find(
                    (s) => s.status === "returned",
                  )?.count || 0) +
                    (typedStats?.ordersByStatus?.find(
                      (s) => s.status === "reactionary",
                    )?.count || 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Analytics */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            Sales Analytics
          </h3>
          <Select defaultValue={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 7 days</SelectItem>
              <SelectItem value="week">Last 30 days</SelectItem>
              <SelectItem value="month">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 dashboard-grid">
          {/* Sales Chart */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-500">
                  Sales Overview
                </h4>
                <Link href="/historical-sales">
                  <Button variant="link" size="sm" className="text-primary-600 font-medium flex items-center">
                    View More
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </Link>
              </div>
              <div className="h-64">
                {statsLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <Chart
                    data={dailySalesByDay}
                    categories={["sales"]}
                    index="name"
                    colors={["#3b82f6"]}
                    valueFormatter={(value: number) => `${value.toLocaleString()} DA`}
                    yAxisWidth={75}
                    chartType="bar"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Best Selling Books */}
          <Card className="dashboard-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-500">
                  Best Selling Books
                </h4>
                <Link href="/books">
                  <Button variant="link" size="sm" className="text-primary-600 font-medium flex items-center">
                    View More
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </Link>
              </div>
              {statsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {typedStats?.bestSellingBooks?.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded flex-shrink-0 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {item.book.title}
                          </p>
                          <p className="text-sm font-medium text-gray-500">
                            {item.soldCount} sold
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, (item.soldCount / (typedStats?.bestSellingBooks?.[0]?.soldCount || 1)) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!typedStats?.bestSellingBooks ||
                    typedStats.bestSellingBooks.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      <BarChartIcon className="h-10 w-10 mx-auto text-blue-300 mb-2" />
                      <p>No sales data available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders by Wilaya */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            Orders by Wilaya
          </h3>
          <Link href="/orders">
            <Button variant="outline" size="sm" className="flex items-center">
              View More
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </Link>
        </div>
        <Card className="dashboard-card">
          <CardContent className="p-4 sm:p-5">
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {typedStats?.ordersByWilaya?.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.wilayaName} ({item.wilayaId})
                        </p>
                        <p className="text-sm font-medium text-gray-500">
                          {item.count} orders
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, (item.count / (typedStats?.ordersByWilaya?.[0]?.count || 1)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}

                {(!typedStats?.ordersByWilaya ||
                  typedStats.ordersByWilaya.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <MapPin className="h-10 w-10 mx-auto text-blue-300 mb-2" />
                    <p>No orders by wilaya data available</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
