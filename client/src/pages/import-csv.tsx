import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CsvParser } from "@/components/ui/csv-parser";
import { CheckCircle, ChevronLeft } from "lucide-react";
import { z } from "zod";

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

export default function ImportCsv() {
  const [isImported, setIsImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Import books mutation
  const importBooks = useMutation({
    mutationFn: async (books: any[]) => {
      return apiRequest("POST", "/api/books/import", books);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setImportedCount(variables.length);
      setIsImported(true);
      toast({
        title: "Books imported successfully",
        description: `${variables.length} books have been added to your inventory.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error importing books",
        description: error.message,
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

      // Validate and transform data
      const validBooks = [];
      const invalidEntries = [];

      for (const book of data) {
        try {
          // Check if the book has minimal required data
          if (!book.title && !book.author) {
            invalidEntries.push(book);
            continue;
          }
          
          // Validate and transform
          const validatedBook = bookSchema.parse(book);
          validBooks.push(validatedBook);
        } catch (error) {
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

      // Import valid books
      importBooks.mutate(validBooks);
    },
    [importBooks, toast],
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
