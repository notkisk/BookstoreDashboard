import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Award, Settings, Users, AlertTriangle, BadgeInfo, Search, Phone, MapPin, Filter, BadgeCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { getWilayaById, getCommuneById } from "@/data/algeria";

// Standard dashboard layout
import DashboardLayout from "@/layouts/dashboard-layout";

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
}

export default function LoyaltyManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [searchQuery, setSearchQuery] = useState("");
  const [loyaltyFilter, setLoyaltyFilter] = useState<string>("all");
  const [loyaltyPointsMinimum, setLoyaltyPointsMinimum] = useState<number>(0);

  // Helper function to calculate points preview
  const calculatePoints = (amount: number) => {
    const pointsPerDinar = 1; // 1 point per 1 DZD spent
    return Math.round(amount * pointsPerDinar);
  };

  // Fetch customers with loyalty information
  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/loyalty/customers', loyaltyFilter, loyaltyPointsMinimum],
    queryFn: async () => {
      // Build query params for filtering
      const params = new URLSearchParams();
      if (loyaltyFilter !== 'all') {
        params.append('tier', loyaltyFilter);
      }
      if (loyaltyPointsMinimum > 0) {
        params.append('minPoints', loyaltyPointsMinimum.toString());
      }
      
      const queryString = params.toString();
      const url = `/api/loyalty/customers${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    },
    enabled: activeTab === "customers",
  });

  // Apply search filter
  const filteredCustomers = customers ? customers.filter((customer: Customer) => 
    searchQuery === "" || 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    customer.phone.includes(searchQuery) ||
    customer.address.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Define columns for the customer table
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
          silver: "bg-slate-300 text-slate-800",
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
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // Just a placeholder for now - this would open a details dialog
            toast({
              title: "View Customer Details",
              description: `Feature for viewing details of ${customer.name} will be added soon.`,
            });
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loyalty Program Management</h1>
            <p className="text-muted-foreground">
              View loyalty program details and manage customer points
            </p>
          </div>
          <div>
            <Award className="w-8 h-8 text-primary" />
          </div>
        </div>

        <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="info">
              <BadgeInfo className="w-4 h-4 mr-2" /> Program Info
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="w-4 h-4 mr-2" /> Customer Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Loyalty Program Details</CardTitle>
                <CardDescription>
                  View the loyalty program setup and tier structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-lg border shadow-sm mb-8">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <div className="bg-primary/20 p-2 rounded-full mr-3">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    Points Earning Structure
                  </h3>
                  <p className="text-base mb-6 border-l-2 border-primary/30 pl-4 py-1">
                    For every <span className="font-semibold">1 DZD</span> spent on orders, customers earn <span className="font-semibold">1 loyalty point</span>.
                  </p>

                  <div className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden max-w-md">
                    <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-green-100 opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
                    <h4 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center">
                      <span className="inline-block w-6 h-0.5 bg-green-400 mr-2"></span>
                      Example
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Order Amount:</span>
                        <span className="text-base font-medium bg-green-50 px-3 py-0.5 rounded-full">1,000 DZD</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Points Earned:</span>
                        <span className="text-base font-medium text-green-600 bg-green-50 px-3 py-0.5 rounded-full">{calculatePoints(1000)} points</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-5">Loyalty Tiers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Silver Tier */}
                    <div className="group relative transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-lg overflow-hidden">
                      <Card className="border-l-4 border-l-slate-400 h-full">
                        <div className="absolute -top-8 -left-8 bg-slate-100 rounded-full w-16 h-16 opacity-20 group-hover:opacity-40 transition-all duration-300"></div>
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors duration-300">
                              <Award className="h-6 w-6 text-slate-500 group-hover:text-slate-700 transition-all" />
                            </div>
                            <h4 className="text-lg font-semibold">Silver</h4>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-slate-500 text-xs uppercase font-semibold">Qualification</span>
                              <div className="font-medium text-base mt-1">1 - 20,000 points</div>
                            </div>
                            <div className="pt-2 text-slate-600 text-sm transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                              Entry tier for all customers who make purchases
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Gold Tier */}
                    <div className="group relative transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-lg overflow-hidden">
                      <Card className="border-l-4 border-l-amber-400 h-full">
                        <div className="absolute -top-8 -left-8 bg-amber-100 rounded-full w-16 h-16 opacity-20 group-hover:opacity-40 transition-all duration-300"></div>
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 rounded-full bg-amber-100 group-hover:bg-amber-200 transition-colors duration-300">
                              <Award className="h-6 w-6 text-amber-500 group-hover:text-amber-700 transition-all" />
                            </div>
                            <h4 className="text-lg font-semibold">Gold</h4>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-amber-500 text-xs uppercase font-semibold">Qualification</span>
                              <div className="font-medium text-base mt-1">20,000 - 50,000 points</div>
                            </div>
                            <div className="pt-2 text-amber-700 text-sm transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                              Mid-tier rewards for loyal customers
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Platinum Tier */}
                    <div className="group relative transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-lg overflow-hidden">
                      <Card className="border-l-4 border-l-purple-400 h-full">
                        <div className="absolute -top-8 -left-8 bg-purple-100 rounded-full w-16 h-16 opacity-20 group-hover:opacity-40 transition-all duration-300"></div>
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors duration-300">
                              <Award className="h-6 w-6 text-purple-500 group-hover:text-purple-700 transition-all" />
                            </div>
                            <h4 className="text-lg font-semibold">Platinum</h4>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-purple-500 text-xs uppercase font-semibold">Qualification</span>
                              <div className="font-medium text-base mt-1">50,000+ points</div>
                            </div>
                            <div className="pt-2 text-purple-700 text-sm transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                              Premium tier with exclusive benefits
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Loyalty Management</CardTitle>
                <CardDescription>
                  View and manage customer loyalty points and tiers
                </CardDescription>
                <div className="space-y-4 mt-4">
                  {/* Search and filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="relative flex-1">
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
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <p className="text-muted-foreground">Loading customers...</p>
                  </div>
                ) : filteredCustomers && filteredCustomers.length > 0 ? (
                  <DataTable
                    data={filteredCustomers}
                    columns={columns}
                    searchable={false}
                    pagination={true}
                  />
                ) : (
                  <div className="text-center py-10">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-2">No customers found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || loyaltyFilter !== 'all' || loyaltyPointsMinimum > 0 ? 
                        'Try adjusting your search or filters' : 
                        'No customers with loyalty data are available'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}