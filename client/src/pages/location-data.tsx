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
import { Search, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LocationData() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWilayas, setFilteredWilayas] = useState(wilayas);
  const [filteredCommunes, setFilteredCommunes] = useState<typeof communes>([]); // Too many to show all
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
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