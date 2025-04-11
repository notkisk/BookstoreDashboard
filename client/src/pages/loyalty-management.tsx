import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Settings } from "lucide-react";

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

export default function LoyaltyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("settings");

  // Define the loyalty settings type
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

  // Fetch loyalty settings
  const { data: loyaltySettings, isLoading: isLoadingSettings } = useQuery<LoyaltySettings>({
    queryKey: ['/api/loyalty/settings'],
    enabled: activeTab === "settings",
    select: (data) => {
      // Ensure data has the expected shape
      if (!data) return null;
      
      // Cast data to LoyaltySettings with appropriate defaults
      return {
        id: data.id || 0,
        pointsPerDinar: data.pointsPerDinar || 0.1,
        redemptionRate: data.redemptionRate || 0.5,
        minimumPointsToRedeem: data.minimumPointsToRedeem || 100,
        silverThreshold: data.silverThreshold || 500,
        goldThreshold: data.goldThreshold || 1000,
        platinumThreshold: data.platinumThreshold || 2000,
        silverMultiplier: data.silverMultiplier || 1.1,
        goldMultiplier: data.goldMultiplier || 1.2,
        platinumMultiplier: data.platinumMultiplier || 1.3,
        expirationDays: data.expirationDays || 365,
        active: data.active !== undefined ? data.active : true,
        updatedAt: data.updatedAt || new Date().toISOString()
      } as LoyaltySettings;
    }
  });

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
  const onSubmit = (data: LoyaltySettingsFormValues) => {
    updateSettingsMutation.mutate(data);
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
            <Settings className="w-8 h-8 text-primary" />
          </div>
        </div>

        <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="settings">Program Settings</TabsTrigger>
            <TabsTrigger value="customers">Customer Management</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-6">
            {isLoadingSettings ? (
              <div className="w-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Program Configuration</CardTitle>
                    <CardDescription>
                      Configure your loyalty program settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Loyalty Program Status
                                </FormLabel>
                                <FormDescription>
                                  Enable or disable the loyalty program
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <Separator className="my-4" />
                        
                        <FormField
                          control={form.control}
                          name="pointsPerDinar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Points per DZD</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                How many points customers earn per 1 DZD spent
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="redemptionRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Redemption Rate (DZD per point)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Value in DZD of 1 loyalty point when redeemed
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="minimumPointsToRedeem"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Points to Redeem</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Minimum points required for redemption
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="expirationDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Points Expiration (days)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Number of days until points expire (0 for no expiration)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
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
                      </form>
                    </Form>
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
                    <CardContent className="space-y-4">
                      <Form {...form}>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="silverThreshold"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Silver Tier Threshold</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="silverMultiplier"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Silver Tier Multiplier</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="goldThreshold"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Gold Tier Threshold</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="goldMultiplier"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Gold Tier Multiplier</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="platinumThreshold"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Platinum Tier Threshold</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="platinumMultiplier"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Platinum Tier Multiplier</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </Form>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel>Order Amount (DZD)</FormLabel>
                          <Input
                            type="number"
                            placeholder="1000"
                            defaultValue={1000}
                            id="calculator-amount"
                            onChange={(e) => {
                              const pointsPreview = document.getElementById("points-preview");
                              if (pointsPreview) {
                                pointsPreview.innerText = calculatePoints(parseFloat(e.target.value) || 0).toString();
                              }
                            }}
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Earns <span id="points-preview">{calculatePoints(1000)}</span> points
                          </p>
                        </div>
                        <div>
                          <FormLabel>Points to Redeem</FormLabel>
                          <Input
                            type="number"
                            placeholder="500"
                            defaultValue={500}
                            id="calculator-points"
                            onChange={(e) => {
                              const valuePreview = document.getElementById("value-preview");
                              if (valuePreview) {
                                valuePreview.innerText = calculateRedemptionValue(parseFloat(e.target.value) || 0).toString();
                              }
                            }}
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Worth <span id="value-preview">{calculateRedemptionValue(500)}</span> DZD
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
                <p className="text-center py-8">
                  Customer loyalty management will be implemented in a future update.
                </p>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button disabled>Load Customer List</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}