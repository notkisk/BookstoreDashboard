import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PlusCircle, 
  Trash2, 
  ChevronLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PercentCircle,
  Package,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Definition of a cost item with support for per-order costs
interface CostItem {
  id: string;
  name: string;
  amount: number;
  type: "fixed" | "variable" | "per-order";
  date: string;
  orderCount?: number; // For per-order costs
  autoTrack?: boolean; // Whether to automatically track delivered orders
}

// Monthly data interface
interface MonthlyData {
  month: string;
  costs: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  editable?: boolean;
}

export default function CostManagement() {
  const { toast } = useToast();
  // Sample initial costs
  const [costs, setCosts] = useState<CostItem[]>([
    { id: "1", name: "Rent", amount: 25000, type: "fixed", date: "2025-04-01" },
    { id: "2", name: "Utilities", amount: 5000, type: "variable", date: "2025-04-05" },
    { id: "3", name: "Staff Salaries", amount: 60000, type: "fixed", date: "2025-04-10" },
    { id: "4", name: "Marketing", amount: 15000, type: "variable", date: "2025-04-15" },
    { id: "5", name: "Shipping per Order", amount: 500, type: "per-order", date: "2025-04-20", orderCount: 40, autoTrack: true },
  ]);
  
  // Tab state for month selection
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  
  // New cost state
  const [newCost, setNewCost] = useState<Omit<CostItem, "id">>({
    name: "",
    amount: 0,
    type: "fixed",
    date: new Date().toISOString().split('T')[0],
  });
  
  // For per-order costs
  const [orderCount, setOrderCount] = useState<number>(0);
  
  // Fetch orders data, including delivered orders only for revenue
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/analytics/dashboard', {
          method: 'GET'
        });
        return response || { ordersCount: 0, totalSales: 0, profit: 0 };
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return { ordersCount: 0, totalSales: 0, profit: 0 };
      }
    }
  });
  
  // Fetch all orders to get delivered count
  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/orders', {
          method: 'GET'
        });
        // Filter for delivered orders
        const deliveredOrders = Array.isArray(response) 
          ? response.filter(order => order.status === 'delivered')
          : [];
        return {
          total: Array.isArray(response) ? response.length : 0,
          delivered: deliveredOrders.length
        };
      } catch (error) {
        console.error("Error fetching orders:", error);
        return { total: 0, delivered: 0 };
      }
    }
  });
  
  // Filter costs by selected month if a month is selected
  const filteredCosts = activeTab === "all" 
    ? costs 
    : costs.filter(cost => cost.date.startsWith(selectedMonth));
  
  // Summary calculations based on filtered costs
  const calculateTotalAmount = (cost: CostItem): number => {
    if (cost.type === "per-order" && cost.orderCount) {
      return cost.amount * cost.orderCount;
    }
    return cost.amount;
  };
  
  const totalCosts = filteredCosts.reduce((sum, cost) => sum + calculateTotalAmount(cost), 0);
  const fixedCosts = filteredCosts
    .filter(cost => cost.type === "fixed")
    .reduce((sum, cost) => sum + cost.amount, 0);
  const variableCosts = filteredCosts
    .filter(cost => cost.type === "variable")
    .reduce((sum, cost) => sum + cost.amount, 0);
  const perOrderCosts = filteredCosts
    .filter(cost => cost.type === "per-order")
    .reduce((sum, cost) => sum + calculateTotalAmount(cost), 0);
  
  // Real revenue and profit from dashboard data (only counting delivered orders)
  const revenue = dashboardData?.totalSales || 0;
  const profit = revenue - totalCosts;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
  
  // Generate monthly data array with initial values
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Create empty monthly data structure with current month having actual cost data
  const generateInitialMonthlyData = () => {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();
    
    return allMonths.map((month, index) => {
      // Current month gets actual cost data, others get 0
      if (index === currentMonthIndex) {
        return {
          month,
          costs: totalCosts,
          revenue: revenue,
          profit: profit,
          profitMargin: profitMargin,
          editable: true
        };
      } else {
        return {
          month,
          costs: 0,
          revenue: 0, 
          profit: 0,
          profitMargin: 0,
          editable: true
        };
      }
    });
  };
  
  const [monthlyData, setMonthlyData] = useState<(MonthlyData & { editable?: boolean })[]>(generateInitialMonthlyData());

  const handleAddCost = () => {
    if (!newCost.name) {
      toast({
        title: "Error",
        description: "Please enter a cost name.",
        variant: "destructive",
      });
      return;
    }

    if (newCost.amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    
    // For per-order costs, validate order count
    if (newCost.type === "per-order" && orderCount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid order count for per-order costs.",
        variant: "destructive",
      });
      return;
    }

    const costItem: CostItem = {
      ...newCost,
      id: Date.now().toString(),
    };
    
    // Add order count for per-order costs
    if (newCost.type === "per-order") {
      costItem.orderCount = orderCount;
    }

    setCosts([...costs, costItem]);
    
    // Reset form
    setNewCost({
      name: "",
      amount: 0,
      type: "fixed",
      date: new Date().toISOString().split('T')[0],
    });
    setOrderCount(0);

    toast({
      title: "Cost Added",
      description: `${costItem.name} has been added to your costs.`,
    });
  };

  const handleDeleteCost = (id: string) => {
    setCosts(costs.filter(cost => cost.id !== id));
    toast({
      title: "Cost Deleted",
      description: "The cost has been removed from your list.",
    });
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Cost Management</h1>
          <p className="text-gray-600">Track and analyze your business expenses</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-2 w-[250px]">
              <TabsTrigger value="all" className="flex items-center text-sm">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                All Time
              </TabsTrigger>
              <TabsTrigger value="month" className="flex items-center text-sm">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                By Month
              </TabsTrigger>
            </TabsList>
            {activeTab === "month" && (
              <div className="mt-2">
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full h-9 text-sm"
                />
              </div>
            )}
          </Tabs>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Total Revenue</h3>
                <p className="text-sm text-gray-500">Gross sales amount</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(revenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Total Costs</h3>
                <p className="text-sm text-gray-500">All business expenses</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalCosts)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Net Profit</h3>
                <p className="text-sm text-gray-500">Revenue - Total Costs</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(profit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <PercentCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Profit Margin</h3>
                <p className="text-sm text-gray-500">Net profit percentage</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {profitMargin.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="font-medium">{cost.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            cost.type === "fixed" 
                              ? "bg-blue-100 text-blue-800" 
                              : cost.type === "variable"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-800"
                          }`}>
                            {cost.type === "fixed" 
                              ? "Fixed" 
                              : cost.type === "variable" 
                                ? "Variable" 
                                : "Per-Order"}
                          </span>
                        </TableCell>
                        <TableCell>{cost.date}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cost.amount)}
                          {cost.type === "per-order" && cost.orderCount && (
                            <div className="text-xs text-gray-500">
                              {cost.orderCount} orders × {formatCurrency(cost.amount)} = {formatCurrency(cost.amount * cost.orderCount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteCost(cost.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCosts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                          {activeTab === "month" 
                            ? `No costs found for ${selectedMonth}. Try selecting a different month or add new costs.`
                            : "No costs added yet. Add your first cost below."
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add New Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="costName" className="text-sm">Cost Name</Label>
                  <Input 
                    id="costName" 
                    placeholder="Rent, Utilities, etc."
                    className="h-9 text-sm"
                    value={newCost.name}
                    onChange={(e) => setNewCost({...newCost, name: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="costAmount" className="text-sm">Amount (DZD)</Label>
                  <Input 
                    id="costAmount" 
                    type="number"
                    placeholder="0.00"
                    className="h-9 text-sm"
                    value={newCost.amount || ""}
                    onChange={(e) => setNewCost({...newCost, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="costType" className="text-sm">Cost Type</Label>
                  <select
                    id="costType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newCost.type}
                    onChange={(e) => setNewCost({...newCost, type: e.target.value as "fixed" | "variable" | "per-order"})}
                  >
                    <option value="fixed">Fixed Cost</option>
                    <option value="variable">Variable Cost</option>
                    <option value="per-order">Per-Order Cost</option>
                  </select>
                </div>

                {/* Show order count input only for per-order costs */}
                {newCost.type === "per-order" && (
                  <div>
                    <Label htmlFor="orderCount" className="text-sm">Number of Orders</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="orderCount" 
                        type="number"
                        placeholder="Number of orders"
                        className="h-9 text-sm"
                        value={orderCount || ""}
                        onChange={(e) => setOrderCount(parseInt(e.target.value) || 0)}
                      />
                      <div className="text-sm text-gray-500 whitespace-nowrap">
                        <span className="font-medium">Total: </span>
                        {formatCurrency(newCost.amount * (orderCount || 0))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <div>Total orders: {ordersData?.total || 0}</div>
                      <div>Delivered orders: {ordersData?.delivered || 0}</div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="costDate" className="text-sm">Date</Label>
                  <Input 
                    id="costDate" 
                    type="date"
                    className="h-9 text-sm"
                    value={newCost.date}
                    onChange={(e) => setNewCost({...newCost, date: e.target.value})}
                  />
                </div>

                <Button 
                  className="w-full h-16 mt-4 text-sm" 
                  onClick={handleAddCost}
                >
                  <PlusCircle className="mr-2 h-3.5 w-3.5" />
                  Add Cost
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fixed Costs:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variable Costs:</span>
                  <span className="font-medium">{formatCurrency(variableCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Per-Order Costs:</span>
                  <span className="font-medium">{formatCurrency(perOrderCosts)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="font-medium">Total Costs:</span>
                  <span className="font-bold">{formatCurrency(totalCosts)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Cost Analysis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Monthly Cost Analysis</CardTitle>
          <p className="text-sm text-gray-500">Review your cost breakdown, revenue, and profit margin by month</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Costs</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Profit Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((item, index) => (
                  <TableRow key={item.month}>
                    <TableCell className="font-medium">{item.month}</TableCell>
                    <TableCell className="text-right">
                      {item.editable ? (
                        <Input 
                          type="number"
                          className="h-8 w-28 text-sm text-right"
                          value={item.costs || ""}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            const updatedData = [...monthlyData];
                            updatedData[index] = {
                              ...updatedData[index],
                              costs: newValue,
                              profit: updatedData[index].revenue - newValue,
                              profitMargin: updatedData[index].revenue > 0 
                                ? ((updatedData[index].revenue - newValue) / updatedData[index].revenue) * 100 
                                : 0
                            };
                            setMonthlyData(updatedData);
                          }}
                        />
                      ) : (
                        formatCurrency(item.costs)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.editable ? (
                        <Input 
                          type="number"
                          className="h-8 w-28 text-sm text-right"
                          value={item.revenue || ""}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            const updatedData = [...monthlyData];
                            updatedData[index] = {
                              ...updatedData[index],
                              revenue: newValue,
                              profit: newValue - updatedData[index].costs,
                              profitMargin: newValue > 0 
                                ? ((newValue - updatedData[index].costs) / newValue) * 100 
                                : 0
                            };
                            setMonthlyData(updatedData);
                          }}
                        />
                      ) : (
                        formatCurrency(item.revenue)
                      )}
                    </TableCell>
                    <TableCell className={`text-right ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(item.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.revenue > 0 ? `${item.profitMargin.toFixed(2)}%` : '0.00%'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-md border border-gray-200">
            <p><strong>Interactive Monthly Analysis:</strong> Enter your estimated costs and revenue for each month to see projected profits and margins. The current month shows actual data from your added costs.</p>
            <p className="mt-1">Tip: Use this tool to plan your business finances and set monthly targets.</p>
          </div>
        </CardContent>
      </Card>
A
      {/* Tips and Information */}
      <Alert className="bg-blue-50 border-grey-200 mb-8">
        <AlertDescription className="text-grey-800">
          <h3 className="text-lg font-semibold mb-2">Cost Management Tips</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fixed costs are expenses that remain the same regardless of production volume, like rent and salaries.</li>
            <li>Variable costs change with production levels, like raw materials and delivery expenses.</li>
            <li>Per-order costs multiply based on the number of orders, like shipping or packaging costs.</li>
            <li>Keep track of all business expenses to ensure accurate profitability analysis.</li>
            <li>Review your costs regularly to identify opportunities for cost reduction.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}