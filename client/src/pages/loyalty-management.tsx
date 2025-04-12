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

  // Helper function to calculate redemption value
  const calculateRedemptionValue = (points: number) => {
    const redemptionRate = 0.5; // Fixed redemption rate
    return Math.round(points * redemptionRate);
  };

  return (
    <DashboardLayout>
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
                <div className="bg-primary/5 p-4 rounded-md border">
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-primary" />
                    Points Earning Structure
                  </h3>
                  <p className="text-sm mb-4">
                    For every 1 DZD spent on orders, customers earn 1 loyalty point.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="border rounded-md p-3 bg-white">
                      <span className="text-sm font-medium">Example:</span>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm">Order Amount:</span>
                        <span className="text-sm font-medium">1,000 DZD</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm">Points Earned:</span>
                        <span className="text-sm font-medium text-primary">{calculatePoints(1000)} points</span>
                      </div>
                    </div>

                    <div className="border rounded-md p-3 bg-white">
                      <span className="text-sm font-medium">Points Redemption:</span>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm">1,000 Points =</span>
                        <span className="text-sm font-medium">{calculateRedemptionValue(1000)} DZD</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm">Minimum to Redeem:</span>
                        <span className="text-sm font-medium">100 points</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Loyalty Tiers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Silver Tier */}
                    <Card className="border-l-4 border-l-slate-400">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="p-1.5 rounded-full bg-slate-100">
                            <Award className="h-5 w-5 text-slate-500" />
                          </div>
                          <h4 className="text-base font-semibold">Silver</h4>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Qualification:</span>
                            <span className="font-medium">1 - 20,000 points</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Gold Tier */}
                    <Card className="border-l-4 border-l-amber-400">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="p-1.5 rounded-full bg-amber-100">
                            <Award className="h-5 w-5 text-amber-500" />
                          </div>
                          <h4 className="text-base font-semibold">Gold</h4>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Qualification:</span>
                            <span className="font-medium">20,000 - 50,000 points</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Platinum Tier */}
                    <Card className="border-l-4 border-l-purple-400">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="p-1.5 rounded-full bg-purple-100">
                            <Award className="h-5 w-5 text-purple-500" />
                          </div>
                          <h4 className="text-base font-semibold">Platinum</h4>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Qualification:</span>
                            <span className="font-medium">50,000+ points</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
    </DashboardLayout>
  );
}