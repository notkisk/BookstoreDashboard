import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { 
  Search,
  ArrowUpDown,
  MoreVertical,
  Check,
  Truck,
  RefreshCcw,
  Clock
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { wilayas } from "@/data/algeria";

interface Order {
  id: number;
  reference: string;
  customerId: number;
  totalAmount: number;
  deliveryType: string;
  deliveryPrice: number;
  discountAmount: number;
  discountPercentage: number;
  finalAmount: number;
  fragile: boolean;
  echange: boolean;
  pickup: boolean;
  recouvrement: boolean;
  stopDesk: boolean;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
    phone: string;
    phone2?: string;
    address: string;
    wilaya: string;
    commune: string;
  };
  items?: {
    id: number;
    bookId: number;
    orderId: number;
    quantity: number;
    unitPrice: number;
    book: {
      id: number;
      title: string;
      author: string;
      price: number;
      buyPrice: number;
    };
  }[];
}

export default function ViewOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [wilayaFilter, setWilayaFilter] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  
  // Fetch orders with customer and item details
  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/orders'],
  });
  
  const queryClient = useQueryClient();
  
  // Create a mutation for updating order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest<any>(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
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
  
  // Safe type casting
  const typedOrders = orders as Order[] | undefined;
  
  // Filter orders based on search term and filters
  const filteredOrders = typedOrders
    ? typedOrders.filter((order) => {
        const matchesSearch = 
          order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.customer?.name && order.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (order.customer?.phone && order.customer.phone.includes(searchTerm)) ||
          (order.items?.some(item => item.book.title.toLowerCase().includes(searchTerm.toLowerCase())));
          
        const matchesStatus = statusFilter === "all" || !statusFilter ? true : order.status === statusFilter;
        
        const matchesWilaya = wilayaFilter === "all" || !wilayaFilter ? true : (order.customer?.wilaya === wilayaFilter);
        
        const matchesDeliveryType = deliveryTypeFilter === "all" || !deliveryTypeFilter ? true : order.deliveryType === deliveryTypeFilter;
        
        return matchesSearch && matchesStatus && matchesWilaya && matchesDeliveryType;
      })
    : [];
  
  // Define columns for the data table
  const columns = [
    {
      header: "Reference",
      accessorKey: "reference" as const,
      sortable: true,
    },
    {
      header: "Customer",
      accessorKey: "customerId" as const,
      cell: (order: Order) => (
        <div>
          <p className="font-medium">{order.customer?.name || "Unknown"}</p>
          <p className="text-sm text-gray-500">{order.customer?.phone || "No phone"}</p>
        </div>
      ),
    },
    {
      header: "Location",
      accessorKey: "customerId" as const, // Use customerId as the accessor key since we need a valid Order key
      cell: (order: Order) => (
        <div>
          <p>{order.customer?.wilaya || "Unknown"}</p>
          <p className="text-sm text-gray-500">{order.customer?.commune || "Unknown"}</p>
        </div>
      ),
    },
    {
      header: "Books",
      accessorKey: "items" as const,
      cell: (order: Order) => {
        if (!order.items?.length) return "No items";
        
        return (
          <div className="max-w-xs">
            {order.items.map((item, index) => (
              <div key={item.id} className={index > 0 ? "mt-1 pt-1 border-t border-gray-100" : ""}>
                <p className="font-medium truncate">{item.book.title}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                  <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      header: "Amount",
      accessorKey: "finalAmount" as const,
      cell: (order: Order) => (
        <div>
          <p className="font-medium">{formatCurrency(order.finalAmount)}</p>
          {(order.discountAmount > 0 || order.discountPercentage > 0) && (
            <p className="text-xs text-red-500">
              {order.discountPercentage > 0 && `${order.discountPercentage}% `}
              {order.discountAmount > 0 && `- ${formatCurrency(order.discountAmount)}`}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Date",
      accessorKey: "createdAt" as const,
      cell: (order: Order) => formatDate(order.createdAt),
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (order: Order) => (
        <div className="flex items-center gap-2">
          {order.status === 'pending' && <Clock className="h-4 w-4 text-blue-500" />}
          {order.status === 'delivered' && <Check className="h-4 w-4 text-green-500" />}
          {order.status === 'delivering' && <Truck className="h-4 w-4 text-yellow-500" />}
          {(order.status === 'returned' || order.status === 'reactionary') && <RefreshCcw className="h-4 w-4 text-red-500" />}
          <span className={`px-2 py-1 rounded-full text-xs font-medium
            ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
            order.status === 'delivering' ? 'bg-yellow-100 text-yellow-800' :
            order.status === 'returned' || order.status === 'reactionary' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      ),
    },
    {
      header: "Actions",
      id: "actions",
      cell: (order: Order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'pending' })}
              disabled={order.status === 'pending'}
            >
              <Clock className="mr-2 h-4 w-4" />
              Mark as Pending
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'delivering' })}
              disabled={order.status === 'delivering'}
            >
              <Truck className="mr-2 h-4 w-4" />
              Mark as Delivering
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'delivered' })}
              disabled={order.status === 'delivered'}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark as Delivered
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateOrderStatus.mutate({ id: order.id, status: 'reactionary' })}
              disabled={order.status === 'reactionary'}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Mark as Reactionary
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search orders..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap md:flex-nowrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delivering">Delivering</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="reactionary">Reactionary</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Wilaya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wilayas</SelectItem>
                  {wilayas.map((wilaya) => (
                    <SelectItem key={wilaya.id} value={wilaya.id}>
                      {wilaya.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={deliveryTypeFilter} onValueChange={setDeliveryTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Delivery Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="desk">Stop Desk</SelectItem>
                  <SelectItem value="home">Home Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <DataTable 
              data={filteredOrders} 
              columns={columns} 
              searchable={false}
              pagination={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}