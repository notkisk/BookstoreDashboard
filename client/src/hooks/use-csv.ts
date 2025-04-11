import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface UseCsvResult {
  csvData: Record<string, any>[];
  headers: string[] | null;
  parseCSV: (file: File) => void;
  loading: boolean;
  error: Error | null;
  mappedData: Record<string, any>[];
  mapHeaders: (mapping: Record<string, string>) => void;
  previewData: Record<string, any>[];
}

export function useCsv(): UseCsvResult {
  const [csvData, setCsvData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [mappedData, setMappedData] = useState<Record<string, any>[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);

  const parseCSV = useCallback((file: File) => {
    setLoading(true);
    setError(null);

    // Handle Excel files
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            setError(new Error('The Excel file is empty or has no data.'));
            setLoading(false);
            return;
          }
          
          const headers = jsonData[0] as string[];
          if (!headers || headers.length === 0) {
            setError(new Error('Could not detect headers in the Excel file.'));
            setLoading(false);
            return;
          }
          
          // Convert array data to object with headers as keys
          const rows = jsonData.slice(1).map((row: any) => {
            const obj: Record<string, any> = {};
            headers.forEach((header, i) => {
              obj[header] = row[i];
            });
            return obj;
          });
          
          setCsvData(rows);
          setHeaders(headers);
          setLoading(false);
        } catch (error) {
          setError(error instanceof Error ? error : new Error('Failed to parse Excel file'));
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError(new Error('Failed to read Excel file'));
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    } 
    // Handle CSV files
    else {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(new Error(results.errors[0].message));
            setLoading(false);
            return;
          }
          
          const data = results.data as Record<string, any>[];
          if (data.length === 0) {
            setError(new Error('The CSV file is empty or has no data.'));
            setLoading(false);
            return;
          }
          
          setCsvData(data);
          setHeaders(results.meta.fields || []);
          setLoading(false);
        },
        error: (error) => {
          setError(error);
          setLoading(false);
        }
      });
    }
  }, []);

  // Map CSV headers to desired field names
  const mapHeaders = useCallback((mapping: Record<string, string>) => {
    if (!csvData.length) return;
    
    try {
      // Create a reversed mapping from CSV header to field name
      const reverseMapping: Record<string, string> = {};
      Object.entries(mapping).forEach(([fieldName, csvHeader]) => {
        if (csvHeader && csvHeader.trim() !== " ") {
          reverseMapping[csvHeader] = fieldName;
        }
      });
      
      // Process the data in chunks to prevent memory issues with large datasets
      const chunkSize = 100; // Process 100 rows at a time
      const totalChunks = Math.ceil(csvData.length / chunkSize);
      let mapped: Record<string, any>[] = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startIndex = chunkIndex * chunkSize;
        const endIndex = Math.min(startIndex + chunkSize, csvData.length);
        const chunk = csvData.slice(startIndex, endIndex);
        
        // Map data using the provided mapping
        const mappedChunk = chunk.map(row => {
          const newRow: Record<string, any> = {};
          
          // Only include mapped fields and clean the data
          Object.entries(row).forEach(([csvHeader, value]) => {
            const fieldName = reverseMapping[csvHeader];
            if (fieldName) {
              // Clean and normalize the value
              if (value === null || value === undefined) {
                // Handle null/undefined values but don't set them as empty string
                // to allow schema default values to work
              } else if (typeof value === 'string') {
                // For numeric fields, attempt to convert string to number
                if (['price', 'buyPrice', 'quantityBought', 'quantityLeft'].includes(fieldName)) {
                  // First clean the string - remove currency symbols, commas, and spaces
                  const cleanedValue = value.trim().replace(/[^\d.-]/g, '');
                  // Try to parse as number
                  const numValue = parseFloat(cleanedValue);
                  if (!isNaN(numValue)) {
                    newRow[fieldName] = numValue;
                  } else {
                    // Keep as string if it can't be parsed as number
                    newRow[fieldName] = cleanedValue || "0";
                  }
                } else {
                  // For non-numeric fields, just trim whitespace
                  newRow[fieldName] = value.trim();
                }
              } else {
                // Keep other values as is
                newRow[fieldName] = value;
              }
            }
          });
          
          return newRow;
        });
        
        mapped = [...mapped, ...mappedChunk];
      }
      
      // Filter out completely empty rows (no values at all)
      const filteredMapped = mapped.filter(row => {
        return Object.values(row).some(value => 
          value !== null && value !== undefined && value !== '');
      });
      
      setMappedData(filteredMapped);
      setPreviewData(filteredMapped.slice(0, 5)); // Only show first 5 for preview
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to map headers'));
    }
  }, [csvData]);

  return {
    csvData,
    headers,
    parseCSV,
    loading,
    error,
    mappedData,
    mapHeaders,
    previewData
  };
}
