import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { OrderForm } from "@/components/ui/order-form";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

interface Book {
  id: number;
  title: string;
  author: string;
  price: number;
  quantityLeft: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  phone2?: string;
  address: string;
  wilaya: string;
  commune: string;
}

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
  deliveryType: string;
  deliveryPrice: number;
  fragile: boolean;
  echange: boolean;
  pickup: boolean;
  recouvrement: boolean;
  stopDesk: boolean;
  notes?: string;
  items: OrderItem[];
}

export default function CreateOrder() {
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderReference, setOrderReference] = useState("");
  const [orderTotal, setOrderTotal] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch books for the order form
  const { data: books } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  // Fetch customers for autocomplete
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: async (orderData: OrderFormData) => {
      // First, check if customer exists or create new
      let customerId: number;

      try {
        // Try to get existing customer by phone
        try {
          const customerResponse = await apiRequest(
            "GET",
            `/api/customers/phone/${orderData.customer.phone}`,
          );
          
          // If we get here, customer exists
          // apiRequest already returns the parsed JSON
          const existingCustomer = customerResponse;
          customerId = existingCustomer.id;
          
          // Update customer info if needed
          await apiRequest(
            "PUT",
            `/api/customers/${customerId}`,
            orderData.customer,
          );
        } catch (error) {
          // Customer not found or other error, create new customer
          console.log("Creating new customer:", orderData.customer);
          const newCustomerResponse = await apiRequest(
            "POST",
            "/api/customers",
            orderData.customer,
          );
          // apiRequest already returns the parsed JSON
          const newCustomer = newCustomerResponse;
          customerId = newCustomer.id;
        }

        // Calculate total amount (including delivery price)
        const itemsTotal = orderData.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        const totalAmount = itemsTotal + orderData.deliveryPrice;

        // Create order
        const orderPayload = {
          order: {
            customerId,
            totalAmount,
            deliveryType: orderData.deliveryType,
            deliveryPrice: orderData.deliveryPrice,
            fragile: orderData.fragile,
            echange: orderData.echange,
            pickup: orderData.pickup,
            recouvrement: orderData.recouvrement,
            stopDesk: orderData.stopDesk,
            notes: orderData.notes,
            status: "pending",
          },
          items: orderData.items.map((item) => ({
            bookId: item.bookId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };

        const newOrder = await apiRequest("POST", "/api/orders", orderPayload);
        // apiRequest already returns parsed JSON
        setOrderReference(newOrder.reference);
        setOrderTotal(totalAmount);

        return newOrder;
      } catch (error) {
        console.error("Order creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });

      setOrderSuccess(true);
      toast({
        title: "Order created successfully",
        description: `Order reference: ${orderReference}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateOrder = (formData: OrderFormData) => {
    createOrder.mutate(formData);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Create New Order
        </h2>
        <p className="text-sm text-gray-500">
          Fill in the customer details and select books for the order
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {orderSuccess ? (
            <div className="flex flex-col items-center py-10">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Order Created Successfully!
              </h3>
              <p className="text-center text-gray-600 mb-2">
                Order reference:{" "}
                <span className="font-medium">{orderReference}</span>
              </p>
              <p className="text-center text-gray-600 mb-6">
                Total amount:{" "}
                <span className="font-medium">
                  {formatCurrency(orderTotal)}
                </span>
              </p>
              <div className="flex space-x-4">
                <Link href="/export">
                  <Button className="bg-primary-300 hover:bg-primary-400 text-white">
                    Export Order
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setOrderSuccess(false)}
                >
                  Create Another Order
                </Button>
              </div>
            </div>
          ) : (
            <OrderForm
              books={books || []}
              customers={customers || []}
              onSubmit={handleCreateOrder}
              isSubmitting={createOrder.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
