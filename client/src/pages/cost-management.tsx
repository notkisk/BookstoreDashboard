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
}

// Monthly data interface
interface MonthlyData {
  month: string;
  costs: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export default function CostManagement() {
  const { toast } = useToast();
  // Sample initial costs
  const [costs, setCosts] = useState<CostItem[]>([
    { id: "1", name: "Rent", amount: 25000, type: "fixed", date: "2025-04-01" },
    { id: "2", name: "Utilities", amount: 5000, type: "variable", date: "2025-04-05" },
    { id: "3", name: "Staff Salaries", amount: 60000, type: "fixed", date: "2025-04-10" },
    { id: "4", name: "Marketing", amount: 15000, type: "variable", date: "2025-04-15" },
    { id: "5", name: "Shipping per Order", amount: 500, type: "per-order", date: "2025-04-20", orderCount: 40 },
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
  
  // Fetch orders count for reference
  const { data: ordersData } = useQuery({
    queryKey: ['ordersCount'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/analytics/dashboard', {
          method: 'GET'
        });
        return response.ordersCount || 0;
      } catch (error) {
        console.error("Error fetching orders count:", error);
        return 0;
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
  
  // Revenue and profit (mock data for now, would come from actual orders in a real implementation)
  const revenue = 350000;
  const profit = revenue - totalCosts;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
  
  // Generate monthly data for charts/reports
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([
    { month: "Jan", costs: 85000, revenue: 120000, profit: 35000, profitMargin: 29.17 },
    { month: "Feb", costs: 90000, revenue: 140000, profit: 50000, profitMargin: 35.71 },
    { month: "Mar", costs: 95000, revenue: 160000, profit: 65000, profitMargin: 40.63 },
    { month: "Apr", costs: totalCosts, revenue: revenue, profit: profit, profitMargin: profitMargin },
    { month: "May", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
    { month: "Jun", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
    { month: "Jul", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
    { month: "Aug", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
    { month: "Sep", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
    { month: "Oct", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
    { month: "Nov", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
    { month: "Dec", costs: 0, revenue: 0, profit: 0, profitMargin: 0 },
  ]);

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
                    {costs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                          No costs added yet. Add your first cost below.
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
                  <Label htmlFor="costName">Cost Name</Label>
                  <Input 
                    id="costName" 
                    placeholder="Rent, Utilities, etc."
                    value={newCost.name}
                    onChange={(e) => setNewCost({...newCost, name: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="costAmount">Amount (DZD)</Label>
                  <Input 
                    id="costAmount" 
                    type="number"
                    placeholder="0.00"
                    value={newCost.amount || ""}
                    onChange={(e) => setNewCost({...newCost, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="costType">Cost Type</Label>
                  <select
                    id="costType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label htmlFor="orderCount">Number of Orders</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="orderCount" 
                        type="number"
                        placeholder="Number of orders"
                        value={orderCount || ""}
                        onChange={(e) => setOrderCount(parseInt(e.target.value) || 0)}
                      />
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Total: </span>
                        {formatCurrency(newCost.amount * (orderCount || 0))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Current orders count: {ordersData || 0}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="costDate">Date</Label>
                  <Input 
                    id="costDate" 
                    type="date"
                    value={newCost.date}
                    onChange={(e) => setNewCost({...newCost, date: e.target.value})}
                  />
                </div>

                <Button 
                  className="w-full mt-4" 
                  onClick={handleAddCost}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
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

      {/* Tips and Information */}
      <Alert className="bg-blue-50 border-blue-200 mb-8">
        <AlertDescription className="text-blue-800">
          <h3 className="text-lg font-semibold mb-2">Cost Management Tips</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fixed costs are expenses that remain the same regardless of production volume, like rent and salaries.</li>
            <li>Variable costs change with production levels, like raw materials and delivery expenses.</li>
            <li>Keep track of all business expenses to ensure accurate profitability analysis.</li>
            <li>Review your costs regularly to identify opportunities for cost reduction.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}