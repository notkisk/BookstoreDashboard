import { useState, useEffect } from 'react';
import { AlgeriaDataUploader } from '@/components/ui/algeria-data-uploader';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { wilayas, communes } from '@/data/algeria';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Save, Pencil, AlertTriangle, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define the delivery price interface
interface DeliveryPrice {
  id: number;
  wilayaId: string;
  wilayaName: string;
  deskPrice: number;
  doorstepPrice: number;
  createdAt: string;
  updatedAt: string;
}

interface EditableDeliveryPrice {
  id: number | null;
  wilayaId: string;
  deskPrice: number;
  doorstepPrice: number;
}

export default function LocationData() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWilayas, setFilteredWilayas] = useState(wilayas);
  const [filteredCommunes, setFilteredCommunes] = useState<typeof communes>([]); // Too many to show all
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Delivery prices state
  const [editingDeliveryPrice, setEditingDeliveryPrice] = useState<EditableDeliveryPrice | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Query to fetch delivery prices
  const { 
    data: deliveryPrices = [], 
    isLoading: isLoadingDeliveryPrices, 
    error: deliveryPricesError 
  } = useQuery<DeliveryPrice[]>({
    queryKey: ['/api/delivery-prices'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Mutation to bulk import delivery prices
  const bulkImportDeliveryPricesMutation = useMutation({
    mutationFn: async (prices: {wilayaId: string, wilayaName: string, deskPrice: number, doorstepPrice: number}[]) => {
      const response = await fetch('/api/delivery-prices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-prices'] });
      toast({
        title: 'Success',
        description: `${data.results.created} prices created, ${data.results.updated} prices updated.`,
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import delivery prices',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to create a new delivery price
  const createDeliveryPriceMutation = useMutation({
    mutationFn: async (priceData: Omit<EditableDeliveryPrice, 'id'>) => {
      const wilaya = wilayas.find(w => w.id === priceData.wilayaId);
      if (!wilaya) throw new Error('Wilaya not found');
      
      const data = {
        wilayaId: priceData.wilayaId,
        wilayaName: wilaya.name,
        deskPrice: priceData.deskPrice,
        doorstepPrice: priceData.doorstepPrice
      };
      
      const response = await fetch('/api/delivery-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-prices'] });
      toast({
        title: 'Success',
        description: 'Delivery price has been created.',
        variant: 'default',
      });
      setEditMode(false);
      setEditingDeliveryPrice(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create delivery price',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to update an existing delivery price
  const updateDeliveryPriceMutation = useMutation({
    mutationFn: async (priceData: EditableDeliveryPrice) => {
      if (priceData.id === null) throw new Error('Invalid delivery price ID');
      
      const response = await fetch(`/api/delivery-prices/${priceData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deskPrice: priceData.deskPrice,
          doorstepPrice: priceData.doorstepPrice
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-prices'] });
      toast({
        title: 'Success',
        description: 'Delivery price has been updated.',
        variant: 'default',
      });
      setEditMode(false);
      setEditingDeliveryPrice(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update delivery price',
        variant: 'destructive',
      });
    }
  });
  
  // Effect to check for data
  useEffect(() => {
    setDataLoaded(wilayas.length > 0 && communes.length > 0);
  }, [wilayas, communes]);
  
  // Effect for wilaya filtering
  useEffect(() => {
    if (searchTerm) {
      setFilteredWilayas(
        wilayas.filter(wilaya => 
          wilaya.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wilaya.id.includes(searchTerm)
        )
      );
    } else {
      setFilteredWilayas(wilayas);
    }
  }, [searchTerm, wilayas]);
  
  // Effect for commune filtering
  useEffect(() => {
    if (selectedWilaya) {
      const communesForWilaya = communes.filter(commune => commune.wilayaId === selectedWilaya);
      
      if (searchTerm) {
        setFilteredCommunes(
          communesForWilaya.filter(commune => 
            commune.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      } else {
        setFilteredCommunes(communesForWilaya);
      }
    } else if (searchTerm) {
      // If no wilaya selected but search term exists, filter all communes
      setFilteredCommunes(
        communes.filter(commune => 
          commune.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 100) // Limit to not overwhelm the UI
      );
    } else {
      // If no wilaya selected and no search term, show nothing (too many to display)
      setFilteredCommunes([]);
    }
  }, [selectedWilaya, searchTerm, communes]);
  
  const handleWilayaClick = (wilayaId: string) => {
    setSelectedWilaya(wilayaId === selectedWilaya ? null : wilayaId);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Start editing a delivery price
  const startEditingDeliveryPrice = (price: DeliveryPrice) => {
    setEditingDeliveryPrice({
      id: price.id,
      wilayaId: price.wilayaId,
      deskPrice: price.deskPrice,
      doorstepPrice: price.doorstepPrice
    });
    setEditMode(true);
  };
  
  // Start creating a new delivery price
  const startCreatingDeliveryPrice = (wilayaId: string) => {
    setEditingDeliveryPrice({
      id: null,
      wilayaId,
      deskPrice: 0,
      doorstepPrice: 0
    });
    setEditMode(true);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingDeliveryPrice(null);
    setEditMode(false);
  };
  
  // Save delivery price (create or update)
  const saveDeliveryPrice = () => {
    if (!editingDeliveryPrice) return;
    
    if (editingDeliveryPrice.id === null) {
      // Create new
      createDeliveryPriceMutation.mutate({
        wilayaId: editingDeliveryPrice.wilayaId,
        deskPrice: editingDeliveryPrice.deskPrice,
        doorstepPrice: editingDeliveryPrice.doorstepPrice
      });
    } else {
      // Update existing
      updateDeliveryPriceMutation.mutate(editingDeliveryPrice);
    }
  };
  
  // Handle price input change
  const handlePriceChange = (field: 'deskPrice' | 'doorstepPrice', value: string) => {
    if (!editingDeliveryPrice) return;
    
    const numericValue = value === '' ? 0 : Number(value);
    
    setEditingDeliveryPrice({
      ...editingDeliveryPrice,
      [field]: numericValue
    });
  };
  
  // Handle bulk import of all delivery prices
  const handleImportAllDeliveryPrices = () => {
    // Raw data provided by user
    const deliveryData = [
      {wilayaId: "1", wilayaName: "Adrar", doorstepPrice: 1100, deskPrice: 500},
      {wilayaId: "2", wilayaName: "Chlef", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "3", wilayaName: "Laghouat", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "4", wilayaName: "Oum-El-Bouaghi", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "5", wilayaName: "Batna", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "6", wilayaName: "Béjaïa", doorstepPrice: 700, deskPrice: 400},
      {wilayaId: "7", wilayaName: "Biskra", doorstepPrice: 750, deskPrice: 400},
      {wilayaId: "8", wilayaName: "Béchar", doorstepPrice: 1050, deskPrice: 400},
      {wilayaId: "9", wilayaName: "Blida", doorstepPrice: 750, deskPrice: 400},
      {wilayaId: "10", wilayaName: "Bouira", doorstepPrice: 750, deskPrice: 400},
      {wilayaId: "11", wilayaName: "Tamanrasset", doorstepPrice: 1650, deskPrice: 0},
      {wilayaId: "12", wilayaName: "Tébessa", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "13", wilayaName: "Tlemcen", doorstepPrice: 750, deskPrice: 400},
      {wilayaId: "14", wilayaName: "Tiaret", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "15", wilayaName: "Tizi-Ouzou", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "16", wilayaName: "Alger", doorstepPrice: 700, deskPrice: 400},
      {wilayaId: "17", wilayaName: "Djelfa", doorstepPrice: 850, deskPrice: 400},
      {wilayaId: "18", wilayaName: "Jijel", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "19", wilayaName: "Saïda", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "20", wilayaName: "Skikda", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "21", wilayaName: "Sidi Bel Abbès", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "22", wilayaName: "Annaba", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "23", wilayaName: "Guelma", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "24", wilayaName: "Constantine", doorstepPrice: 700, deskPrice: 400},
      {wilayaId: "25", wilayaName: "Médéa", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "26", wilayaName: "Mostaganem", doorstepPrice: 750, deskPrice: 400},
      {wilayaId: "27", wilayaName: "Msila", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "28", wilayaName: "Mascara", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "30", wilayaName: "Ouargla", doorstepPrice: 750, deskPrice: 400},
      {wilayaId: "31", wilayaName: "Oran", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "32", wilayaName: "El Bayadh", doorstepPrice: 800, deskPrice: 450},
      {wilayaId: "33", wilayaName: "Illizi", doorstepPrice: 1400, deskPrice: 700},
      {wilayaId: "34", wilayaName: "Bordj Bou Arreridj", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "35", wilayaName: "Boumerdès", doorstepPrice: 700, deskPrice: 400},
      {wilayaId: "36", wilayaName: "El-Tarf", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "37", wilayaName: "Tindouf", doorstepPrice: 1800, deskPrice: 500},
      {wilayaId: "38", wilayaName: "Tissemsilt", doorstepPrice: 850, deskPrice: 450},
      {wilayaId: "39", wilayaName: "El-Oued", doorstepPrice: 950, deskPrice: 500},
      {wilayaId: "40", wilayaName: "Khenchela", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "41", wilayaName: "Souk-Ahras", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "42", wilayaName: "Tipaza", doorstepPrice: 750, deskPrice: 400},
      {wilayaId: "43", wilayaName: "Mila", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "44", wilayaName: "Aïn-Defla", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "45", wilayaName: "Naâma", doorstepPrice: 950, deskPrice: 500},
      {wilayaId: "46", wilayaName: "Aïn-Témouchent", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "47", wilayaName: "Ghardaïa", doorstepPrice: 850, deskPrice: 400},
      {wilayaId: "48", wilayaName: "Relizane", doorstepPrice: 800, deskPrice: 400},
      {wilayaId: "49", wilayaName: "Timimoun", doorstepPrice: 950, deskPrice: 500},
      {wilayaId: "50", wilayaName: "Bordj Badji Mokhtar", doorstepPrice: 1800, deskPrice: 500},
      {wilayaId: "51", wilayaName: "Ouled Djellal", doorstepPrice: 950, deskPrice: 500},
      {wilayaId: "52", wilayaName: "Beni Abbès", doorstepPrice: 950, deskPrice: 500},
      {wilayaId: "53", wilayaName: "In Salah", doorstepPrice: 1350, deskPrice: 650},
      {wilayaId: "54", wilayaName: "In Guezzam", doorstepPrice: 1350, deskPrice: 650},
      {wilayaId: "55", wilayaName: "Touggourt", doorstepPrice: 950, deskPrice: 500},
      {wilayaId: "56", wilayaName: "Djanet", doorstepPrice: 1350, deskPrice: 650},
      {wilayaId: "57", wilayaName: "El-M'Ghair", doorstepPrice: 950, deskPrice: 500},
      {wilayaId: "58", wilayaName: "El Meniaa", doorstepPrice: 950, deskPrice: 500}
    ];
    
    // Confirm with user before making changes
    const existingPrices = deliveryPrices.length;
    const confirmMsg = existingPrices > 0 
      ? `This will update ${existingPrices} existing delivery prices and add new ones. Continue?` 
      : 'This will add delivery prices for all wilayas. Continue?';
      
    if (window.confirm(confirmMsg)) {
      bulkImportDeliveryPricesMutation.mutate(deliveryData);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Why Location Data Is Important</h2>
        <p className="text-sm text-gray-600 mb-4">
          Accurate location data is essential for order processing and delivery management. The system requires wilaya (province) and commune (municipality) information to:
        </p>
        <ul className="list-disc ml-6 text-sm text-gray-600 space-y-1 mb-2">
          <li>Enable customers to select their correct delivery location</li>
          <li>Organize shipments by geographic region</li>
          <li>Calculate appropriate delivery fees based on location</li>
          <li>Provide accurate delivery information to shipping partners</li>
        </ul>
        <p className="text-sm text-gray-600 font-medium">
          You must upload location data before creating orders or the order form will display an error.
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2">
          <AlgeriaDataUploader />
        </div>
        
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Location Data Status</CardTitle>
              <CardDescription>
                Overview of the Algeria wilayas and communes data available in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-primary-700">{wilayas.length}</div>
                    <div className="text-sm text-primary-800">Wilayas</div>
                  </div>
                  
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-primary-700">{communes.length}</div>
                    <div className="text-sm text-primary-800">Communes</div>
                  </div>
                </div>
                
                <div className="pt-2">
                  {dataLoaded ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Data Loaded
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      No Data Available
                    </Badge>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {dataLoaded 
                      ? 'Location data is loaded and ready for use in the application.' 
                      : 'Please upload location data using the uploader to enable location selection features.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Browse Location Data</CardTitle>
          <CardDescription>
            View and search through the available wilayas and communes.
          </CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search locations..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            
            {selectedWilaya && (
              <Button variant="outline" onClick={() => setSelectedWilaya(null)}>
                Clear Wilaya Filter
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {dataLoaded ? (
            <Tabs defaultValue="wilayas">
              <TabsList className="mb-4">
                <TabsTrigger value="wilayas">Wilayas</TabsTrigger>
                <TabsTrigger value="communes">Communes</TabsTrigger>
                <TabsTrigger value="deliveryPrices">Delivery Prices</TabsTrigger>
              </TabsList>
              
              <TabsContent value="wilayas">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Number of Communes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWilayas.length > 0 ? (
                        filteredWilayas.map((wilaya) => {
                          const communeCount = communes.filter(c => c.wilayaId === wilaya.id).length;
                          return (
                            <TableRow 
                              key={wilaya.id}
                              className={`cursor-pointer ${selectedWilaya === wilaya.id ? 'bg-primary-50' : ''}`}
                              onClick={() => handleWilayaClick(wilaya.id)}
                            >
                              <TableCell>{wilaya.id}</TableCell>
                              <TableCell>{wilaya.name}</TableCell>
                              <TableCell>{communeCount}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                            {wilayas.length === 0 
                              ? 'No wilayas data available. Please upload data first.' 
                              : 'No wilayas match the search criteria.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="communes">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Wilaya Code</TableHead>
                        <TableHead>Wilaya Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCommunes.length > 0 ? (
                        filteredCommunes.map((commune) => {
                          const wilaya = wilayas.find(w => w.id === commune.wilayaId);
                          return (
                            <TableRow key={commune.id}>
                              <TableCell>{commune.name}</TableCell>
                              <TableCell>{commune.wilayaId}</TableCell>
                              <TableCell>{wilaya?.name || 'Unknown'}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                            {communes.length === 0 
                              ? 'No communes data available. Please upload data first.' 
                              : selectedWilaya 
                                ? 'No communes match the search criteria for the selected wilaya.' 
                                : 'Please select a wilaya or enter a search term to view communes.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {filteredCommunes.length > 0 && filteredCommunes.length < communes.length && !selectedWilaya && (
                  <div className="mt-2 text-sm text-gray-500 italic">
                    Showing {filteredCommunes.length} communes. Please select a wilaya or refine your search to see more specific results.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="deliveryPrices">
                {isLoadingDeliveryPrices ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : deliveryPricesError ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      Failed to load delivery prices. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Delivery Prices</h3>
                        <p className="text-sm text-gray-500">
                          Set custom delivery prices for each wilaya. Prices will be automatically used when creating orders.
                        </p>
                      </div>
                      
                      {!editMode && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleImportAllDeliveryPrices}
                            disabled={bulkImportDeliveryPricesMutation.isPending || !dataLoaded || wilayas.length === 0}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {bulkImportDeliveryPricesMutation.isPending ? 'Importing...' : 'Import All Prices'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => startCreatingDeliveryPrice(selectedWilaya || filteredWilayas[0]?.id)}
                            disabled={!dataLoaded || wilayas.length === 0}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Price
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {editMode ? (
                      <div className="bg-primary-50 p-4 border border-primary-200 rounded-md mb-4">
                        <h4 className="text-primary-800 font-medium mb-3">
                          {editingDeliveryPrice?.id ? 'Edit Delivery Price' : 'Add New Delivery Price'}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Wilaya
                            </label>
                            <select
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={editingDeliveryPrice?.wilayaId || ''}
                              disabled={!!editingDeliveryPrice?.id}
                              onChange={(e) => {
                                if (!editingDeliveryPrice) return;
                                setEditingDeliveryPrice({
                                  ...editingDeliveryPrice,
                                  wilayaId: e.target.value
                                });
                              }}
                            >
                              {wilayas.map(wilaya => (
                                <option key={wilaya.id} value={wilaya.id}>
                                  {wilaya.name} ({wilaya.id})
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Desk Price (DZD)
                              </label>
                              <Input
                                type="number"
                                min="0"
                                value={editingDeliveryPrice?.deskPrice ?? 0}
                                onChange={(e) => handlePriceChange('deskPrice', e.target.value)}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Doorstep Price (DZD)
                              </label>
                              <Input
                                type="number"
                                min="0"
                                value={editingDeliveryPrice?.doorstepPrice ?? 0}
                                onChange={(e) => handlePriceChange('doorstepPrice', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={saveDeliveryPrice}
                            disabled={createDeliveryPriceMutation.isPending || updateDeliveryPriceMutation.isPending}
                          >
                            {(createDeliveryPriceMutation.isPending || updateDeliveryPriceMutation.isPending) ? (
                              <div className="flex items-center">
                                <span className="mr-2">Saving...</span>
                              </div>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Wilaya</TableHead>
                            <TableHead>Desk Delivery Price</TableHead>
                            <TableHead>Doorstep Delivery Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliveryPrices.length > 0 ? (
                            // Sort by wilaya ID (numeric order)
                            [...deliveryPrices]
                              .sort((a, b) => parseInt(a.wilayaId) - parseInt(b.wilayaId))
                              .map((price) => {
                                return (
                                  <TableRow key={price.id}>
                                    <TableCell>
                                      <div className="font-medium">{price.wilayaName}</div>
                                      <div className="text-xs text-gray-500">Code: {price.wilayaId}</div>
                                    </TableCell>
                                    <TableCell>{price.deskPrice.toLocaleString()} DZD</TableCell>
                                    <TableCell>{price.doorstepPrice.toLocaleString()} DZD</TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditingDeliveryPrice(price)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                  <div className="bg-gray-100 p-3 rounded-full">
                                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                                  </div>
                                  <h3 className="font-medium">No delivery prices set</h3>
                                  <p className="text-sm text-gray-500 max-w-md">
                                    Delivery prices have not been configured yet. Click the "Add Price" button to set delivery prices for wilayas.
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {!editMode && deliveryPrices.length > 0 && (
                      <div className="mt-4 flex justify-between items-center">
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">{deliveryPrices.length}</span> delivery prices configured
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">No location data available.</p>
              <p className="text-sm text-gray-500">
                Please upload Algeria location data using the uploader above to enable browsing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}