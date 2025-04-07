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
  title: z.string().min(1, "Title is required"),
  author: z.string().min(0, "Author is required"),
  publisher: z.string().min(0, "Publisher is required"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  buyPrice: z.coerce.number().min(1, "Buy price must be greater than 0"),
  quantityBought: z.coerce
    .number()
    .min(1, "Quantity bought must be at least 1"),
  quantityLeft: z.coerce.number().min(0, "Quantity left cannot be negative"),
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
      // Validate and transform data
      try {
        const validBooks = data.map((book) => {
          // Validate book data
          const validatedBook = bookSchema.parse(book);
          return validatedBook;
        });

        // Import books
        importBooks.mutate(validBooks);
      } catch (error) {
        toast({
          title: "Validation Error",
          description:
            "Some books have invalid data. Please check your CSV file and try again.",
          variant: "destructive",
        });
      }
    },
    [importBooks, toast],
  );

  // Required fields and their labels
  const requiredFields = [
    "title",
    "author",
    "publisher",
    "price",
    "buyPrice",
    "quantityBought",
    "quantityLeft",
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
