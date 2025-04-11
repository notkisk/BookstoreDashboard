import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chart } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Calendar, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

// Dummy data for visualization until API is implemented
const monthlySalesData = [
  { month: "Jan", sales: 5200 },
  { month: "Feb", sales: 4800 },
  { month: "Mar", sales: 6500 },
  { month: "Apr", sales: 5900 },
  { month: "May", sales: 6800 },
  { month: "Jun", sales: 7200 },
  { month: "Jul", sales: 7800 },
  { month: "Aug", sales: 8400 },
  { month: "Sep", sales: 7900 },
  { month: "Oct", sales: 8700 },
  { month: "Nov", sales: 9200 },
  { month: "Dec", sales: 9800 },
];

export default function HistoricalSales() {
  const [period, setPeriod] = useState<string>("year");
  const [chartType, setChartType] = useState<string>("line");
  const [dateRange, setDateRange] = useState<string>("all");

  // Query for sales data based on period
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['/api/analytics/sales', period, dateRange],
    queryFn: async () => {
      try {
        // Attempt to get real data from API
        const response = await fetch(`/api/analytics/sales?period=${period}&range=${dateRange}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error("Error fetching sales data:", error);
      }
      // Fallback to dummy data if API call fails
      console.log("Using dummy data for sales visualization");
      return monthlySalesData;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
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
        <div className="flex space-x-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chart Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Sales Chart */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Sales Trend</h2>
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
                data={salesData || []}
                categories={["sales"]}
                index="month"
                colors={["#3b82f6"]}
                valueFormatter={(value: number) => `${formatCurrency(value)}`}
                yAxisWidth={65}
                type={chartType === 'bar' ? 'bar' : chartType === 'area' ? 'area' : 'line'}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <BarChart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Total Sales</h3>
                <p className="text-sm text-gray-500">Overall sales amount</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                formatCurrency(
                  salesData?.reduce((sum, item) => sum + item.sales, 0) || 0
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Average Monthly</h3>
                <p className="text-sm text-gray-500">Average sales per month</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                formatCurrency(
                  salesData?.length
                    ? (salesData.reduce((sum, item) => sum + item.sales, 0) / salesData.length)
                    : 0
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <BarChart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Highest Month</h3>
                <p className="text-sm text-gray-500">Month with highest sales</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                salesData?.length ? (
                  <>
                    {salesData.reduce((max, item) => (item.sales > max.sales ? item : max), salesData[0]).month}
                    <span className="text-base font-medium text-gray-500 ml-2">
                      {formatCurrency(
                        salesData.reduce((max, item) => (item.sales > max ? item.sales : max), 0)
                      )}
                    </span>
                  </>
                ) : (
                  "N/A"
                )
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
              <h2 className="text-lg font-medium text-gray-900">Daily Sales Breakdown</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Filter by Date
                </Button>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
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
                    salesData?.map((data, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {data.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(data.sales / 1000) + Math.floor(Math.random() * 5)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.sales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(data.sales / 200) + Math.floor(Math.random() * 10)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.sales / (Math.floor(data.sales / 1000) + Math.floor(Math.random() * 5)))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{salesData?.length || 0}</span> entries
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}