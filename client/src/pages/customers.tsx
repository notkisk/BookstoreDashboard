import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { 
  Plus, 
  Search, 
  Edit, 
  Phone, 
  MapPin, 
  Trash2, 
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Award,
  Filter,
  BadgeCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { wilayas, getCommunesByWilayaId, getWilayaById, getCommuneById } from "@/data/algeria";

interface Customer {
  id: number;
  name: string;
  phone: string;
  phone2?: string;
  address: string;
  wilaya: string;
  commune: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  createdAt: string;
  updatedAt: string;
}

// Define the form schema for customer editing
const customerFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(5, { message: "Phone number must be at least 5 characters." }),
  phone2: z.string().optional(),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  wilaya: z.string().min(1, { message: "Wilaya is required." }),
  commune: z.string().min(1, { message: "Commune is required." }),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedWilaya, setSelectedWilaya] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // for first to last or last to first
  const [loyaltyFilter, setLoyaltyFilter] = useState<string>("all"); // all, regular, silver, gold, platinum
  const [loyaltyPointsMinimum, setLoyaltyPointsMinimum] = useState<number>(0); // for filtering by minimum points
  const { toast } = useToast();

  // Fetch customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Edit customer mutation
  const updateCustomer = useMutation({
    mutationFn: async (data: CustomerFormValues & { id: number }) => {
      const { id, ...customerData } = data;
      return apiRequest(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer updated",
        description: "Customer information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/customers/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer deleted",
        description: "Customer has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter customers based on search query, loyalty tier, and points
  const typedCustomers = customers as Customer[] | undefined;
  
  // First apply all filters sequentially
  let filtered = typedCustomers;
  
  // Apply search query filter
  if (filtered && searchQuery) {
    filtered = filtered.filter((customer: Customer) => 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Apply loyalty tier filter
  if (filtered && loyaltyFilter !== "all") {
    filtered = filtered.filter((customer: Customer) => 
      customer.loyaltyTier === loyaltyFilter
    );
  }
  
  // Apply minimum loyalty points filter
  if (filtered && loyaltyPointsMinimum > 0) {
    filtered = filtered.filter((customer: Customer) => 
      (customer.loyaltyPoints || 0) >= loyaltyPointsMinimum
    );
  }
    
  // Then sort by name in the chosen order
  const filteredCustomers = filtered
    ? [...filtered].sort((a, b) => {
        if (sortOrder === "asc") {
          return a.name.localeCompare(b.name); // A to Z
        } else {
          return b.name.localeCompare(a.name); // Z to A
        }
      })
    : [];
    
  // Form for editing customer
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      phone2: "",
      address: "",
      wilaya: "",
      commune: "",
    },
  });
  
  // Update form when selected customer changes
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedWilaya(customer.wilaya);
    form.reset({
      name: customer.name,
      phone: customer.phone,
      phone2: customer.phone2 || "",
      address: customer.address,
      wilaya: customer.wilaya,
      commune: customer.commune,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle form submission
  const onSubmit = (data: CustomerFormValues) => {
    if (selectedCustomer) {
      updateCustomer.mutate({ id: selectedCustomer.id, ...data });
    }
  };

  // Define columns for the table
  const columns = [
    {
      header: "Customer Name",
      accessorKey: "name" as const,
      cell: (customer: Customer) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
            <span className="text-xs font-medium text-primary-700">
              {customer.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-800">{customer.name}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Contact",
      accessorKey: "phone" as const,
      cell: (customer: Customer) => (
        <div className="flex flex-col">
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <Phone className="h-3 w-3 mr-1" /> {customer.phone}
          </div>
          {customer.phone2 && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-3 w-3 mr-1" /> {customer.phone2}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Address",
      accessorKey: "address" as const,
      cell: (customer: Customer) => {
        // Get proper wilaya and commune names using helper functions
        const wilaya = getWilayaById(customer.wilaya);
        const commune = getCommuneById(customer.commune);
        
        return (
          <div className="flex items-start">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-gray-600">{customer.address}</p>
              <p className="text-gray-500 text-xs">
                {commune?.name || customer.commune}, {wilaya?.name || customer.wilaya}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Loyalty",
      accessorKey: "loyaltyPoints" as const,
      cell: (customer: Customer) => {
        // Define colors based on loyalty tier
        const tierColors = {
          regular: "bg-gray-100 text-gray-800",
          silver: "bg-slate-300 text-slate-800", // Updated silver background to be more visible
          gold: "bg-amber-100 text-amber-800",
          platinum: "bg-purple-100 text-purple-800"
        };
        
        const tierColor = tierColors[customer.loyaltyTier as keyof typeof tierColors] || tierColors.regular;
        
        return (
          <div className="flex flex-col">
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Award className="h-3.5 w-3.5 mr-1 text-amber-500" /> 
              <span className="font-medium">{customer.loyaltyPoints || 0}</span> 
              <span className="ml-1">points</span>
            </div>
            <div className="flex items-center">
              <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor} capitalize`}>
                <BadgeCheck className="inline h-3 w-3 mr-0.5" />
                {customer.loyaltyTier || 'regular'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Actions",
      accessorKey: "id" as const,
      cell: (customer: Customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDeleteCustomer(customer)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // For commune selection based on selected wilaya
  const communes = selectedWilaya ? getCommunesByWilayaId(selectedWilaya) : [];
  
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Customers</h2>
          <p className="text-sm text-gray-500">
            Manage your customer contacts and addresses
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            className="bg-primary-500 hover:bg-primary-600 text-white"
            onClick={() => {
              toast({
                title: "Add customer feature coming soon",
                description: "This feature is not yet implemented",
              });
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        </div>
      </div>
      
      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Primary phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternative Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Secondary phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="wilaya"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wilaya</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedWilaya(value);
                          // Reset commune if wilaya changes
                          form.setValue('commune', '');
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wilaya" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wilayas.map((wilaya) => (
                            <SelectItem key={wilaya.id} value={wilaya.id}>
                              {wilaya.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="commune"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commune</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!selectedWilaya}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select commune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {communes.map((commune) => (
                            <SelectItem key={commune.id} value={commune.id}>
                              {commune.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateCustomer.isPending}
                >
                  {updateCustomer.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 mb-6">
            {selectedCustomer && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <span className="text-xs font-medium text-primary-700">
                      {selectedCustomer.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedCustomer.name}</p>
                    <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 ml-11">{selectedCustomer.address}</p>
                <p className="text-xs text-gray-500 ml-11">
                  {(() => {
                    const wilaya = getWilayaById(selectedCustomer.wilaya);
                    const commune = getCommuneById(selectedCustomer.commune);
                    return `${commune?.name || selectedCustomer.commune}, ${wilaya?.name || selectedCustomer.wilaya}`;
                  })()}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="destructive"
              disabled={deleteCustomer.isPending}
              onClick={() => selectedCustomer && deleteCustomer.mutate(selectedCustomer.id)}
            >
              {deleteCustomer.isPending ? "Deleting..." : "Delete Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Customer List</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-8"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? (
                    <>
                      <ArrowUp className="h-4 w-4" />
                      <span className="text-xs font-medium">A-Z</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4" />
                      <span className="text-xs font-medium">Z-A</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="w-full max-w-sm ml-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search customers..."
                    className="pl-8 bg-gray-50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Loyalty filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center">
                <Award className="h-4 w-4 mr-1.5 text-amber-500" />
                <span className="text-sm font-medium">Loyalty Tier:</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Select
                  value={loyaltyFilter}
                  onValueChange={setLoyaltyFilter}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="regular">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-200 mr-2"></div>
                        Regular
                      </div>
                    </SelectItem>
                    <SelectItem value="silver">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-slate-300 mr-2"></div>
                        Silver
                      </div>
                    </SelectItem>
                    <SelectItem value="gold">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-amber-200 mr-2"></div>
                        Gold
                      </div>
                    </SelectItem>
                    <SelectItem value="platinum">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-200 mr-2"></div>
                        Platinum
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center ml-2">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-1.5 text-gray-500" />
                  <span className="text-sm font-medium mr-2">Min Points:</span>
                </div>
                <Input
                  type="number"
                  value={loyaltyPointsMinimum.toString()}
                  onChange={(e) => setLoyaltyPointsMinimum(parseInt(e.target.value) || 0)}
                  className="w-24 h-8 text-sm"
                  min="0"
                  step="50"
                />
                {loyaltyPointsMinimum > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2 ml-1"
                    onClick={() => setLoyaltyPointsMinimum(0)}
                  >
                    <span className="sr-only">Reset</span>
                    ✕
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCustomers || []}
            columns={columns}
            searchable={false}
            pagination={true}
            pageSize={10}
          />
          
          {!isLoading && (!filteredCustomers || filteredCustomers.length === 0) && (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mb-3">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-gray-600 font-medium mb-1">No customers found</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {searchQuery || loyaltyFilter !== "all" || loyaltyPointsMinimum > 0
                  ? `No customers match your ${[
                    searchQuery ? "search" : "", 
                    loyaltyFilter !== "all" ? "loyalty tier" : "", 
                    loyaltyPointsMinimum > 0 ? "points" : ""
                  ].filter(Boolean).join(" and ")} criteria. Try adjusting your filters.`
                  : "You have not added any customers yet. Add customers when creating orders or import them."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}