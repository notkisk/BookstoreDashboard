import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Settings, Award, Tag, Users } from "lucide-react";

// Standard dashboard layout
import DashboardLayout from "@/layouts/dashboard-layout";

// Schema for loyalty settings form
const loyaltySettingsSchema = z.object({
  pointsPerDinar: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 0.1 : Number(val),
    z.number().min(0.01).max(10)
  ),
  redemptionRate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 0.5 : Number(val),
    z.number().min(0.01).max(10)
  ),
  minimumPointsToRedeem: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 100 : Number(val),
    z.number().int().min(1)
  ),
  silverThreshold: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 500 : Number(val),
    z.number().int().min(1)
  ),
  goldThreshold: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 1000 : Number(val),
    z.number().int().min(1)
  ),
  platinumThreshold: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 2000 : Number(val),
    z.number().int().min(1)
  ),
  silverMultiplier: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 1.1 : Number(val),
    z.number().min(1).max(5)
  ),
  goldMultiplier: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 1.2 : Number(val),
    z.number().min(1).max(5)
  ),
  platinumMultiplier: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 1.3 : Number(val),
    z.number().min(1).max(5)
  ),
  expirationDays: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 365 : Number(val),
    z.number().int().min(30).max(3650)
  ),
  active: z.boolean().default(true),
});

type LoyaltySettingsFormValues = z.infer<typeof loyaltySettingsSchema>;

// Define the loyalty settings interface
interface LoyaltySettings {
  id: number;
  pointsPerDinar: number;
  redemptionRate: number;
  minimumPointsToRedeem: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
  silverMultiplier: number;
  goldMultiplier: number;
  platinumMultiplier: number;
  expirationDays: number;
  active: boolean;
  updatedAt: string;
}

