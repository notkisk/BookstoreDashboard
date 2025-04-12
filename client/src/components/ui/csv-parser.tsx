import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, AlertTriangle, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCsv } from '@/hooks/use-csv';

interface CsvParserProps {
  onDataMapped: (mappedData: any[]) => void;
  requiredFields: string[];
  fieldLabels: Record<string, string>;
}

export function CsvParser({ onDataMapped, requiredFields, fieldLabels }: CsvParserProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    csvData, 
    headers, 
    parseCSV, 
    loading,
    mappedData,
    mapHeaders,
    previewData,
  } = useCsv();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload a CSV or Excel file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    parseCSV(file);
  }, [parseCSV]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setError(null);
    
    const file = event.dataTransfer.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload a CSV or Excel file');
      return;
    }
    
    parseCSV(file);
  }, [parseCSV]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const goToMappingStep = useCallback(() => {
    if (!headers || headers.length === 0) {
      setError('Invalid CSV file: No headers found');
      return;
    }
    
    setStep('mapping');
  }, [headers]);

  const handleMapping = useCallback(() => {
    // Only title is truly required, the rest can use defaults
    const essentialFields = ["title"];
    const missingEssentialFields = essentialFields.filter(field => 
      !mappings[field] || mappings[field].trim() === " ");
    
    if (missingEssentialFields.length > 0) {
      setError(`Please map at least the Book Title field to continue`);
      return;
    }
    
    // Warn about recommended fields
    const recommendedFields = ["author", "price", "quantityBought"];
    const missingRecommendedFields = recommendedFields.filter(field => 
      !mappings[field] || mappings[field].trim() === " ");
    
    // Proceed with mapping
    mapHeaders(mappings);
    setStep('preview');
    
    // Show warning toast for missing recommended fields
    if (missingRecommendedFields.length > 0 && missingRecommendedFields.length < recommendedFields.length) {
      setError(`Note: Some recommended fields are not mapped and will use default values.`);
    }
  }, [mappings, mapHeaders]);

  const handleFinish = useCallback(() => {
    onDataMapped(mappedData);
  }, [mappedData, onDataMapped]);

  const renderStepIndicator = () => (
    <div className="flex items-center overflow-x-auto py-4 mb-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${step === 'upload' ? 'bg-primary-300 text-white' : 'bg-gray-300 text-gray-600'}`}>
          1
        </div>
        <div className="ml-2 mr-4">
          <p className={`text-sm font-medium ${step === 'upload' ? 'text-primary-600' : 'text-gray-500'}`}>
            Upload CSV
          </p>
        </div>
        <div className="h-0.5 w-8 bg-gray-300"></div>
      </div>
      
      <div className="flex items-center">
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${step === 'mapping' ? 'bg-primary-300 text-black' : 'bg-gray-300 text-gray-600'}`}>
          2
        </div>
        <div className="ml-2 mr-4">
          <p className={`text-sm font-medium ${step === 'mapping' ? 'text-primary-600' : 'text-gray-500'}`}>
            Map Columns
          </p>
        </div>
        <div className="h-0.5 w-8 bg-gray-300"></div>
      </div>
      
      <div className="flex items-center">
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${step === 'preview' ? 'bg-primary-300 text-black' : 'bg-gray-300 text-gray-600'}`}>
          3
        </div>
        <div className="ml-2">
          <p className={`text-sm font-medium ${step === 'preview' ? 'text-primary-600' : 'text-gray-500'}`}>
            Preview & Import
          </p>
        </div>
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <>
      <div 
        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
              <span>Upload a file</span>
              <Input 
                id="file-upload" 
                name="file-upload" 
                type="file" 
                className="sr-only" 
                accept=".csv,.xlsx,.xls" 
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">CSV, Excel (.xlsx, .xls) up to 10MB</p>
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-center text-sm text-gray-600">
          <div className="animate-pulse">Processing file...</div>
        </div>
      )}

      {csvData && headers && headers.length > 0 && (
        <div className="mt-6">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              CSV file loaded successfully. Found {headers.length} columns and {csvData.length} rows.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 bg-gray-50 rounded-md p-4 overflow-auto max-h-60">
            <p className="font-medium text-sm mb-2">File Preview (First 3 rows):</p>
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header, idx) => (
                    <TableHead key={idx} className="text-xs">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.slice(0, 3).map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {Object.values(row).map((cell, cellIdx) => (
                      <TableCell key={cellIdx} className="text-xs py-2">{String(cell)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="outline" disabled>
          Cancel
        </Button>
        
        <Button 
          onClick={goToMappingStep} 
          disabled={!csvData || loading}
          className="bg-primary-300 hover:bg-primary-400 text-black" variant="outline"
        >
          Next: Map Columns <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </>
  );

  const renderMappingStep = () => (
    <>
      <div className="space-y-6">
        <div className="bg-primary-50 p-4 rounded-md">
          <div className="flex">
            <FileText className="h-5 w-5 text-primary-600 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary-800">Mapping Instructions</h3>
              <div className="mt-2 text-sm text-primary-700">
                <p>For each field in your database, select the corresponding column from your CSV file. Required fields are marked with an asterisk (*).</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Object.entries(fieldLabels).map(([fieldKey, fieldLabel]) => (
            <div key={fieldKey} className="flex items-center space-x-2">
              <div className="w-1/3 text-sm font-medium">
                {fieldLabel} {fieldKey === "title" && <span className="text-red-500">*</span>}
              </div>
              <div className="w-2/3">
                <Select 
                  value={mappings[fieldKey] || " "}
                  onValueChange={(value) => setMappings({...mappings, [fieldKey]: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">-- Select a column --</SelectItem>
                    {headers?.map((header, idx) => (
                      <SelectItem key={idx} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setStep('upload')}
        >
          Back
        </Button>
        
        <Button 
          onClick={handleMapping}
          className="bg-primary-300 hover:bg-primary-400 text-black"
        >
          Next: Preview <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </>
  );

  const renderPreviewStep = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.values(fieldLabels).map((label, idx) => (
                    <TableHead key={idx}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 5).map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {Object.keys(fieldLabels).map((fieldKey, cellIdx) => (
                      <TableCell key={cellIdx}>
                        {row[fieldKey] !== undefined ? String(row[fieldKey]) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 bg-gray-50 p-3 rounded-md flex items-center">
            <FileText className="h-4 w-4 text-gray-500 mr-2" />
            <p className="text-sm text-gray-600">
              {csvData.length} rows will be imported. 
              {mappedData.length !== csvData.length && 
                ` (${csvData.length - mappedData.length} rows had validation errors and will be skipped)`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setStep('mapping')}
        >
          Back
        </Button>
        
        <Button 
          onClick={handleFinish}
          className="bg-primary-300 hover:bg-primary-400 text-black"
        >
          Import Data
        </Button>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {renderStepIndicator()}
      
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'preview' && renderPreviewStep()}
    </div>
  );
}
