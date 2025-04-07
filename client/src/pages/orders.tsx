import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { 
  Plus, 
  FileText, 
  Search, 
  Filter 
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface Order {
  id: number;
  reference: string;
  customerId: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  deliveryType: string;
  fragile: boolean;
  echange: boolean;
  pickup: boolean;
  recouvrement: boolean;
  stopDesk: boolean;
  customer?: {
    name: string;
    phone: string;
    address: string;
    wilaya: string;
    commune: string;
  };
}

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch orders
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Filter orders by status and search query
  const filteredOrders = orders?.filter(order => {
    // Filter by status
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }
    
    // Filter by search query (reference, customer name, or phone)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesReference = order.reference.toLowerCase().includes(lowerQuery);
      const matchesCustomer = order.customer?.name.toLowerCase().includes(lowerQuery);
      const matchesPhone = order.customer?.phone.includes(lowerQuery);
      
      if (!matchesReference && !matchesCustomer && !matchesPhone) {
        return false;
      }
    }
    
    return true;
  });

  // Table columns configuration
  const columns = [
    {
      header: "Reference",
      accessorKey: "reference" as const,
      cell: (order: Order) => (
        <span className="font-medium text-gray-900">{order.reference}</span>
      ),
    },
    {
      header: "Customer",
      accessorKey: "customerId" as const,
      cell: (order: Order) => (
        <div>
          <p className="font-medium">{order.customer?.name || "Unknown"}</p>
          <p className="text-sm text-gray-500">{order.customer?.phone || "N/A"}</p>
        </div>
      ),
    },
    {
      header: "Address",
      accessorKey: "address" as const,
      cell: (order: Order) => (
        <div className="max-w-xs truncate">
          <p className="text-sm">
            {order.customer?.address || "N/A"}
          </p>
          <p className="text-xs text-gray-500">
            {order.customer?.commune}, {order.customer?.wilaya}
          </p>
        </div>
      ),
    },
    {
      header: "Total",
      accessorKey: "totalAmount" as const,
      cell: (order: Order) => formatCurrency(order.totalAmount),
    },
    {
      header: "Date",
      accessorKey: "createdAt" as const,
      cell: (order: Order) => formatDate(order.createdAt),
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (order: Order) => {
        const { bg, text } = getStatusColor(order.status);
        return (
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        );
      },
    },
    {
      header: "Options",
      cell: (order: Order) => (
        <div className="flex space-x-1">
          {order.fragile && <span className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded">Fragile</span>}
          {order.echange && <span className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded">Echange</span>}
          {order.pickup && <span className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded">Pick Up</span>}
          {order.recouvrement && <span className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded">Recouvrement</span>}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (order: Order) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 text-xs"
            asChild
          >
            <Link href={`/orders/${order.id}`}>
              <FileText className="h-3.5 w-3.5 mr-1" />
              View
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Orders</h2>
        <div className="flex space-x-2">
          <Link href="/orders">
            <Button className="bg-primary-300 hover:bg-primary-400 text-white">
              <Plus className="mr-1 h-4 w-4" /> New Order
            </Button>
          </Link>
          <Link href="/export">
            <Button variant="outline">
              <FileText className="mr-1 h-4 w-4" /> Export
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by reference, name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <DataTable
        data={filteredOrders || []}
        columns={columns}
        isLoading={isLoading}
        searchable={false} // We handle search manually
      />
    </div>
  );
}