export default function LoyaltyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("settings");

  // Create form with react-hook-form + zod validation
  const form = useForm<LoyaltySettingsFormValues>({
    resolver: zodResolver(loyaltySettingsSchema),
    defaultValues: {
      pointsPerDinar: 0.1,
      redemptionRate: 0.5,
      minimumPointsToRedeem: 100,
      silverThreshold: 500,
      goldThreshold: 1000,
      platinumThreshold: 2000,
      silverMultiplier: 1.1,
      goldMultiplier: 1.2,
      platinumMultiplier: 1.3,
      expirationDays: 365,
      active: true,
    },
  });

  // Fetch loyalty settings
  const { data: loyaltySettings, isLoading: isLoadingSettings } = useQuery<any>({
    queryKey: ['/api/loyalty/settings'],
    enabled: activeTab === "settings",
  });

  // Update form values when settings data is loaded
  useEffect(() => {
    if (loyaltySettings) {
      form.reset({
        pointsPerDinar: loyaltySettings.pointsPerDinar,
        redemptionRate: loyaltySettings.redemptionRate,
        minimumPointsToRedeem: loyaltySettings.minimumPointsToRedeem,
        silverThreshold: loyaltySettings.silverThreshold,
        goldThreshold: loyaltySettings.goldThreshold,
        platinumThreshold: loyaltySettings.platinumThreshold,
        silverMultiplier: loyaltySettings.silverMultiplier,
        goldMultiplier: loyaltySettings.goldMultiplier,
        platinumMultiplier: loyaltySettings.platinumMultiplier,
        expirationDays: loyaltySettings.expirationDays,
        active: loyaltySettings.active,
      });
    }
  }, [loyaltySettings, form]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: LoyaltySettingsFormValues) => {
      return apiRequest('/api/loyalty/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/settings'] });
      toast({
        title: "Settings updated",
        description: "Loyalty program settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to update loyalty settings:", error);
      toast({
        title: "Error",
        description: "Failed to update loyalty program settings.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const values = form.getValues();
    updateSettingsMutation.mutate(values);
  };

  // Helper function to calculate points preview
  const calculatePoints = (amount: number) => {
    const pointsPerDinar = form.watch("pointsPerDinar") || 0.1;
    return Math.round(amount * pointsPerDinar);
  };

  // Helper function to calculate redemption value
  const calculateRedemptionValue = (points: number) => {
    const redemptionRate = form.watch("redemptionRate") || 0.5;
    return Math.round(points * redemptionRate);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loyalty Program Management</h1>
            <p className="text-muted-foreground">
              Configure your loyalty program settings and manage customer points
            </p>
          </div>
          <div>
            <Award className="w-8 h-8 text-primary" />
          </div>
        </div>

        <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" /> Program Settings
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="w-4 h-4 mr-2" /> Customer Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-6">
            {isLoadingSettings ? (
              <div className="w-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Program Configuration</CardTitle>
                    <CardDescription>
                      Configure your loyalty program settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={onSubmit}>
                      <div className="flex flex-col space-y-6">
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <label className="text-base font-medium">
                              Loyalty Program Status
                            </label>
                            <p className="text-sm text-muted-foreground">
                              Enable or disable the loyalty program
                            </p>
                          </div>
                          <Switch
                            checked={form.watch("active")}
                            onCheckedChange={(checked) => form.setValue("active", checked)}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium flex items-center">
                            <Tag className="w-4 h-4 mr-2" /> Basic Point Settings
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-medium">Points per DZD</label>
                              <Input
                                type="number"
                                step="0.01"
                                className="mt-1"
                                value={form.watch("pointsPerDinar")}
                                onChange={(e) => form.setValue("pointsPerDinar", parseFloat(e.target.value))}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                How many points customers earn per 1 DZD spent
                              </p>
                              {form.formState.errors.pointsPerDinar && (
                                <p className="text-xs text-red-500 mt-1">
                                  Value must be between 0.01 and 10
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Redemption Rate (DZD per point)</label>
                              <Input
                                type="number"
                                step="0.01"
                                className="mt-1"
                                value={form.watch("redemptionRate")}
                                onChange={(e) => form.setValue("redemptionRate", parseFloat(e.target.value))}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Value in DZD of 1 loyalty point when redeemed
                              </p>
                              {form.formState.errors.redemptionRate && (
                                <p className="text-xs text-red-500 mt-1">
                                  Value must be between 0.01 and 10
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-medium">Minimum Points to Redeem</label>
                              <Input
                                type="number"
                                className="mt-1"
                                value={form.watch("minimumPointsToRedeem")}
                                onChange={(e) => form.setValue("minimumPointsToRedeem", parseInt(e.target.value))}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum points required for redemption
                              </p>
                              {form.formState.errors.minimumPointsToRedeem && (
                                <p className="text-xs text-red-500 mt-1">
                                  Value must be at least 1
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Points Expiration (days)</label>
                              <Input
                                type="number"
                                className="mt-1"
                                value={form.watch("expirationDays")}
                                onChange={(e) => form.setValue("expirationDays", parseInt(e.target.value))}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Number of days until points expire (0 for no expiration)
                              </p>
                              {form.formState.errors.expirationDays && (
                                <p className="text-xs text-red-500 mt-1">
                                  Value must be between 30 and 3650
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-4">
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={updateSettingsMutation.isPending}
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Settings
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tier Settings</CardTitle>
                      <CardDescription>
                        Configure loyalty tier thresholds and bonuses
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium">Silver Tier Threshold</label>
                          <Input
                            type="number"
                            value={form.watch("silverThreshold")}
                            onChange={(e) => form.setValue("silverThreshold", parseInt(e.target.value))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Points needed to reach Silver tier
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Silver Tier Multiplier</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={form.watch("silverMultiplier")}
                            onChange={(e) => form.setValue("silverMultiplier", parseFloat(e.target.value))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Points multiplier for Silver tier
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium">Gold Tier Threshold</label>
                          <Input
                            type="number"
                            value={form.watch("goldThreshold")}
                            onChange={(e) => form.setValue("goldThreshold", parseInt(e.target.value))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Points needed to reach Gold tier
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Gold Tier Multiplier</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={form.watch("goldMultiplier")}
                            onChange={(e) => form.setValue("goldMultiplier", parseFloat(e.target.value))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Points multiplier for Gold tier
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium">Platinum Tier Threshold</label>
                          <Input
                            type="number"
                            value={form.watch("platinumThreshold")}
                            onChange={(e) => form.setValue("platinumThreshold", parseInt(e.target.value))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Points needed to reach Platinum tier
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Platinum Tier Multiplier</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={form.watch("platinumMultiplier")}
                            onChange={(e) => form.setValue("platinumMultiplier", parseFloat(e.target.value))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Points multiplier for Platinum tier
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Points Calculator</CardTitle>
                      <CardDescription>
                        Preview points earned and redemption values
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium">Order Amount (DZD)</label>
                          <Input
                            type="number"
                            placeholder="1000"
                            defaultValue={1000}
                            id="calculator-amount"
                            className="mt-1"
                            onChange={(e) => {
                              const pointsPreview = document.getElementById("points-preview");
                              if (pointsPreview) {
                                pointsPreview.innerText = calculatePoints(parseFloat(e.target.value) || 0).toString();
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Earns <span id="points-preview" className="font-semibold">{calculatePoints(1000)}</span> points
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Points to Redeem</label>
                          <Input
                            type="number"
                            placeholder="500"
                            defaultValue={500}
                            id="calculator-points"
                            className="mt-1" 
                            onChange={(e) => {
                              const valuePreview = document.getElementById("value-preview");
                              if (valuePreview) {
                                valuePreview.innerText = calculateRedemptionValue(parseFloat(e.target.value) || 0).toString();
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Worth <span id="value-preview" className="font-semibold">{calculateRedemptionValue(500)}</span> DZD
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
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