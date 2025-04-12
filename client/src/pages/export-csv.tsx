import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, FileText, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { generateCSV } from "@/lib/utils";

interface Customer {
  id: number;
  name: string;
  phone: string;
  phone2?: string;
  address: string;
  wilaya: string;
  commune: string;
}

interface Order {
  id: number;
  reference: string;
  customerId: number;
  totalAmount: number;
  discountAmount?: number;
  discountPercentage?: number;
  finalAmount: number;
  deliveryType: string;
  deliveryPrice?: number;
  fragile: boolean;
  echange: boolean;
  pickup: boolean;
  recouvrement: boolean;
  stopDesk: boolean;
  notes?: string;
  status: string;
  createdAt: string;
  customer?: Customer;
  items?: any[];
}

export default function ExportCsv() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const { toast } = useToast();

  // Fetch orders for export
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/export/csv"],
  });

  // Filter orders based on selected criteria
  const filteredOrders = orders?.filter((order) => {
    let includeOrder = true;

    // Filter by date range
    if (startDate) {
      const orderDate = new Date(order.createdAt);
      const filterDate = new Date(startDate);
      if (orderDate < filterDate) {
        includeOrder = false;
      }
    }

    if (endDate) {
      const orderDate = new Date(order.createdAt);
      const filterDate = new Date(endDate);
      // Set the end date to the end of the day
      filterDate.setHours(23, 59, 59, 999);
      if (orderDate > filterDate) {
        includeOrder = false;
      }
    }

    // Filter by status
    if (status !== "all" && order.status !== status) {
      includeOrder = false;
    }

    return includeOrder;
  });

  // Transform orders into CSV export format
  const prepareOrdersForExport = () => {
    if (!filteredOrders?.length) {
      toast({
        title: "No orders to export",
        description: "There are no orders matching your filter criteria.",
        variant: "destructive",
      });
      return;
    }

    const csvData = filteredOrders.map((order) => {
      // Shipping notes - only include what's needed for the specific field
      const remarks = order.notes || "";

      // Customer info
      const customer = order.customer || {
        name: "",
        phone: "",
        phone2: "",
        wilaya: "",
        commune: "",
        address: "",
      };
      
      // Calculate the final amount properly
      // If finalAmount is directly available, use it
      // Otherwise, calculate it from totalAmount minus discounts
      let orderAmount = 0;
      if (typeof order.finalAmount === 'number' && order.finalAmount > 0) {
        orderAmount = order.finalAmount;
      } else {
        // Calculate after applying discounts
        let discountedAmount = order.totalAmount;
        if (order.discountPercentage && order.discountPercentage > 0) {
          discountedAmount -= (order.totalAmount * order.discountPercentage / 100);
        }
        if (order.discountAmount && order.discountAmount > 0) {
          discountedAmount -= order.discountAmount;
        }
        
        // Add delivery price if present
        if (order.deliveryPrice && order.deliveryPrice > 0) {
          orderAmount = discountedAmount + order.deliveryPrice;
        } else {
          orderAmount = discountedAmount;
        }
      }
      
      // Calculate product description
      let productDescription = "livres";
      if (order.items && order.items.length > 0) {
        // If we have specific items, try to include some detail
        if (order.items.length === 1) {
          productDescription = "livre";
        } else {
          productDescription = `${order.items.length} livres`;
        }
      }
      
      // Format phone numbers to ensure they're exported as text
      // Excel sometimes treats leading zeros as significant and formats them incorrectly
      const primaryPhone = typeof customer.phone === 'string' ? `'${customer.phone}` : `'${customer.phone || ""}`;
      const secondaryPhone = customer.phone2 ? `'${customer.phone2}` : "";
      
      // Get the commune name - either use the full name from the data or the ID stored
      const communeName = customer.commune.includes('_') 
        ? customer.commune.split('_')[0] // Extract name part from ID if in format "Name_WilayaId"
        : customer.commune;
      
      // Format using EXACT column names as required by the delivery company
      return {
        "reference commande": order.reference,
        "nom et prénom du destinataire*": customer.name,
        "telephone*": primaryPhone,
        "telephone 2": secondaryPhone,
        "code wilaya*": customer.wilaya,
        "wilaya de livraison": getWilayaName(customer.wilaya),
        "commune de livraison*": communeName,
        "adresse de livraison*": customer.address,
        "produit*": productDescription, 
        "poids(kg)": "", // optional, leave empty
        "montant du colis*": Math.round(orderAmount), // Round to nearest whole number
        "remarque": remarks,
        "FRAGILE (si oui mettez OUI sinon laissez vide)": order.fragile ? "OUI" : "",
        "ECHANGE (si oui mettez OUI sinon laissez vide)": order.echange ? "OUI" : "",
        "PICK UP (si oui mettez OUI sinon laissez vide)": order.pickup ? "OUI" : "",
        "RECOUVREMENT (si oui mettez OUI sinon laissez vide)": order.recouvrement ? "OUI" : "",
        "STOP DESK (si oui mettez OUI sinon laissez vide)": order.stopDesk ? "OUI" : "",
        "Lien map": "" // Optional map link
      };
    });

    // Generate and download the CSV with utf-8 encoding for Arabic characters
    generateCSV(
      csvData,
      `orders_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );

    toast({
      title: "Export successful",
      description: `${csvData.length} orders have been exported.`,
    });
  };

  // Helper function to get wilaya name from code
  const getWilayaName = (wilayaCode: string): string => {
    // This would normally look up the wilaya name from a list
    // For now, just return the code if we don't have the mapping
    return wilayaCode;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">CSV Export</h2>
        <p className="text-sm text-gray-500">
          Export your orders data in delivery-ready CSV format
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Export Options
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Range */}
              <div>
                <Label
                  htmlFor="date_range"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date Range
                </Label>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label
                      htmlFor="start_date"
                      className="block text-xs text-gray-500 mb-1"
                    >
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      id="start_date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor="end_date"
                      className="block text-xs text-gray-500 mb-1"
                    >
                      End Date
                    </Label>
                    <Input
                      type="date"
                      id="end_date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div className="mt-5">
                <Label
                  htmlFor="order_status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Order Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="order_status" className="">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent className="mt-4">
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Export Format Preview */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Export Format Preview
            </h3>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-3">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Your CSV will contain the following columns in this order:
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  reference commande
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  nom et prénom du destinataire*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  telephone*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  telephone 2
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  code wilaya*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  wilaya de livraison
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  commune de livraison*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  adresse de livraison*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  produit*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  poids(kg)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  montant du colis*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  remarque
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  FRAGILE (si oui mettez OUI sinon laissez vide)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  ECHANGE (si oui mettez OUI sinon laissez vide)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  PICK UP (si oui mettez OUI sinon laissez vide)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  RECOUVREMENT (si oui mettez OUI sinon laissez vide)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  STOP DESK (si oui mettez OUI sinon laissez vide)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Lien map
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">* Required fields</p>
            </div>

            <Alert className="bg-primary-50 border-primary-200">
              <Info className="h-4 w-4 text-primary-600" />
              <AlertDescription className="text-primary-700">
                The exported CSV follows the exact format required by the delivery company, 
                including all column names and special fields. The "montant du colis" field
                now correctly shows the final order amount after discounts and including delivery fees.
                For compatibility with Excel, the file uses semicolons as separators and includes 
                special characters for Arabic text.
              </AlertDescription>
            </Alert>
          </div>

          {/* Orders to be exported */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Orders to be Exported
            </h3>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : filteredOrders && filteredOrders.length > 0 ? (
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700">
                  {filteredOrders.length} orders match your criteria
                </p>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No orders found matching the selected criteria.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline">Cancel</Button>
            <Button
              onClick={prepareOrdersForExport}
              disabled={
                isLoading || !filteredOrders || filteredOrders.length === 0
              }
              className="bg-primary-300 hover:bg-primary-400 text-black"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Orders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
