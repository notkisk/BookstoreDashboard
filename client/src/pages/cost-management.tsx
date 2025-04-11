import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chart } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, ChevronLeft, DollarSign, Percent, ShoppingBag, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

// Dummy data for visualization until API is implemented
const profitData = [
  { month: "Jan", revenue: 5200, cost: 3100, profit: 2100 },
  { month: "Feb", revenue: 4800, cost: 2900, profit: 1900 },
  { month: "Mar", revenue: 6500, cost: 3800, profit: 2700 },
  { month: "Apr", revenue: 5900, cost: 3500, profit: 2400 },
  { month: "May", revenue: 6800, cost: 4000, profit: 2800 },
  { month: "Jun", revenue: 7200, cost: 4200, profit: 3000 },
  { month: "Jul", revenue: 7800, cost: 4500, profit: 3300 },
  { month: "Aug", revenue: 8400, cost: 4900, profit: 3500 },
  { month: "Sep", revenue: 7900, cost: 4600, profit: 3300 },
  { month: "Oct", revenue: 8700, cost: 5100, profit: 3600 },
  { month: "Nov", revenue: 9200, cost: 5400, profit: 3800 },
  { month: "Dec", revenue: 9800, cost: 5700, profit: 4100 },
];

export default function CostManagement() {
  const [period, setPeriod] = useState<string>("year");
  const [chartType, setChartType] = useState<string>("line");
  const [dateRange, setDateRange] = useState<string>("all");

  // Query for profit data based on period
  const { data, isLoading } = useQuery({
    queryKey: ['/api/analytics/profit', period, dateRange],
    queryFn: async () => {
      // In the future, this will fetch actual data from the API
      // For now, we're using our dummy data
      return profitData;
    },
  });

  // Calculate totals
  const totalRevenue = data?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const totalCost = data?.reduce((sum, item) => sum + item.cost, 0) || 0;
  const totalProfit = data?.reduce((sum, item) => sum + item.profit, 0) || 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

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
          <h1 className="text-2xl font-bold text-gray-900">Cost Management</h1>
          <p className="text-gray-600">Track your revenue, costs and profit margins</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Total Revenue</h3>
                <p className="text-sm text-gray-500">Gross sales amount</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                formatCurrency(totalRevenue)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <ShoppingBag className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Total Cost</h3>
                <p className="text-sm text-gray-500">Purchase costs</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                formatCurrency(totalCost)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Total Profit</h3>
                <p className="text-sm text-gray-500">Net earnings</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                formatCurrency(totalProfit)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Profit Margin</h3>
                <p className="text-sm text-gray-500">Percentage of revenue</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                `${profitMargin.toFixed(2)}%`
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Chart */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Profit Analysis</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                <span className="text-sm text-gray-600">Cost</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span className="text-sm text-gray-600">Profit</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Chart
                data={data || []}
                categories={["revenue", "cost", "profit"]}
                index="month"
                colors={["#3b82f6", "#ef4444", "#10b981"]}
                valueFormatter={(value: number) => `${formatCurrency(value)}`}
                yAxisWidth={65}
                type={chartType === 'bar' ? 'bar' : chartType === 'area' ? 'area' : 'line'}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Monthly Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Profit</th>
                  <th className="px-4 py-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                    </tr>
                  ))
                ) : (
                  data?.map((item, index) => {
                    const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.month}</td>
                        <td className="px-4 py-3">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.cost)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.profit)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${margin >= 30 ? 'bg-green-100 text-green-800' : margin >= 15 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {margin.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}