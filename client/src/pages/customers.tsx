import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Search, Edit, Phone, Mail, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: number;
  name: string;
  phone: string;
  phone2?: string;
  address: string;
  wilaya: string;
  commune: string;
  createdAt: string;
  updatedAt: string;
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Filter customers based on search query
  const typedCustomers = customers as Customer[] | undefined;
  const filteredCustomers = typedCustomers && searchQuery
    ? typedCustomers.filter((customer: Customer) => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        customer.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : typedCustomers;

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
      cell: (customer: Customer) => (
        <div className="flex items-start">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-gray-600">{customer.address}</p>
            <p className="text-gray-500 text-xs">{customer.commune}, {customer.wilaya}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Actions",
      accessorKey: "id" as const,
      cell: (customer: Customer) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => {
              toast({
                title: "Edit feature coming soon",
                description: "This feature is not yet implemented",
              });
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

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

      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Customer List</CardTitle>
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
                {searchQuery 
                  ? "No customers match your search criteria. Try using different keywords."
                  : "You have not added any customers yet. Add customers when creating orders or import them."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}