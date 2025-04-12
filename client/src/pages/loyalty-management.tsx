import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Award, Settings, Users, AlertTriangle, BadgeInfo } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Standard dashboard layout
import DashboardLayout from "@/layouts/dashboard-layout";

export default function LoyaltyManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");

  // Helper function to calculate points preview
  const calculatePoints = (amount: number) => {
    const pointsPerDinar = 1; // 1 point per 1 DZD spent
    return Math.round(amount * pointsPerDinar);
  };

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
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Customer Loyalty Management</h3>
                  <p className="text-muted-foreground max-w-md">
                    This feature will allow you to view and manage customer loyalty points, 
                    tiers, and redemption history.
                  </p>
                  <Button disabled className="mt-6">Coming Soon</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}