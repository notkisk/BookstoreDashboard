import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { 
  insertBookSchema, 
  insertCustomerSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertDeliveryPriceSchema,
  insertUserSchema
} from "@shared/schema";
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
  
  // Bulk delete books
  app.post("/api/books/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      
      // Validate ids is an array of numbers
      if (!Array.isArray(ids)) {
        return res.status(400).json({ 
          message: "Invalid request body: 'ids' must be an array" 
        });
      }
      
      // Validate each ID is a number
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      if (numericIds.length === 0) {
        return res.status(400).json({ 
          message: "No valid book IDs provided" 
        });
      }
      
      const result = await storage.bulkDeleteBooks(numericIds);
      
      res.json({
        message: `Deleted ${result.success} books successfully. Failed to delete ${result.failed} books.`,
        success: result.success,
        failed: result.failed
      });
    } catch (error) {
      console.error("Error bulk deleting books:", error);
      res.status(500).json({ message: "Failed to bulk delete books" });
    }
  });

  // Import books from CSV (array of book objects) with error tolerance
  app.post("/api/books/import", async (req, res) => {
    try {
      // Parse with loose schema to handle partial data
      const looseBookSchema = insertBookSchema.partial().extend({
        // Only title is truly required
        title: z.string().min(1, "Title is required"),
        // Handle all possible data types for author and publisher
        author: z.union([z.string(), z.number()]).transform(val => String(val)).default(""),
        publisher: z.union([z.string(), z.number()]).transform(val => String(val)).default(""),
        // Make sure numbers are properly processed
        price: z.preprocess(
          (val) => {
            // Handle different formats and types
            if (val === null || val === undefined || val === "") return 0;
            // Convert string with decimals to integer (remove decimal part)
            if (typeof val === "string" && val.includes(".")) {
              const num = parseFloat(val);
              return isNaN(num) ? 0 : Math.round(num);
            }
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num);
          },
          z.number().int().min(0).default(0)
        ),
        buyPrice: z.preprocess(
          (val) => {
            // Handle different formats and types
            if (val === null || val === undefined || val === "") return 0;
            // Convert string with decimals to integer (remove decimal part)
            if (typeof val === "string" && val.includes(".")) {
              const num = parseFloat(val);
              return isNaN(num) ? 0 : Math.round(num);
            }
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num);
          },
          z.number().int().min(0).default(0)
        ),
        quantityBought: z.preprocess(
          (val) => {
            if (val === null || val === undefined || val === "") return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num);
          },
          z.number().int().min(0).default(0)
        ),
        quantityLeft: z.preprocess(
          (val) => {
            if (val === null || val === undefined || val === "") return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num);
          },
          z.number().int().min(0).default(0)
        ),
        deliveringStock: z.preprocess(
          (val) => {
            if (val === null || val === undefined || val === "") return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num);
          },
          z.number().int().min(0).default(0)
        ),
        soldStock: z.preprocess(
          (val) => {
            if (val === null || val === undefined || val === "") return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num);
          },
          z.number().int().min(0).default(0)
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

  // Update a customer with PATCH (partial update)
  app.patch("/api/customers/:id", async (req, res) => {
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

  // Delete a customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      // Check if customer exists
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Delete the customer
      const deleted = await storage.deleteCustomer(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete customer" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
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
      
      const allowedStatuses = ['pending', 'delivering', 'delivered', 'returned', 'reactionary'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status value",
          allowedValues: allowedStatuses
        });
      }
      
      // Map 'reactionary' to 'returned' for backward compatibility
      const normalizedStatus = status === 'reactionary' ? 'returned' : status;
      
      const order = await storage.updateOrderStatus(id, normalizedStatus);
      
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
        discounts,
        bestSellingBooks,
        ordersByStatus,
        ordersByWilaya
      ] = await Promise.all([
        storage.getOrdersCount(period),
        storage.getTotalSales(period),
        storage.getProfit(period),
        storage.getTotalDiscounts(period),
        storage.getBestSellingBooks(5),
        storage.getOrdersByStatus(),
        storage.getOrdersByWilaya(5)
      ]);
      
      res.json({
        ordersCount,
        totalSales,
        profit,
        discounts,
        bestSellingBooks,
        ordersByStatus,
        ordersByWilaya
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ==================== Enhanced Analytics API ====================

  // Get orders by status
  app.get("/api/analytics/orders-by-status", async (req, res) => {
    try {
      const ordersByStatus = await storage.getOrdersByStatus();
      res.json(ordersByStatus);
    } catch (error) {
      console.error("Error fetching orders by status:", error);
      res.status(500).json({ message: "Failed to fetch orders by status" });
    }
  });

  // Get orders by wilaya
  app.get("/api/analytics/orders-by-wilaya", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const ordersByWilaya = await storage.getOrdersByWilaya(limit);
      res.json(ordersByWilaya);
    } catch (error) {
      console.error("Error fetching orders by wilaya:", error);
      res.status(500).json({ message: "Failed to fetch orders by wilaya" });
    }
  });
  
  // Get total discounts
  app.get("/api/analytics/discounts", async (req, res) => {
    try {
      const period = req.query.period as 'day' | 'week' | 'month' | undefined;
      const discounts = await storage.getTotalDiscounts(period);
      res.json(discounts);
    } catch (error) {
      console.error("Error fetching discount statistics:", error);
      res.status(500).json({ message: "Failed to fetch discount statistics" });
    }
  });

  // ==================== Delivery Prices API ====================
  
  // Get all delivery prices
  app.get("/api/delivery-prices", async (req, res) => {
    try {
      const prices = await storage.getDeliveryPrices();
      res.json(prices);
    } catch (error) {
      console.error("Error fetching delivery prices:", error);
      res.status(500).json({ message: "Failed to fetch delivery prices" });
    }
  });

  // Get delivery price by wilaya ID
  app.get("/api/delivery-prices/:wilayaId", async (req, res) => {
    try {
      const wilayaId = req.params.wilayaId;
      const price = await storage.getDeliveryPriceByWilayaId(wilayaId);
      
      if (!price) {
        return res.status(404).json({ message: "Delivery price not found for this wilaya" });
      }
      
      res.json(price);
    } catch (error) {
      console.error("Error fetching delivery price:", error);
      res.status(500).json({ message: "Failed to fetch delivery price" });
    }
  });

  // Create a new delivery price
  app.post("/api/delivery-prices", async (req, res) => {
    try {
      const priceData = insertDeliveryPriceSchema.parse(req.body);
      
      // Check if price for this wilaya already exists
      const existingPrice = await storage.getDeliveryPriceByWilayaId(priceData.wilayaId);
      if (existingPrice) {
        return res.status(409).json({ 
          message: "Delivery price for this wilaya already exists",
          price: existingPrice
        });
      }
      
      const price = await storage.createDeliveryPrice(priceData);
      res.status(201).json(price);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid price data", errors: error.errors });
      }
      console.error("Error creating delivery price:", error);
      res.status(500).json({ message: "Failed to create delivery price" });
    }
  });

  // Update a delivery price
  app.put("/api/delivery-prices/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid delivery price ID" });
      }
      
      const priceData = insertDeliveryPriceSchema.partial().parse(req.body);
      const price = await storage.updateDeliveryPrice(id, priceData);
      
      if (!price) {
        return res.status(404).json({ message: "Delivery price not found" });
      }
      
      res.json(price);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid price data", errors: error.errors });
      }
      console.error("Error updating delivery price:", error);
      res.status(500).json({ message: "Failed to update delivery price" });
    }
  });

  // Bulk create/update delivery prices (initialize all wilayas)
  app.post("/api/delivery-prices/bulk", async (req, res) => {
    try {
      const { prices } = req.body;
      
      if (!Array.isArray(prices)) {
        return res.status(400).json({ message: "Invalid request body: 'prices' must be an array" });
      }
      
      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (const priceData of prices) {
        try {
          const validData = insertDeliveryPriceSchema.parse(priceData);
          
          // Check if price for this wilaya already exists
          const existingPrice = await storage.getDeliveryPriceByWilayaId(validData.wilayaId);
          
          if (existingPrice) {
            // Update existing
            const updated = await storage.updateDeliveryPrice(existingPrice.id, validData);
            if (updated) {
              results.updated++;
            } else {
              results.failed++;
              results.errors.push(`Failed to update price for wilaya ${validData.wilayaId}`);
            }
          } else {
            // Create new
            await storage.createDeliveryPrice(validData);
            results.created++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push(
            error instanceof z.ZodError 
              ? `Validation error for wilaya ${priceData.wilayaId}: ${error.errors.map(e => e.message).join(', ')}` 
              : `Error processing wilaya ${priceData.wilayaId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
      
      res.json({
        message: `Processed ${prices.length} delivery prices: created ${results.created}, updated ${results.updated}, failed ${results.failed}`,
        results
      });
    } catch (error) {
      console.error("Error in bulk delivery price operation:", error);
      res.status(500).json({ message: "Failed to process delivery prices" });
    }
  });

  // ==================== Location Data API ====================

  // Set up multer for file uploads
  const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = 'uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, `algeria_data_${Date.now()}${path.extname(file.originalname)}`);
    },
  });
  
  const upload = multer({ 
    storage: multerStorage,
    fileFilter: function (req, file, cb) {
      // Accept only Excel files
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files are allowed'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Upload Algeria location data file
  app.post('/api/location/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // File was successfully uploaded, respond with the path
      res.status(200).json({ 
        message: 'File uploaded successfully',
        file: {
          filename: req.file.filename,
          path: req.file.path
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });
  
  // Provide a sample file for location data
  app.get('/api/location/sample', (req, res) => {
    try {
      const xlsx = require('xlsx');
      
      // Create a sample workbook
      const wb = xlsx.utils.book_new();
      
      // Sample data (commune name and wilaya code)
      const sampleData = [
        ['Adrar', '1'],
        ['Tamantit', '1'],
        ['In Zghmir', '1'],
        ['Timimoun', '1'],
        ['Chlef', '2'],
        ['Abou El Hassan', '2'],
        ['Bénairia', '2'],
        ['Alger Centre', '16'],
        ['Bab El Oued', '16'],
        ['El Biar', '16'],
        ['Hussein Dey', '16'],
        ['Oran', '31'],
        ['Bir El Djir', '31'],
        ['Es Senia', '31'],
        ['Arzew', '31']
      ];
      
      // Create a worksheet
      const ws = xlsx.utils.aoa_to_sheet(sampleData);
      
      // Add the worksheet to the workbook
      xlsx.utils.book_append_sheet(wb, ws, 'Sample Data');
      
      // Set appropriate headers for an Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="algeria_location_sample.xlsx"');
      
      // Send the workbook as a buffer
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.send(buffer);
    } catch (error) {
      console.error('Error generating sample file:', error);
      res.status(500).json({ message: 'Failed to generate sample file' });
    }
  });

  // Serve static uploads
  app.use('/uploads', (req, res, next) => {
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    next();
  }, express.static('uploads'));

  // ==================== Authentication Setup ====================
  
  // Session setup
  app.use(session({
    secret: process.env.SESSION_SECRET || 'bookstore-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport local strategy
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await storage.validateUserCredentials(username, password);
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
  
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserByUsername(String(id));
      if (!user) {
        return done(null, false);
      }
      
      // Return user without sensitive data
      const { password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };
  
  // ==================== Authentication API ====================
  
  // Register a new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already taken' });
      }
      
      // Create new user
      const newUser = await storage.createUser(userData);
      
      res.status(201).json({
        message: 'User registered successfully',
        user: newUser
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  });
  
  // Login
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid username or password' });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.json({ message: 'Login successful', user });
      });
    })(req, res, next);
  });
  
  // Get current user
  app.get('/api/auth/me', isAuthenticated, (req, res) => {
    res.json({ user: req.user });
  });
  
  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ message: 'Logout successful' });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
