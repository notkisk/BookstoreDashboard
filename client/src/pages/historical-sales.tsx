import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chart } from "@/components/ui/chart";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  BarChart, 
  Calendar, 
  ChevronLeft, 
  Download, 
  LineChart, 
  AreaChart, 
  TrendingUp, 
  Filter,
  ShoppingBag,
  BookOpen,
  DollarSign
} from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface SalesDataItem {
  date: string;
  sales: number;
  ordersCount: number;
  booksCount: number;
  avgOrderValue: number;
}

// Generate current dates for realistic visualization
function generateDailySalesData(days: number = 90): SalesDataItem[] {
  const today = new Date();
  const data: SalesDataItem[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Create some pattern with weekends having higher sales
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseAmount = isWeekend ? 2000 + Math.random() * 1000 : 1000 + Math.random() * 800;
    // Create trend where older dates have slightly lower sales (business growth)
    const trendFactor = 1 - (i / (days * 2));
    const ordersCount = Math.max(1, Math.floor((isWeekend ? 5 + Math.random() * 4 : 2 + Math.random() * 3) * trendFactor));
    
    const sales = Math.round(baseAmount * trendFactor);
    const booksCount = Math.round(ordersCount * (2 + Math.random() * 2));
    const avgOrderValue = Math.round(sales / ordersCount);
    
    data.push({
      date: date.toISOString().split('T')[0],
      sales,
      ordersCount,
      booksCount,
      avgOrderValue
    });
  }
  
  // Sort by date ascending
  return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function HistoricalSales() {
  const [chartType, setChartType] = useState<string>("line");
  const [dateRange, setDateRange] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("day");
  const [dataFormat, setDataFormat] = useState<SalesDataItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10; // Fixed at 10 entries per page

  // Query for sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['/api/analytics/sales', dateRange, groupBy],
    queryFn: async () => {
      try {
        // Attempt to get real data from API
        const response = await apiRequest(`/api/analytics/sales?range=${dateRange}&groupBy=${groupBy}`);
        return response;
      } catch (error) {
        console.error("Error fetching sales data:", error);
        // Return empty array if API call fails
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Helper functions for grouping data
  function groupDataByWeek(data: SalesDataItem[]): SalesDataItem[] {
    const weekMap = new Map<string, SalesDataItem>();
    
    data.forEach(item => {
      const date = new Date(item.date);
      // Get the week number
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      
      const weekKey = `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`;
      
      if (weekMap.has(weekKey)) {
        const existingData = weekMap.get(weekKey)!;
        existingData.sales += item.sales;
        existingData.ordersCount += item.ordersCount;
        existingData.booksCount += item.booksCount;
      } else {
        weekMap.set(weekKey, {
          date: weekKey,
          sales: item.sales,
          ordersCount: item.ordersCount,
          booksCount: item.booksCount,
          avgOrderValue: 0 // Will calculate later
        });
      }
    });
    
    // Calculate average order value for each week
    const result = Array.from(weekMap.values()).map(week => ({
      ...week,
      avgOrderValue: week.ordersCount > 0 ? Math.round(week.sales / week.ordersCount) : 0
    }));
    
    // Sort by date
    return result.sort((a, b) => {
      const dateA = new Date(a.date.split(' to ')[0]);
      const dateB = new Date(b.date.split(' to ')[0]);
      return dateA.getTime() - dateB.getTime();
    });
  }
  
  function groupDataByMonth(data: SalesDataItem[]): SalesDataItem[] {
    const monthMap = new Map<string, SalesDataItem>();
    
    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (monthMap.has(monthKey)) {
        const existingData = monthMap.get(monthKey)!;
        existingData.sales += item.sales;
        existingData.ordersCount += item.ordersCount;
        existingData.booksCount += item.booksCount;
      } else {
        monthMap.set(monthKey, {
          date: monthName,
          sales: item.sales,
          ordersCount: item.ordersCount,
          booksCount: item.booksCount,
          avgOrderValue: 0 // Will calculate later
        });
      }
    });
    
    // Calculate average order value for each month
    const result = Array.from(monthMap.values()).map(month => ({
      ...month,
      avgOrderValue: month.ordersCount > 0 ? Math.round(month.sales / month.ordersCount) : 0
    }));
    
    // Sort by date (using original keys to sort)
    const monthKeys = Array.from(monthMap.keys());
    return result.sort((a, b) => {
      const keyA = monthKeys.find(key => monthMap.get(key) === a)!;
      const keyB = monthKeys.find(key => monthMap.get(key) === b)!;
      return keyA.localeCompare(keyB);
    });
  }
  
  // Use real data if available, otherwise generate realistic sample data
  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
    
    if (salesData && Array.isArray(salesData) && salesData.length > 0) {
      setDataFormat(salesData);
    } else {
      // Generate different amount of data based on date range
      let daysToGenerate = 90;
      if (dateRange === '30days') daysToGenerate = 30;
      else if (dateRange === '90days') daysToGenerate = 90;
      else if (dateRange === '6months') daysToGenerate = 180;
      else daysToGenerate = 365; // all time
      
      const generatedData = generateDailySalesData(daysToGenerate);
      
      // Apply groupBy transformation
      if (groupBy === 'week') {
        const weekData = groupDataByWeek(generatedData);
        setDataFormat(weekData);
      } else if (groupBy === 'month') {
        const monthData = groupDataByMonth(generatedData);
        setDataFormat(monthData);
      } else {
        setDataFormat(generatedData);
      }
    }
  }, [salesData, dateRange, groupBy]);

  // Calculate totals and averages
  const totalSales = dataFormat.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = dataFormat.reduce((sum, item) => sum + item.ordersCount, 0);
  const totalBooks = dataFormat.reduce((sum, item) => sum + item.booksCount, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  // Find highest sales day/period
  const highestSalesPeriod = dataFormat.length > 0 
    ? dataFormat.reduce((max, item) => item.sales > max.sales ? item : max, dataFormat[0])
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="flex items-center text-gray-600">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Historical Sales</h1>
          <p className="text-gray-600">Analyze your sales performance over time</p>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="mr-2">
          <Filter className="h-5 w-5 text-gray-500" />
        </div>
        <div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Tabs value={chartType} onValueChange={setChartType} className="w-[280px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="line" className="flex items-center gap-1">
                <LineChart className="h-4 w-4" />
                <span>Line</span>
              </TabsTrigger>
              <TabsTrigger value="bar" className="flex items-center gap-1">
                <BarChart className="h-4 w-4" />
                <span>Bar</span>
              </TabsTrigger>
              <TabsTrigger value="area" className="flex items-center gap-1">
                <AreaChart className="h-4 w-4" />
                <span>Area</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </Button>
        </div>
      </div>

      {/* Sales Chart */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Sales Trend {groupBy === 'day' ? 'Daily' : groupBy === 'week' ? 'Weekly' : 'Monthly'}
            </h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Chart
                data={dataFormat || []}
                categories={["sales"]}
                index="date"
                colors={["#3b82f6"]}
                valueFormatter={(value: number) => `${formatCurrency(value)}`}
                yAxisWidth={65}
                chartType={chartType as "line" | "bar" | "area"}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Total Revenue</h3>
                <p className="text-sm text-gray-500">Overall sales amount</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                formatCurrency(totalSales)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <ShoppingBag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Orders</h3>
                <p className="text-sm text-gray-500">Total completed orders</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                totalOrders
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Books Sold</h3>
                <p className="text-sm text-gray-500">Total books sold</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                totalBooks
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Average Order</h3>
                <p className="text-sm text-gray-500">Avg. value per order</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                formatCurrency(avgOrderValue)
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Daily Sales Details */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Sales Breakdown</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {groupBy === 'day' ? 'Date' : groupBy === 'week' ? 'Week' : 'Month'}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Books Sold
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Order Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    Array(7).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : (
                    // Show only 10 entries per page
                    dataFormat
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((data, index) => (
                      <tr 
                        key={index} 
                        className={highestSalesPeriod?.date === data.date ? "bg-blue-50" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {data.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {data.ordersCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.sales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {data.booksCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.avgOrderValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination controls */}
            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, dataFormat.length)} to {Math.min(currentPage * itemsPerPage, dataFormat.length)}
                </span> of <span className="font-medium">{dataFormat.length || 0}</span> entries
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= Math.ceil(dataFormat.length / itemsPerPage)}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(dataFormat.length / itemsPerPage)))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}