import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertCustomerSchema, insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== Books API ====================
  
  // Get all books
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getBooks();
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  // Get a single book by ID
  app.get("/api/books/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      
      const book = await storage.getBookById(id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      res.json(book);
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  // Search books
  app.get("/api/books/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const books = await storage.searchBooks(query);
      res.json(books);
    } catch (error) {
      console.error("Error searching books:", error);
      res.status(500).json({ message: "Failed to search books" });
    }
  });

  // Create a new book
  app.post("/api/books", async (req, res) => {
    try {
      const bookData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(bookData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid book data", errors: error.errors });
      }
      console.error("Error creating book:", error);
      res.status(500).json({ message: "Failed to create book" });
    }
  });

  // Update a book
  app.put("/api/books/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      
      const bookData = insertBookSchema.partial().parse(req.body);
      const book = await storage.updateBook(id, bookData);
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      res.json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid book data", errors: error.errors });
      }
      console.error("Error updating book:", error);
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  // Delete a book
  app.delete("/api/books/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      
      const success = await storage.deleteBook(id);
      
      if (!success) {
        return res.status(404).json({ message: "Book not found or could not be deleted" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Import books from CSV (array of book objects) with error tolerance
  app.post("/api/books/import", async (req, res) => {
    try {
      // Parse with loose schema to handle partial data
      const looseBookSchema = insertBookSchema.partial().extend({
        // Only title is truly required
        title: z.string().min(1, "Title is required"),
        // Make sure numbers are properly processed
        price: z.preprocess(
          (val) => val === null || val === undefined || val === "" ? 0 : Number(val),
          z.number().min(0).default(0)
        ),
        buyPrice: z.preprocess(
          (val) => val === null || val === undefined || val === "" ? 0 : Number(val),
          z.number().min(0).default(0)
        ),
        quantityBought: z.preprocess(
          (val) => val === null || val === undefined || val === "" ? 0 : Number(val),
          z.number().min(0).default(0)
        ),
        quantityLeft: z.preprocess(
          (val) => val === null || val === undefined || val === "" ? 0 : Number(val),
          z.number().min(0).default(0)
        ),
      });

      // First check if it's an array
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ 
          message: "Invalid data format. Expected an array of books.",
          importSummary: {
            totalAttempted: 0,
            successfulImports: 0,
            failedImports: 0,
            errors: ["Data format is not an array"]
          }
        });
      }

      const bookDataList = req.body;
      const successfulBooks = [];
      const failedBooks = [];
      const errors = [];
      
      // Process each book independently to avoid batch failure
      for (const bookData of bookDataList) {
        try {
          // First validate the data
          const validatedData = looseBookSchema.parse(bookData);
          
          // Then try to save it
          try {
            const book = await storage.createBook(validatedData);
            successfulBooks.push(book);
          } catch (createError) {
            console.error("Error creating book:", createError);
            failedBooks.push({ 
              data: bookData, 
              error: createError instanceof Error ? createError.message : "Unknown database error" 
            });
            errors.push(`Error saving ${bookData.title || 'book'}: ${createError instanceof Error ? createError.message : "Unknown error"}`);
          }
        } catch (validationError) {
          // Handle validation errors for this specific book
          console.error("Validation error:", validationError);
          failedBooks.push({ 
            data: bookData, 
            error: validationError instanceof z.ZodError 
              ? validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
              : "Unknown validation error" 
          });
          errors.push(`Validation error for book ${
            bookData.title ? `'${bookData.title}'` : '(no title)'
          }: ${
            validationError instanceof z.ZodError 
              ? validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
              : "Unknown validation error"
          }`);
        }
      }
      
      // Return results with import summary
      return res.status(successfulBooks.length > 0 ? 201 : 400).json({
        books: successfulBooks,
        importSummary: {
          totalAttempted: bookDataList.length,
          successfulImports: successfulBooks.length,
          failedImports: failedBooks.length,
          errors: errors
        }
      });
    } catch (error) {
      console.error("Error in book import process:", error);
      res.status(500).json({ 
        message: "Failed to process book import", 
        error: error instanceof Error ? error.message : "Unknown error",
        importSummary: {
          totalAttempted: Array.isArray(req.body) ? req.body.length : 0,
          successfulImports: 0,
          failedImports: Array.isArray(req.body) ? req.body.length : 0,
          errors: [error instanceof Error ? error.message : "Unknown server error"]
        }
      });
    }
  });

  // ==================== Customers API ====================
  
  // Get all customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Get a customer by ID
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Get a customer by phone number
  app.get("/api/customers/phone/:phone", async (req, res) => {
    try {
      const phone = req.params.phone;
      const customer = await storage.getCustomerByPhone(phone);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer by phone:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Create a new customer
  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Check if customer with this phone already exists
      const existingCustomer = await storage.getCustomerByPhone(customerData.phone);
      if (existingCustomer) {
        return res.status(409).json({ 
          message: "Customer with this phone number already exists",
          customer: existingCustomer
        });
      }
      
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Update a customer
  app.put("/api/customers/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, customerData);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // ==================== Orders API ====================
  
  // Get all orders
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get an order by ID with its items
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const order = await storage.getOrderWithItems(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Create a new order
  app.post("/api/orders", async (req, res) => {
    try {
      const orderInput = req.body;
      
      // Validate order data
      const orderData = insertOrderSchema.parse(orderInput.order);
      
      // Validate order items
      const orderItemsSchema = z.array(
        insertOrderItemSchema.omit({ orderId: true })
      );
      const orderItems = orderItemsSchema.parse(orderInput.items);
      
      // Create the order
      const order = await storage.createOrder(orderData, orderItems);
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Update order status
  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const allowedStatuses = ['pending', 'processing', 'delivered', 'cancelled'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status value",
          allowedValues: allowedStatuses
        });
      }
      
      const order = await storage.updateOrderStatus(id, status);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Export orders to CSV - returns the data needed for CSV export
  app.get("/api/orders/export/csv", async (req, res) => {
    try {
      // This returns all orders. In a real implementation, we might want to add filters
      const orders = await storage.getOrders();
      
      // We'll fetch information for all orders including customer data
      const ordersWithDetails = [];
      
      for (const order of orders) {
        const orderWithItems = await storage.getOrderWithItems(order.id);
        if (orderWithItems) {
          const customer = await storage.getCustomerById(order.customerId);
          if (customer) {
            ordersWithDetails.push({
              ...orderWithItems,
              customer
            });
          }
        }
      }
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({ message: "Failed to export orders" });
    }
  });

  // ==================== Analytics API ====================
  
  // Get dashboard analytics
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const period = req.query.period as 'day' | 'week' | 'month' | undefined;
      
      const [
        ordersCount,
        totalSales,
        profit,
        bestSellingBooks
      ] = await Promise.all([
        storage.getOrdersCount(period),
        storage.getTotalSales(period),
        storage.getProfit(period),
        storage.getBestSellingBooks(5)
      ]);
      
      res.json({
        ordersCount,
        totalSales,
        profit,
        bestSellingBooks
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
