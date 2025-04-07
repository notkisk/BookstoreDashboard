import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  BarChart as BarChartIcon
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";

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
          order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
          order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
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
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-purple-600" />
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
      <div>
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
                    colors={["#e4d1b3"]}
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
                      <div className="h-10 w-10 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-gray-500" />
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
                            className="bg-primary-400 h-2 rounded-full" 
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
                      <BarChartIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                      <p>No sales data available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
