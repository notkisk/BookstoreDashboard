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
import { AlertCircle, Download, FilePlus2, FileSpreadsheet, FileText, Info, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { generateCSV } from "@/lib/utils";
import { generateExcelFromTemplate } from "@/lib/excel-export";
import { getWilayaById, getCommuneById } from "@/data/algeria";

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
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [keepTemplateAsDefault, setKeepTemplateAsDefault] = useState(true);
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
  // Prepare data for both CSV and Excel exports
  const prepareOrderData = () => {
    if (!filteredOrders?.length) {
      toast({
        title: "No orders to export",
        description: "There are no orders matching your filter criteria.",
        variant: "destructive",
      });
      return null;
    }

    return filteredOrders.map((order) => {
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
      
      // Always use "livres" for product description as requested
      let productDescription = "livres";
      
      // Format phone numbers without leading apostrophes - formatting handled in backend
      // This ensures the phone numbers are passed as-is from the database
      const primaryPhone = typeof customer.phone === 'string' ? customer.phone : (customer.phone || "");
      const secondaryPhone = customer.phone2 || "";
      
      // Get the proper commune name using the helper function
      const commune = getCommuneById(customer.commune);
      const communeName = commune?.name || (
        customer.commune.includes('_')
          ? customer.commune.split('_')[0] // Extract name part from ID if in format "Name_WilayaId"
          : customer.commune
      );
      
      // Format the wilaya name
      const wilayaName = getWilayaName(customer.wilaya);
      
      // Return a shared data object that can be used by different export formats
      return {
        // Order details
        reference: order.reference,
        name: customer.name,
        phone: customer.phone,
        phone2: customer.phone2 || "",
        wilayaCode: customer.wilaya,
        wilaya: wilayaName,
        commune: communeName,
        address: customer.address,
        product: productDescription,
        weight: "",
        amount: Math.round(orderAmount),
        remarks: remarks,
        fragile: order.fragile,
        echange: order.echange,
        pickup: order.pickup,
        recouvrement: order.recouvrement,
        stopDesk: order.stopDesk,
        mapLink: "",
        
        // Additional data for CSV format
        csvData: {
          "reference commande": order.reference,
          "nom et prénom du destinataire*": customer.name,
          "telephone*": primaryPhone,
          "telephone 2": secondaryPhone,
          "code wilaya*": customer.wilaya,
          "wilaya de livraison": "",
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
        }
      };
    });
  };

  // Export to CSV
  const exportToCsv = () => {
    const orderData = prepareOrderData();
    if (!orderData) return;
    
    // Extract CSV data from the shared object
    const csvData = orderData.map(data => data.csvData);
    
    // Generate and download the CSV with utf-8 encoding for Arabic characters
    generateCSV(
      csvData,
      `orders_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );

    toast({
      title: "CSV Export successful",
      description: `${csvData.length} orders have been exported as CSV.`,
    });
  };
  
  // Export to Excel using template
  const exportToExcel = async () => {
    try {
      const orderData = prepareOrderData();
      if (!orderData) return;
      
      // Generate Excel file using the template
      await generateExcelFromTemplate(
        orderData,
        `orders_excel_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      
      toast({
        title: "Excel Export successful",
        description: `${orderData.length} orders have been exported in delivery company format.`,
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error generating the Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Export to EcoTrack Excel format using server-side template
  const exportToEcoTrack = async () => {
    if (isExporting) return; // Prevent multiple exports simultaneously
    
    setIsExporting(true);
    
    try {
      const orderData = prepareOrderData();
      if (!orderData) {
        setIsExporting(false);
        return;
      }
      
      // Show toast indicating export is starting
      toast({
        title: "Export started",
        description: "Generating EcoTrack formatted file. Please wait...",
      });
      
      // Make a direct GET request to the server endpoint
      // The server will generate the Excel file using the EcoTrack template
      const response = await fetch('/api/orders/export/ecotrack');
      
      if (!response.ok) {
        // Get the error message from the response if possible
        let errorMessage = "Failed to generate EcoTrack file";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Convert response to blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ecotrack_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "EcoTrack Export successful",
        description: `${orderData.length} orders have been exported in EcoTrack format with preserved template formatting.`,
      });
    } catch (error) {
      console.error('EcoTrack export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "There was an error generating the EcoTrack file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to get wilaya name from code
  const getWilayaName = (wilayaCode: string): string => {
    // Use the helper function to get proper wilaya name
    const wilaya = getWilayaById(wilayaCode);
    return wilaya?.name || wilayaCode;
  };
  
  // Handle template file selection
  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Only accept .xlsx files
      if (file.name.endsWith('.xlsx')) {
        setTemplateFile(file);
      } else {
        toast({
          title: "Invalid file format",
          description: "Please select an Excel (.xlsx) file.",
          variant: "destructive",
        });
        // Reset the file input
        e.target.value = '';
        setTemplateFile(null);
      }
    }
  };
  
  // Upload the selected template file
  const uploadTemplateFile = async () => {
    if (!templateFile) return;
    
    setIsUploading(true);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('template', templateFile);
      formData.append('keepAsDefault', keepTemplateAsDefault.toString());
      
      // Make the upload request
      const response = await fetch('/api/templates/ecotrack-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Template uploaded successfully",
        description: "The EcoTrack template has been uploaded and will be used for exports.",
      });
      
      // Reset the file input
      setTemplateFile(null);
      // Reset the file input element
      const fileInput = document.getElementById('template-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Template upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading the template file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Order Export</h2>
        <p className="text-sm text-gray-500">
          Export your orders in delivery company-compatible CSV format
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
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  nom et prénom du destinataire*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  telephone*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  code wilaya*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  commune*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  adresse*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  produit*
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                  montant*
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">* Required fields</p>
            </div>

            <Alert className="bg-green-50 border-green-200 mb-3">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <strong>NEW!</strong> Use the EcoTrack Format for exports using the Excel template.
              </AlertDescription>
            </Alert>
            
            {/* EcoTrack Template Upload Section */}
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  id="template-upload"
                  accept=".xlsx"
                  className="max-w-md"
                  onChange={handleTemplateFileChange}
                />
                <Button 
                  onClick={uploadTemplateFile}
                  disabled={!templateFile || isUploading}
                  className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Template
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center mt-3">
                <input 
                  type="checkbox"
                  id="keep-template"
                  checked={keepTemplateAsDefault}
                  onChange={(e) => setKeepTemplateAsDefault(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="keep-template" className="ml-2 block text-sm text-gray-700">
                  Save as default template
                </label>
              </div>
            </div>
            

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
              onClick={exportToEcoTrack}
              disabled={
                isLoading || !filteredOrders || filteredOrders.length === 0 || isExporting
              }
              className="bg-green-300 hover:bg-green-400 text-black"
              variant="outline"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  EcoTrack Format
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
