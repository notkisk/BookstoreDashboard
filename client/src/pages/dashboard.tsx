import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  MapPin
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface DashboardStats {
  ordersCount: number;
  totalSales: number;
  profit: number;
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
}

interface Order {
  id: number;
  reference: string;
  customerId: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  customer?: {
    name: string;
    phone: string;
  };
  items?: {
    book: {
      title: string;
    };
    quantity: number;
  }[];
}

export default function Dashboard() {
  const [period, setPeriod] = useState<string>("week");

  // Fetch dashboard analytics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/analytics/dashboard?period=${period}`],
  });

  // Fetch recent orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders'],
  });

  // Safe casting
  const typedStats = stats as DashboardStats | undefined;
  const typedOrders = orders as Order[] | undefined;

  // Transform data for the chart
  const salesData = [
    { name: "Mon", sales: 1200 },
    { name: "Tue", sales: 1900 },
    { name: "Wed", sales: 1500 },
    { name: "Thu", sales: 2400 },
    { name: "Fri", sales: 2100 },
    { name: "Sat", sales: 3000 },
    { name: "Sun", sales: 2500 },
  ];

  const queryClient = useQueryClient();

  // Create a mutation for updating order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest<any>(
        'PATCH',
        `/api/orders/${id}/status`,
        { status }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
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
    }
  });

  // Define order columns for the data table
  const orderColumns = [
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
        return order.items.map(item => item.book.title).join(", ");
      },
    },
    {
      header: "Total",
      accessorKey: "totalAmount" as const,
      cell: (order: Order) => formatCurrency(order.totalAmount),
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
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
          order.status === 'delivering' ? 'bg-yellow-100 text-yellow-800' :
          order.status === 'returned' || order.status === 'reactionary' ? 'bg-red-100 text-red-800' : 
          order.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
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
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'pending' })}
              disabled={order.status === 'pending' || updateOrderStatus.isPending}
            >
              <Clock className="mr-2 h-4 w-4" />
              <span>Mark as Pending</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'delivering' })}
              disabled={order.status === 'delivering' || updateOrderStatus.isPending}
            >
              <Truck className="mr-2 h-4 w-4" />
              <span>Mark as Delivering</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'delivered' })}
              disabled={order.status === 'delivered' || updateOrderStatus.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Mark as Delivered</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'reactionary' })}
              disabled={order.status === 'reactionary' || updateOrderStatus.isPending}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Books Card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Books</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">
                      {typedStats?.bestSellingBooks?.length || 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <BookOpen className="text-primary-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center">
                <span className="text-xs font-medium text-green-600 flex items-center">
                  <ArrowUp className="h-3 w-3" /> 12%
                </span>
                <span className="text-xs text-gray-500 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Orders Card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
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
                <span className="text-xs font-medium text-green-600 flex items-center">
                  <ArrowUp className="h-3 w-3" /> 7%
                </span>
                <span className="text-xs text-gray-500 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card>
            <CardContent className="p-5">
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
                <span className="text-xs font-medium text-green-600 flex items-center">
                  <ArrowUp className="h-3 w-3" /> 23%
                </span>
                <span className="text-xs text-gray-500 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Profit Card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Profit</p>
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
              <div className="mt-2 flex items-center">
                <span className="text-xs font-medium text-green-600 flex items-center">
                  <ArrowUp className="h-3 w-3" /> 18%
                </span>
                <span className="text-xs text-gray-500 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">Recent Orders</h3>
          <a href="/orders" className="text-sm font-medium text-primary-600 hover:text-primary-800">
            View All
          </a>
        </div>
        
        {ordersLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : (
          <DataTable
            data={typedOrders?.slice(0, 5) || []}
            columns={orderColumns}
            pagination={false}
            searchable={false}
          />
        )}
      </div>

      {/* Sales Analytics */}
      {/* Order Status Overview */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Order Status Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pending Orders */}
          <Card>
            <CardContent className="p-5">
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
                  {typedStats?.ordersByStatus?.find(s => s.status === 'pending')?.count || 0}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Delivering Orders */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <Truck className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Delivering</h4>
                  <p className="text-xs text-gray-500">In transit to customer</p>
                </div>
              </div>
              
              {statsLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-gray-800">
                  {typedStats?.ordersByStatus?.find(s => s.status === 'delivering')?.count || 0}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Delivered Orders */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Delivered</h4>
                  <p className="text-xs text-gray-500">Successfully completed</p>
                </div>
              </div>
              
              {statsLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-gray-800">
                  {typedStats?.ordersByStatus?.find(s => s.status === 'delivered')?.count || 0}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Returned Orders */}
          <Card>
            <CardContent className="p-5">
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
                  {(typedStats?.ordersByStatus?.find(s => s.status === 'returned')?.count || 0) +
                   (typedStats?.ordersByStatus?.find(s => s.status === 'reactionary')?.count || 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Analytics */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-800">Sales Analytics</h3>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Card>
            <CardContent className="p-5">
              <h4 className="text-sm font-medium text-gray-500 mb-4">Sales Overview</h4>
              <div className="h-64">
                {statsLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <Chart 
                    data={salesData} 
                    categories={["sales"]}
                    index="name"
                    colors={["#3b82f6"]}
                    valueFormatter={(value: number) => `${value} DA`}
                    yAxisWidth={65}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Best Selling Books */}
          <Card>
            <CardContent className="p-5">
              <h4 className="text-sm font-medium text-gray-500 mb-4">Best Selling Books</h4>
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
                              width: `${Math.min(100, (item.soldCount / (typedStats?.bestSellingBooks?.[0]?.soldCount || 1)) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!typedStats?.bestSellingBooks || typedStats.bestSellingBooks.length === 0) && (
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
        <h3 className="text-base font-semibold text-gray-800 mb-4">Orders by Wilaya</h3>
        <Card>
          <CardContent className="p-5">
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
                            width: `${Math.min(100, (item.count / (typedStats?.ordersByWilaya?.[0]?.count || 1)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!typedStats?.ordersByWilaya || typedStats.ordersByWilaya.length === 0) && (
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
