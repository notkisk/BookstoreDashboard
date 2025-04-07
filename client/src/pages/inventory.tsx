import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  BookOpen, 
  Plus, 
  Upload, 
  Search, 
  Edit, 
  Trash2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Book type
interface Book {
  id: number;
  title: string;
  author: string;
  publisher: string;
  price: number;
  buyPrice: number;
  quantityBought: number;
  quantityLeft: number;
  createdAt: string;
  updatedAt: string;
}

// Book form schema
const bookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  publisher: z.string().min(1, "Publisher is required"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  buyPrice: z.coerce.number().min(1, "Buy price must be greater than 0"),
  quantityBought: z.coerce.number().min(1, "Quantity bought must be at least 1"),
  quantityLeft: z.coerce.number().min(0, "Quantity left cannot be negative"),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [sortBy, setSortBy] = useState<string>("title-asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch books
  const { data: books, isLoading } = useQuery({
    queryKey: ['/api/books'],
  });

  // Create book mutation
  const createBook = useMutation({
    mutationFn: async (book: BookFormValues) => {
      return apiRequest('POST', '/api/books', book);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      toast({
        title: "Book created",
        description: "The book has been added to inventory",
      });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update book mutation
  const updateBook = useMutation({
    mutationFn: async ({ id, book }: { id: number; book: BookFormValues }) => {
      return apiRequest('PUT', `/api/books/${id}`, book);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      toast({
        title: "Book updated",
        description: "The book has been updated successfully",
      });
      setDialogOpen(false);
      setEditBook(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete book mutation
  const deleteBook = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/books/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      toast({
        title: "Book deleted",
        description: "The book has been removed from inventory",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating/editing books
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: "",
      author: "",
      publisher: "",
      price: 0,
      buyPrice: 0,
      quantityBought: 1,
      quantityLeft: 1,
    },
  });

  // Reset form when dialog opens/closes
  const onDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditBook(null);
      form.reset();
    }
  };

  // Handle edit book
  const handleEditBook = (book: Book) => {
    setEditBook(book);
    form.reset({
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      price: book.price,
      buyPrice: book.buyPrice,
      quantityBought: book.quantityBought,
      quantityLeft: book.quantityLeft,
    });
    setDialogOpen(true);
  };

  // Handle delete book
  const handleDeleteBook = (id: number) => {
    if (window.confirm("Are you sure you want to delete this book?")) {
      deleteBook.mutate(id);
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = async (books: Book[]) => {
    if (window.confirm(`Are you sure you want to delete ${books.length} selected books?`)) {
      try {
        // Delete books one by one
        for (const book of books) {
          await deleteBook.mutateAsync(book.id);
        }
        
        setSelectedBooks([]);
        toast({
          title: "Books deleted",
          description: `Successfully deleted ${books.length} books`,
        });
      } catch (error) {
        toast({
          title: "Error deleting books",
          description: "There was an error deleting one or more books",
          variant: "destructive",
        });
      }
    }
  };

  // Handle form submission
  const onSubmit = (data: BookFormValues) => {
    if (editBook) {
      updateBook.mutate({ id: editBook.id, book: data });
    } else {
      createBook.mutate(data);
    }
  };

  // Table columns
  const columns = [
    {
      header: "Book Title",
      accessorKey: "title" as const,
      cell: (book: Book) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-gray-500" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{book.title}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Author",
      accessorKey: "author" as const,
    },
    {
      header: "Publisher",
      accessorKey: "publisher" as const,
    },
    {
      header: "Price",
      accessorKey: "price" as const,
      cell: (book: Book) => formatCurrency(book.price),
    },
    {
      header: "Buy Price",
      accessorKey: "buyPrice" as const,
      cell: (book: Book) => formatCurrency(book.buyPrice),
    },
    {
      header: "Stock",
      accessorKey: "quantityLeft" as const,
    },
    {
      header: "Sold",
      accessorKey: "quantityBought" as const,
      cell: (book: Book) => book.quantityBought - book.quantityLeft,
    },
    {
      header: "Actions",
      accessorKey: "id" as const,
      cell: (book: Book) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditBook(book)}
            className="text-primary-600 hover:text-primary-900 hover:bg-primary-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDeleteBook(book.id)}
            className="text-red-600 hover:text-red-900 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Sort books
  const sortedBooks = [...(books || [])].sort((a, b) => {
    const [field, direction] = sortBy.split('-');
    const modifier = direction === 'asc' ? 1 : -1;
    
    if (field === 'title') {
      return modifier * a.title.localeCompare(b.title);
    } else if (field === 'price') {
      return modifier * (a.price - b.price);
    } else if (field === 'stock') {
      return modifier * (a.quantityLeft - b.quantityLeft);
    }
    
    return 0;
  });

  // Search books
  const filteredBooks = searchQuery
    ? sortedBooks.filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.publisher.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedBooks;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Book Inventory</h2>
        <div className="flex space-x-3">
          <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-primary-300 hover:bg-primary-400 text-white">
                <Plus className="mr-1 h-4 w-4" /> Add Book
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editBook ? "Edit Book" : "Add New Book"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Book Title*</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author*</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="publisher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publisher*</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Price (DA)*</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="buyPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buy Price (DA)*</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantityBought"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity Bought*</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="quantityLeft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity Left*</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">Cancel</Button>
                    </DialogClose>
                    <Button 
                      type="submit" 
                      className="bg-primary-300 hover:bg-primary-400 text-white"
                      disabled={createBook.isPending || updateBook.isPending}
                    >
                      {editBook ? "Update Book" : "Add Book"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Link href="/import">
            <Button variant="outline">
              <Upload className="mr-1 h-4 w-4" /> Import CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            className="pl-10"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <Select defaultValue="title-asc" onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Title: A-Z</SelectItem>
              <SelectItem value="title-desc">Title: Z-A</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="stock-asc">Stock: Low to High</SelectItem>
              <SelectItem value="stock-desc">Stock: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Books table */}
      <DataTable
        data={filteredBooks || []}
        columns={columns}
        isLoading={isLoading}
        selectable={true}
        onSelectionChange={handleBulkDelete}
        showRowNumbers={true}
      />
    </div>
  );
}
