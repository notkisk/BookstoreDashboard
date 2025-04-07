import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { processAlgeriaData } from '@/data/process-algeria-data';
import { updateLocationData } from '@/data/algeria';
import { useToast } from '@/hooks/use-toast';

export function AlgeriaDataUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ wilayas: number; communes: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setError(null);
      } else {
        setFile(null);
        setError('Please select an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload the file
      const response = await fetch('/api/location/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }
      
      const data = await response.json();
      
      // Process the uploaded file
      setUploading(false);
      setLoading(true);
      
      const { wilayas, communes } = await processAlgeriaData(data.file.path);
      
      // Update the location data
      updateLocationData(wilayas, communes);
      
      // Set success and stats
      setSuccess(true);
      setStats({
        wilayas: wilayas.length,
        communes: communes.length
      });
      
      setLoading(false);
      
      toast({
        title: 'Data uploaded successfully',
        description: `Processed ${wilayas.length} wilayas and ${communes.length} communes`,
      });
      
    } catch (err) {
      setUploading(false);
      setLoading(false);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      toast({
        title: 'Error uploading data',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Algeria Location Data</CardTitle>
        <CardDescription>
          Upload an Excel file containing wilayas and communes data for Algeria.
          <br /><br />
          The expected file format is a spreadsheet with columns for commune names and wilaya codes.
          Each row should contain a commune name followed by its corresponding wilaya code.
          <br /><br />
          Example format: "nom communes code wilayas" where each row has [commune name] [wilaya code]
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="algeriaData">Excel File</Label>
          <Input
            id="algeriaData"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={uploading || loading}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            <a href="/api/location/sample" className="text-primary underline" target="_blank" rel="noopener noreferrer">
              Download sample file
            </a> to see the expected format.
          </p>
        </div>
        
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading || loading}
          className="flex items-center gap-2"
        >
          {uploading && 'Uploading...'}
          {loading && 'Processing...'}
          {!uploading && !loading && (
            <>
              <Upload className="h-4 w-4" />
              Upload and Process
            </>
          )}
        </Button>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && stats && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">
              Processed {stats.wilayas} wilayas and {stats.communes} communes.
              The data is now available for use in the application.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}