import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CsvParser } from "@/components/ui/csv-parser";
import { 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronLeft, 
  ChevronUp, 
  XCircle 
} from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Book schema for validation
const bookSchema = z.object({
  title: z.string().min(1, "Title is required").optional().default("Unknown"),
  author: z.string().optional().default("Unknown"),
  publisher: z.string().optional().default("Unknown"),
  price: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? 0 : Number(val),
    z.number().min(0, "Price cannot be negative").default(0)
  ),
  buyPrice: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? 0 : Number(val),
    z.number().min(0, "Buy price cannot be negative").default(0)
  ),
  quantityBought: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? 0 : Number(val),
    z.number().min(0, "Quantity bought cannot be negative").default(0)
  ),
  quantityLeft: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? 0 : Number(val),
    z.number().min(0, "Quantity left cannot be negative").default(0)
  ),
});

// Import response with error information
interface ImportResponse {
  books: any[];
  importSummary: {
    totalAttempted: number;
    successfulImports: number;
    failedImports: number;
    errors: string[];
  };
}

export default function ImportCsv() {
  const [isImported, setIsImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Import books mutation with improved error handling
  const importBooks = useMutation({
    mutationFn: async (books: any[]): Promise<ImportResponse> => {
      const response = await apiRequest("/api/books/import", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(books)
      });
      return response as unknown as ImportResponse;
    },
    onSuccess: (data, variables) => {
      // The response now contains an importSummary field
      const summary = data.importSummary || {
        successfulImports: data.books?.length || 0,
        failedImports: 0,
        totalAttempted: variables.length,
        errors: []
      };
      
      // Store any errors for display
      if (summary.errors && summary.errors.length > 0) {
        setImportErrors(summary.errors);
        setShowErrors(true);
      } else {
        setImportErrors([]);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setImportedCount(summary.successfulImports);
      setIsImported(true);
      
      // Display appropriate message based on success/failure ratio
      if (summary.failedImports === 0) {
        toast({
          title: "Books imported successfully",
          description: `All ${summary.successfulImports} books have been added to your inventory.`,
        });
      } else if (summary.successfulImports > 0) {
        toast({
          title: "Partial import completed",
          description: `${summary.successfulImports} books were imported successfully. ${summary.failedImports} books had errors and were skipped.`,
          variant: "default",
        });
        
        // If there are errors, show a separate toast with details
        if (summary.errors && summary.errors.length > 0) {
          const errorCount = summary.errors.length;
          toast({
            title: `${errorCount} error${errorCount !== 1 ? 's' : ''} occurred during import`,
            description: `Check the error details below for more information.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Import failed",
          description: `None of the books could be imported. Please check the errors and try again.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      // Try to extract error information if possible
      let errorMessages: string[] = [];
      
      if (error instanceof Error) {
        try {
          // Check if there's structured error data
          const errorData = JSON.parse(error.message);
          if (errorData.importSummary?.errors) {
            errorMessages = errorData.importSummary.errors;
          } else {
            errorMessages = [error.message];
          }
        } catch {
          // Not JSON, just use the raw message
          errorMessages = [error.message];
        }
      } else {
        errorMessages = ["Unknown error occurred during import"];
      }
      
      setImportErrors(errorMessages);
      setShowErrors(true);
      
      toast({
        title: "Error importing books",
        description: "Failed to import books. Check the error details below.",
        variant: "destructive",
      });
    },
  });

  // Handle data mapping from CSV
  const handleMappedData = useCallback(
    (data: any[]) => {
      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No valid data found to import. Please check your CSV file.",
          variant: "destructive",
        });
        return;
      }

      // Process in smaller batches to avoid request size issues
      const batchSize = 50; // Import 50 books at a time
      const processBatches = async (allData: any[]) => {
        // Validate and transform data
        const validBooks = [];
        const invalidEntries = [];

        for (const book of allData) {
          try {
            // Check if the book has minimal required data - only title is truly required
            if (!book.title) {
              invalidEntries.push(book);
              continue;
            }
            
            // Validate and transform
            const validatedBook = bookSchema.parse(book);
            validBooks.push(validatedBook);
          } catch (error) {
            console.error("Validation error:", error);
            invalidEntries.push(book);
          }
        }

        if (validBooks.length === 0) {
          toast({
            title: "Validation Error",
            description: "No valid books found. Please check your CSV file format and try again.",
            variant: "destructive",
          });
          return;
        }

        // Show warning if some entries were invalid
        if (invalidEntries.length > 0) {
          toast({
            title: "Partial Import",
            description: `${invalidEntries.length} entries had invalid data and were skipped. ${validBooks.length} valid books will be imported.`,
          });
        }

        // Import books in batches
        let importedCount = 0;
        const totalBatches = Math.ceil(validBooks.length / batchSize);
        
        toast({
          title: "Starting Import",
          description: `Importing ${validBooks.length} books in ${totalBatches} batches...`,
        });
        
        for (let i = 0; i < validBooks.length; i += batchSize) {
          const batchNumber = Math.floor(i / batchSize) + 1;
          const batch = validBooks.slice(i, i + batchSize);
          
          try {
            await importBooks.mutateAsync(batch);
            importedCount += batch.length;
            
            if (batchNumber < totalBatches) {
              toast({
                title: "Import Progress",
                description: `Batch ${batchNumber}/${totalBatches} complete. Imported ${importedCount} of ${validBooks.length} books.`,
              });
            }
          } catch (error) {
            toast({
              title: `Error in Batch ${batchNumber}`,
              description: `Failed to import batch: ${(error as Error).message}`,
              variant: "destructive",
            });
          }
        }
        
        // Update successful import count and show final message
        setImportedCount(importedCount);
        setIsImported(true);
        queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      };
      
      // Start the batch processing
      processBatches(data);
    },
    [importBooks, toast, queryClient],
  );

  // Required fields and their labels
  // Only title is truly required, others are optional with defaults
  const requiredFields = [
    "title",
  ];
  const fieldLabels = {
    title: "Book Title",
    author: "Author",
    publisher: "Publisher",
    price: "Sale Price",
    buyPrice: "Buy Price",
    quantityBought: "Quantity Bought",
    quantityLeft: "Quantity Left",
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">CSV Import</h2>
        <p className="text-sm text-gray-500">
          Upload and map your Excel data to import books into the inventory
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {isImported ? (
            <div className="flex flex-col items-center py-10">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Import Successful!
              </h3>
              <p className="text-center text-gray-600 mb-6">
                {importedCount} books have been successfully imported to your
                inventory.
              </p>
              <div className="flex space-x-4">
                <Link href="/inventory">
                  <Button className="bg-primary-300 hover:bg-primary-400 text-white">
                    View Inventory
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setIsImported(false)}>
                  Import More Books
                </Button>
              </div>
              
              {/* Display error details if there are any */}
              {importErrors.length > 0 && (
                <div className="mt-6 w-full">
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Import completed with errors</AlertTitle>
                    <AlertDescription>
                      Some books couldn't be imported due to errors. See details below.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div 
                      className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer"
                      onClick={() => setShowErrors(!showErrors)}
                    >
                      <h3 className="font-medium text-gray-900">
                        {importErrors.length} Error{importErrors.length !== 1 ? 's' : ''}
                      </h3>
                      {showErrors ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    
                    {showErrors && (
                      <div className="p-3 bg-white max-h-64 overflow-y-auto">
                        <Accordion type="single" collapsible className="w-full">
                          {importErrors.map((error, index) => (
                            <AccordionItem key={index} value={`error-${index}`}>
                              <AccordionTrigger className="text-sm text-red-600 hover:text-red-800">
                                <div className="flex items-center">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Error {index + 1}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
                                  {error}
                                </pre>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <CsvParser
              onDataMapped={handleMappedData}
              requiredFields={requiredFields}
              fieldLabels={fieldLabels}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
