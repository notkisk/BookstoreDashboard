import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { wilayas, communes, getCommunesByWilayaId, updateLocationData, isLocationDataAvailable } from "@/data/algeria";
import { useFuzzySearch } from "@/hooks/use-fuzzy-search";
import { Plus, Minus, Trash2, Search, AlertTriangle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Define the book type
interface Book {
  id: number;
  title: string;
  author: string;
  price: number;
  quantityLeft: number;
}

// Define the customer type
interface Customer {
  id: number;
  name: string;
  phone: string;
  phone2?: string;
  address: string;
  wilaya: string;
  commune: string;
}

// Define the delivery price type
interface DeliveryPrice {
  id: number;
  wilayaId: string;
  doorstepPrice: number;
  deskPrice: number;
}

// Schema for the form
const orderFormSchema = z.object({
  // Customer Information
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone number is required"),
  phone2: z.string().optional(),
  wilaya: z.string().min(1, "Wilaya is required"),
  commune: z.string().min(1, "Commune is required"),
  address: z.string().min(1, "Full address is required"),
  
  // Order Information
  deliveryPrice: z.preprocess(
    (val) => val === "" ? 0 : Number(val),
    z.number().min(0, "Delivery price must be a positive number").default(0)
  ),
  // Discount Information
  discountAmount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
    z.number().min(0, "Discount amount must be a positive number").default(0)
  ),
  discountPercentage: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
    z.number().min(0).max(100, "Percentage must be between 0 and 100").default(0)
  ),
  freeDelivery: z.boolean().default(false),
  fragile: z.boolean().default(false),
  echange: z.boolean().default(false),
  pickup: z.boolean().default(false),
  recouvrement: z.boolean().default(false),
  stopDesk: z.boolean().default(true),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderItem {
  bookId: number;
  quantity: number;
  unitPrice: number;
  book: Book;
}

interface OrderFormData {
  customer: {
    name: string;
    phone: string;
    phone2?: string;
    address: string;
    wilaya: string;
    commune: string;
  };
  deliveryType: string; // This will be derived from stopDesk value
  deliveryPrice: number;
  discountAmount: number;
  discountPercentage: number;
  totalAmount: number; // Before discounts
  finalAmount: number; // After discounts and with delivery fee
  freeDelivery: boolean;
  fragile: boolean;
  echange: boolean;
  pickup: boolean;
  recouvrement: boolean;
  stopDesk: boolean;
  notes?: string;
  items: OrderItem[];
}

interface OrderFormProps {
  books: Book[];
  customers: Customer[];
  onSubmit: (data: OrderFormData) => void;
  isSubmitting: boolean;
}

export function OrderForm({ books, customers, onSubmit, isSubmitting }: OrderFormProps) {
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [availableCommunes, setAvailableCommunes] = useState(communes);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [phoneSearchResults, setPhoneSearchResults] = useState<Customer[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Fetch delivery prices
  const { data: deliveryPrices = [] } = useQuery<DeliveryPrice[]>({
    queryKey: ['/api/delivery-prices'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Initialize the form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      phone2: "",
      wilaya: "",
      commune: "",
      address: "",
      deliveryPrice: 0,
      discountAmount: 0,
      discountPercentage: 0,
      freeDelivery: false,
      fragile: false,
      echange: false,
      pickup: false,
      recouvrement: false,
      stopDesk: true,
      notes: "",
    },
  });

  // Fuzzy search for books
  const searchBooks = useFuzzySearch({
    items: books,
    keys: ["title", "author"],
  });

  // Filtered books based on search query
  const filteredBooks = bookSearchQuery
    ? searchBooks(bookSearchQuery)
    : books;

  // Update available communes when wilaya changes
  useEffect(() => {
    if (selectedWilaya) {
      setAvailableCommunes(getCommunesByWilayaId(selectedWilaya));
      
      // Fetch delivery price when wilaya changes
      const isStopDesk = form.getValues("stopDesk");
      fetchDeliveryPrice(selectedWilaya, isStopDesk);
    } else {
      setAvailableCommunes(communes);
    }
  }, [selectedWilaya]);

  // State for calculated values
  const [itemsSubtotal, setItemsSubtotal] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [discountedAmount, setDiscountedAmount] = useState(0);

  // Calculate total amount when order items, delivery price, or discounts change
  useEffect(() => {
    // Calculate items subtotal
    const itemsTotal = orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    setItemsSubtotal(itemsTotal);
    
    // Get values from form
    const deliveryPrice = Number(form.watch("deliveryPrice") || 0);
    const discountAmount = Number(form.watch("discountAmount") || 0);
    const discountPercentage = Number(form.watch("discountPercentage") || 0);
    const freeDelivery = form.watch("freeDelivery") || false;
    
    // Calculate discounts
    let discounted = itemsTotal;
    
    // Apply percentage discount first
    if (discountPercentage > 0) {
      const percentDiscount = Math.round(discounted * (discountPercentage / 100));
      discounted -= percentDiscount;
    }
    
    // Then apply fixed amount discount
    if (discountAmount > 0) {
      discounted = Math.max(0, discounted - discountAmount);
    }
    
    // Set the discounted amount (before delivery)
    setDiscountedAmount(discounted);
    
    // Add delivery price to final amount (unless free delivery is checked)
    const finalDeliveryPrice = freeDelivery ? 0 : deliveryPrice;
    const total = discounted + finalDeliveryPrice;
    setTotalAmount(total);
    setFinalAmount(total);
  }, [
    orderItems, 
    form.watch("deliveryPrice"), 
    form.watch("discountAmount"), 
    form.watch("discountPercentage"),
    form.watch("freeDelivery")
  ]);

  // Fetch delivery price based on wilaya and delivery type
  const fetchDeliveryPrice = async (wilayaId: string, isStopDesk: boolean) => {
    if (!wilayaId) return;
    
    try {
      const response = await fetch(`/api/delivery-prices/${wilayaId}`);
      if (!response.ok) {
        console.error('Failed to fetch delivery price');
        return;
      }
      
      const data = await response.json();
      if (data) {
        // Set the appropriate price based on delivery type
        const price = isStopDesk ? data.deskPrice : data.doorstepPrice;
        form.setValue("deliveryPrice", price);
      } else {
        // No price data found, set default to 0
        form.setValue("deliveryPrice", 0);
      }
    } catch (error) {
      console.error('Error fetching delivery price:', error);
      form.setValue("deliveryPrice", 0);
    }
  };

  // Handle wilaya selection
  const handleWilayaChange = (value: string) => {
    form.setValue("wilaya", value);
    setSelectedWilaya(value);
    form.setValue("commune", ""); // Reset commune when wilaya changes
    
    // Fetch delivery price when wilaya changes
    const isStopDesk = form.getValues("stopDesk");
    fetchDeliveryPrice(value, isStopDesk);
  };

  // Handle phone search
  useEffect(() => {
    if (phoneSearchQuery.length >= 3) {
      const filteredCustomers = customers.filter(customer => 
        customer.phone.includes(phoneSearchQuery) || 
        customer.name.toLowerCase().includes(phoneSearchQuery.toLowerCase())
      );
      setPhoneSearchResults(filteredCustomers);
    } else {
      setPhoneSearchResults([]);
    }
  }, [phoneSearchQuery, customers]);

  // Auto-fill customer information
  const fillCustomerInfo = (customer: Customer) => {
    form.setValue("customerName", customer.name);
    form.setValue("phone", customer.phone);
    form.setValue("phone2", customer.phone2 || "");
    form.setValue("wilaya", customer.wilaya);
    setSelectedWilaya(customer.wilaya);
    form.setValue("commune", customer.commune);
    form.setValue("address", customer.address);
    setPhoneSearchQuery("");
    setPhoneSearchResults([]);
  };

  // Handle adding a book to the order
  const addBookToOrder = (bookId: number) => {
    const book = books.find((b) => b.id === Number(bookId));
    
    if (!book) return;
    
    // Check if book is already in the order
    const existingItemIndex = orderItems.findIndex(
      (item) => item.bookId === book.id
    );
    
    if (existingItemIndex !== -1) {
      // Increment quantity if book is already in order
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Add new book to order
      setOrderItems([
        ...orderItems,
        {
          bookId: book.id,
          quantity: 1,
          unitPrice: book.price,
          book,
        },
      ]);
    }
    
    setBookSearchQuery("");
  };

  // Handle item quantity change
  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    // Check if we have enough books in stock
    const book = books.find(b => b.id === orderItems[index].bookId);
    if (book && newQuantity > book.quantityLeft) {
      // Maybe show a toast or error message
      return;
    }
    
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = newQuantity;
    setOrderItems(updatedItems);
  };

  // Handle removing item from order
  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = (values: OrderFormValues) => {
    if (orderItems.length === 0) {
      form.setError("root", {
        message: "Please add at least one book to the order",
      });
      return;
    }
    
    // Derive delivery type from stopDesk value
    const deliveryType = values.stopDesk ? "stopDesk" : "homeDelivery";
    
    const formData: OrderFormData = {
      customer: {
        name: values.customerName,
        phone: values.phone,
        phone2: values.phone2,
        address: values.address,
        wilaya: values.wilaya,
        commune: values.commune,
      },
      deliveryType: deliveryType,
      deliveryPrice: values.deliveryPrice,
      discountAmount: values.discountAmount,
      discountPercentage: values.discountPercentage,
      freeDelivery: values.freeDelivery,
      fragile: values.fragile,
      echange: values.echange,
      pickup: values.pickup,
      recouvrement: values.recouvrement,
      stopDesk: values.stopDesk,
      notes: values.notes,
      items: orderItems,
      totalAmount: itemsSubtotal,
      finalAmount: finalAmount,
    };
    
    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        {!isLocationDataAvailable() && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No location data (wilayas and communes) available. Please upload location data in the Location Data page before creating orders.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-4">
              {/* Phone Search */}
              <div className="relative">
                <FormLabel className="text-sm font-medium text-gray-700">
                  Search Customer (Phone/Name)
                </FormLabel>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <Input
                    type="text"
                    placeholder="Search by phone or name..."
                    value={phoneSearchQuery}
                    onChange={(e) => setPhoneSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                {phoneSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                    <ul className="py-1">
                      {phoneSearchResults.map((customer) => (
                        <li
                          key={customer.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => fillCustomerInfo(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 0555 123 456" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Secondary Phone */}
              <FormField
                control={form.control}
                name="phone2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 0555 123 456" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Wilaya */}
              <FormField
                control={form.control}
                name="wilaya"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wilaya*</FormLabel>
                    <Select
                      onValueChange={handleWilayaChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Wilaya..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wilayas.map((wilaya) => (
                          <SelectItem key={wilaya.id} value={wilaya.id}>
                            {wilaya.id} - {wilaya.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Commune */}
              <FormField
                control={form.control}
                name="commune"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commune*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!selectedWilaya}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Commune..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCommunes.map((commune) => (
                          <SelectItem key={commune.id} value={commune.id}>
                            {commune.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Full Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address*</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Detailed address..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Free Delivery Option */}
              <FormField
                control={form.control}
                name="freeDelivery"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          // If free delivery is checked, set delivery price to 0
                          if (checked) {
                            form.setValue('deliveryPrice', 0);
                          } else {
                            // Reset to default price based on wilaya if available
                            const wilayaId = form.getValues('wilaya');
                            if (wilayaId) {
                              const price = deliveryPrices.find(p => p.wilayaId === wilayaId);
                              if (price) {
                                if (form.getValues('stopDesk')) {
                                  form.setValue('deliveryPrice', price.deskPrice);
                                } else {
                                  form.setValue('deliveryPrice', price.doorstepPrice);
                                }
                              }
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-medium text-green-600">Free Delivery</FormLabel>
                  </FormItem>
                )}
              />
                  
              {/* Delivery Price */}
              <FormField
                control={form.control}
                name="deliveryPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        step="100"
                        placeholder="0"
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        value={field.value}
                        disabled={form.getValues('freeDelivery')}
                      />
                    </FormControl>
                    <div className="text-xs text-gray-500 mt-1">
                      Cost of delivery, if applicable
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
            <div className="space-y-4">
              {/* Order Options */}
              <div className="space-y-2">
                <FormLabel className="block text-sm font-medium text-gray-700">Order Options</FormLabel>
                <div className="flex flex-wrap gap-4">
                  <FormField
                    control={form.control}
                    name="fragile"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Fragile</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="echange"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Echange</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pickup"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Pick Up</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="recouvrement"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Recouvrement</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="stopDesk"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              // Update delivery price when stopDesk changes
                              const wilayaId = form.getValues("wilaya");
                              if (wilayaId) {
                                fetchDeliveryPrice(wilayaId, !!checked);
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Stop Desk </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Book Selection */}
              <div>
                <FormLabel className="block text-sm font-medium text-gray-700">Add Books to Order</FormLabel>
                <div className="mt-1 relative">
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        placeholder="Search books..."
                        value={bookSearchQuery}
                        onChange={(e) => setBookSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  {bookSearchQuery && filteredBooks.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      <ul className="py-1">
                        {filteredBooks.slice(0, 10).map((book) => (
                          <li
                            key={book.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => addBookToOrder(book.id)}
                          >
                            <div className="font-medium">{book.title}</div>
                            <div className="text-sm text-gray-500">
                              {book.author} | {formatCurrency(book.price)} | Stock: {book.quantityLeft}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Books */}
              <div className="border rounded-md overflow-hidden mt-4">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="text-sm font-medium text-gray-700">Selected Books</h4>
                </div>
                <div className="p-4 space-y-3">
                  {orderItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No books selected. Search and add books to your order.
                    </p>
                  ) : (
                    orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{item.book.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.unitPrice)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            className="text-gray-400 hover:text-gray-500 p-1 h-auto"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            className="text-gray-400 hover:text-gray-500 p-1 h-auto"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-600 ml-2 p-1 h-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Discount Section */}
                <div className="bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Items Subtotal:</span>
                    <span className="text-sm text-gray-700">
                      {formatCurrency(itemsSubtotal)}
                    </span>
                  </div>
                  
                  {/* Discount Fields */}
                  <div className="grid grid-cols-1 gap-3 pt-2 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">Discounts</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="discountPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Percentage (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                max="100"
                                step="1"
                                placeholder="0"
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                value={field.value}
                                className="h-8 text-sm"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="discountAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Fixed Amount (DZD)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="100"
                                placeholder="0"
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                value={field.value}
                                className="h-8 text-sm"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 text-sm">
                      <span className="font-medium text-gray-700">After Discounts:</span>
                      <span className="text-gray-700">
                        {formatCurrency(discountedAmount)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1 text-sm">
                      <span className="font-medium text-gray-700">Delivery Fee:</span>
                      <span className="text-gray-700">
                        {formatCurrency(Number(form.watch("deliveryPrice") || 0))}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-black-200">
                    <span className="text-sm font-medium text-gray-700">Final Total:</span>
                    <span className="text-base font-semibold text-green-900">
                      {formatCurrency(finalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comments/Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Add any special instructions or notes here..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Show form-level error */}
              {form.formState.errors.root && (
                <p className="text-sm font-medium text-red-500 mt-2">
                  {form.formState.errors.root.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !isLocationDataAvailable()}
            className="bg-primary-300 hover:bg-primary-400 text-black" variant="outline"
          >
            Create Order
          </Button>
        </div>
      </form>
    </Form>
  );
}
