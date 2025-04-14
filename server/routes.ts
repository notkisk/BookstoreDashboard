import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { execSync } from "child_process";
import * as xlsx from "xlsx";
import { 
  insertBookSchema, 
  insertCustomerSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertDeliveryPriceSchema,
  insertUserSchema,
  insertLoyaltySettingsSchema,
  insertLoyaltyTransactionSchema
} from "@shared/schema";
import { z } from "zod";
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // Add a redirect from root to auto-login for easy testing
  app.get('/', (req, res) => {
    res.redirect('/auto-login');
  });
  
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
      
      // <<< ADDED LOGGING HERE >>>
      console.log(`[Order Create] Received Order Data (Ref: ${orderData.reference || 'N/A'}):`,
        `Fragile: ${orderData.fragile}, Type: ${typeof orderData.fragile}`,
        `Echange: ${orderData.echange}, Type: ${typeof orderData.echange}`,
        `Pickup: ${orderData.pickup}, Type: ${typeof orderData.pickup}`,
        `Recouvrement: ${orderData.recouvrement}, Type: ${typeof orderData.recouvrement}`,
        `StopDesk: ${orderData.stopDesk}, Type: ${typeof orderData.stopDesk}`
      );
      
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
      
      // We'll fetch information for all orders including customer data and order items
      const ordersWithDetails = [];
      
      for (const order of orders) {
        const orderWithItems = await storage.getOrderWithItems(order.id);
        if (orderWithItems) {
          const customer = await storage.getCustomerById(order.customerId);
          if (customer) {
            // Ensure the finalAmount is correctly calculated if not already present
            let finalAmount = order.finalAmount;
            
            // If finalAmount is not set or is zero, calculate it
            if (!finalAmount || finalAmount === 0) {
              finalAmount = order.totalAmount;
              
              // Apply percentage discount if any
              if (order.discountPercentage && order.discountPercentage > 0) {
                finalAmount -= (order.totalAmount * order.discountPercentage / 100);
              }
              
              // Apply fixed discount if any
              if (order.discountAmount && order.discountAmount > 0) {
                finalAmount -= order.discountAmount;
              }
              
              // Add delivery price
              if (order.deliveryPrice && order.deliveryPrice > 0) {
                finalAmount += order.deliveryPrice;
              }
            }
            
            // Format the order with all required fields
            ordersWithDetails.push({
              ...orderWithItems,
              finalAmount: Math.round(finalAmount), // Round to nearest integer
              customer: {
                ...customer,
                // Ensure all customer fields needed for export exist
                phone2: customer.phone2 || ""
              },
              // Include items for product description
              items: orderWithItems.items || []
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
  
  // Export orders to Excel using template
  app.get("/api/orders/export/excel", async (req, res) => {
    try {
      // Get orders with all details similar to CSV export
      const orders = await storage.getOrders();
      const ordersWithDetails = [];
      
      for (const order of orders) {
        const orderWithItems = await storage.getOrderWithItems(order.id);
        if (orderWithItems) {
          const customer = await storage.getCustomerById(order.customerId);
          if (customer) {
            // Ensure the finalAmount is correctly calculated if not already present
            let finalAmount = order.finalAmount;
            
            // If finalAmount is not set or is zero, calculate it
            if (!finalAmount || finalAmount === 0) {
              finalAmount = order.totalAmount;
              
              // Apply percentage discount if any
              if (order.discountPercentage && order.discountPercentage > 0) {
                finalAmount -= (order.totalAmount * order.discountPercentage / 100);
              }
              
              // Apply fixed discount if any
              if (order.discountAmount && order.discountAmount > 0) {
                finalAmount -= order.discountAmount;
              }
              
              // Add delivery price
              if (order.deliveryPrice && order.deliveryPrice > 0) {
                finalAmount += order.deliveryPrice;
              }
            }
            
            // Get wilaya and commune info if available
            let wilayaId = "";
            let wilayaName = "";
            let communeName = "";
            let address = "";
            
            // Format the order with all required fields
            ordersWithDetails.push({
              ...orderWithItems,
              reference: order.reference,
              finalAmount: Math.round(finalAmount), // Round to nearest integer
              customer: {
                ...customer,
                // Ensure all customer fields needed for export exist
                phone2: customer.phone2 || "",
                address: {
                  wilayaId: wilayaId,
                  wilayaName: wilayaName,
                  communeName: communeName,
                  streetAddress: address
                }
              },
              // Include items for product description
              items: orderWithItems.items || []
            });
          }
        }
      }
      
      // Write orders to a temporary JSON file
      const timestamp = new Date().getTime();
      const ordersJsonPath = path.join(os.tmpdir(), `orders_${timestamp}.json`);
      fs.writeFileSync(ordersJsonPath, JSON.stringify(ordersWithDetails));

      // Create output path
      const outputPath = path.join(os.tmpdir(), `ecotrack_export_${timestamp}.xlsx`);

      try {
        // Execute the Python script with proper arguments
        const pythonScript = path.join(__dirname, 'ecotrack_excel_export.py');
        const pythonProcess = spawn('python', [
          pythonScript,
          '--orders', ordersJsonPath,
          '--template', 'templates/upload_ecotrack_v31.xlsx',
          '--output', outputPath
        ]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
          stdoutData += data.toString();
          console.log(`[EcoTrack Export] ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
          stderrData += data.toString();
          console.error(`[EcoTrack Export Error] ${data.toString()}`);
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`[EcoTrack Export] Process exited with code ${code}`);
            console.error(`[EcoTrack Export] Error output: ${stderrData}`);
            return res.status(500).json({ 
              error: 'Failed to generate EcoTrack Excel file',
              details: stderrData
            });
          }

          if (fs.existsSync(outputPath)) {
            // Send the file to the client
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="ecotrack_export_${timestamp}.xlsx"`);
            
            const fileStream = fs.createReadStream(outputPath);
            fileStream.pipe(res);
            
            // Clean up the temporary files after sending
            fileStream.on('end', () => {
              try {
                fs.unlinkSync(ordersJsonPath);
                fs.unlinkSync(outputPath);
              } catch (err) {
                console.error("Error cleaning up files:", err);
              }
            });
          } else {
            res.status(500).json({ 
              error: 'Failed to generate EcoTrack Excel file',
              details: 'Output file not found'
            });
          }
        });

      } catch (error) {
        console.error("Error generating EcoTrack Excel file:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
          error: 'Failed to generate EcoTrack Excel file',
          details: errorMessage
        });
      }
    } catch (error) {
      console.error("Error exporting orders to Excel:", error);
      res.status(500).json({ message: "Failed to export orders to Excel" });
    }
  });
  
  // Export orders to EcoTrack Excel format
  app.get("/api/orders/export/ecotrack", async (req, res) => {
    try {
      // Get orders with all details similar to regular Excel export
      const orders = await storage.getOrders();
      const ordersWithDetails = [];
      
      for (const order of orders) {
        const orderWithItems = await storage.getOrderWithItems(order.id);
        if (orderWithItems) {
          const customer = await storage.getCustomerById(order.customerId);
          if (customer) {
            // Ensure the finalAmount is correctly calculated if not already present
            let finalAmount = order.finalAmount;
            
            // If finalAmount is not set or is zero, calculate it
            if (!finalAmount || finalAmount === 0) {
              finalAmount = order.totalAmount;
              
              // Apply percentage discount if any
              if (order.discountPercentage && order.discountPercentage > 0) {
                finalAmount -= (order.totalAmount * order.discountPercentage / 100);
              }
              
              // Apply fixed discount if any
              if (order.discountAmount && order.discountAmount > 0) {
                finalAmount -= order.discountAmount;
              }
              
              // Add delivery price
              if (order.deliveryPrice && order.deliveryPrice > 0) {
                finalAmount += order.deliveryPrice;
              }
            }
            
            // Format the order with all required fields
            ordersWithDetails.push({
              ...orderWithItems,
              reference: order.reference,
              finalAmount: Math.round(finalAmount), // Round to nearest integer
              // Explicitly add and convert all boolean checkbox fields
              fragile: Boolean(order.fragile),
              echange: Boolean(order.echange),
              pickup: Boolean(order.pickup),
              recouvrement: Boolean(order.recouvrement),
              stopDesk: Boolean(order.stopDesk),
              // Add commune directly from customer to the order object for EcoTrack export
              commune: customer.commune,
              wilayaCode: customer.wilaya, // Add wilaya code
              customer: {
                ...customer,
                // Ensure all customer fields needed for export exist
                phone2: customer.phone2 || "",
                wilayaCode: customer.wilaya // Add wilaya code to customer data
              },
              // Include items for product description
              items: orderWithItems.items || [],
              // Debug info
              debug: {
                stopDeskRaw: order.stopDesk,
                stopDeskType: typeof order.stopDesk,
                wilayaCodeRaw: customer.wilaya
              }
            });
          }
        }
      }
      
      // Write orders to a temporary JSON file
      const timestamp = new Date().getTime();
      const ordersJsonPath = path.join(os.tmpdir(), `orders_${timestamp}.json`);
      fs.writeFileSync(ordersJsonPath, JSON.stringify(ordersWithDetails));

      // Create output path
      const outputPath = path.join(os.tmpdir(), `ecotrack_export_${timestamp}.xlsx`);

      // Get template path - first check for uploaded template, then fallback to default
      const templatePath = path.join(process.cwd(), 'templates', 'upload_ecotrack_v31.xlsx');
      const defaultTemplatePath = path.join(process.cwd(), 'templates', 'upload_ecotrack_v31_default.xlsx');
      
      // Use default template if custom template doesn't exist
      const finalTemplatePath = fs.existsSync(templatePath) ? templatePath : defaultTemplatePath;
      
      if (!fs.existsSync(finalTemplatePath)) {
        return res.status(500).json({ 
          error: 'Failed to generate EcoTrack Excel file',
          details: 'Template file not found'
        });
      }

      try {
        // Execute the Python script with proper arguments
        const pythonScript = path.join(process.cwd(), 'server', 'ecotrack_excel_export.py');
        const pythonProcess = spawn('python', [
          pythonScript,
          '--orders', ordersJsonPath,
          '--template', finalTemplatePath,
          '--output', outputPath
        ]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
          stdoutData += data.toString();
          console.log(`[EcoTrack Export] ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
          stderrData += data.toString();
          console.error(`[EcoTrack Export Error] ${data.toString()}`);
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`[EcoTrack Export] Process exited with code ${code}`);
            console.error(`[EcoTrack Export] Error output: ${stderrData}`);
            return res.status(500).json({ 
              error: 'Failed to generate EcoTrack Excel file',
              details: stderrData
            });
          }

          if (fs.existsSync(outputPath)) {
            // Send the file to the client
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="ecotrack_export_${timestamp}.xlsx"`);
            
            const fileStream = fs.createReadStream(outputPath);
            fileStream.pipe(res);
            
            // Clean up the temporary files after sending
            fileStream.on('end', () => {
              try {
                fs.unlinkSync(ordersJsonPath);
                fs.unlinkSync(outputPath);
              } catch (err) {
                console.error("Error cleaning up files:", err);
              }
            });
          } else {
            res.status(500).json({ 
              error: 'Failed to generate EcoTrack Excel file',
              details: 'Output file not found'
            });
          }
        });

      } catch (error) {
        console.error("Error generating EcoTrack Excel file:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
          error: 'Failed to generate EcoTrack Excel file',
          details: errorMessage
        });
      }
    } catch (error) {
      console.error("Error exporting orders to EcoTrack Excel:", error);
      res.status(500).json({ message: "Failed to export orders to EcoTrack Excel" });
    }
  });

  // Delete an order by ID
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const success = await storage.deleteOrder(id);
      
      if (!success) {
        return res.status(404).json({ message: "Order not found or could not be deleted" });
      }
      
      res.status(204).send(); // No content response on successful delete
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Bulk delete orders
  app.post("/api/orders/bulk-delete", async (req, res) => {
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
          message: "No valid order IDs provided" 
        });
      }
      
      const result = await storage.bulkDeleteOrders(numericIds);
      
      res.json({
        message: `Deleted ${result.success} orders successfully. Failed to delete ${result.failed} orders.`,
        success: result.success,
        failed: result.failed
      });
    } catch (error) {
      console.error("Error bulk deleting orders:", error);
      res.status(500).json({ message: "Failed to bulk delete orders" });
    }
  });

  // ==================== Analytics API ====================
  
  // Simple in-memory cache for dashboard analytics
  const dashboardCache = {
    data: new Map<string, any>(),
    timestamp: new Map<string, number>(),
    ttl: 5 * 60 * 1000, // 5 minutes cache
    
    get(key: string): any {
      const cached = this.data.get(key);
      const timestamp = this.timestamp.get(key);
      
      if (cached && timestamp && Date.now() - timestamp < this.ttl) {
        console.log(`Using cached dashboard data for ${key}`);
        return cached;
      }
      
      return null;
    },
    
    set(key: string, data: any): void {
      this.data.set(key, data);
      this.timestamp.set(key, Date.now());
    }
  };

  // Get dashboard analytics with caching
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const period = req.query.period as 'day' | 'week' | 'month' | undefined;
      const cacheKey = `dashboard_${period || 'all'}`;
      
      // Check cache first
      const cachedData = dashboardCache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
      
      console.log(`Generating fresh dashboard data for ${period || 'all'}`);
      
      // Get current period data with optimized querying
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
      
      // Also get previous period data for comparison
      let previousPeriod = 'month';
      if (period === 'day') previousPeriod = 'day';
      if (period === 'week') previousPeriod = 'week';
      
      const now = new Date();
      let prevFromDate = new Date();
      let prevToDate = new Date();
      
      if (previousPeriod === 'day') {
        prevFromDate.setDate(now.getDate() - 2);
        prevToDate.setDate(now.getDate() - 1);
      } else if (previousPeriod === 'week') {
        prevFromDate.setDate(now.getDate() - 14);
        prevToDate.setDate(now.getDate() - 7);
      } else if (previousPeriod === 'month') {
        prevFromDate.setMonth(now.getMonth() - 2);
        prevToDate.setMonth(now.getMonth() - 1);
      }
      
      const [
        prevOrdersCount,
        prevTotalSales,
        prevProfit,
      ] = await Promise.all([
        storage.getOrdersCount(previousPeriod as 'day' | 'week' | 'month'),
        storage.getTotalSales(previousPeriod as 'day' | 'week' | 'month'),
        storage.getProfit(previousPeriod as 'day' | 'week' | 'month'),
      ]);
      
      // Calculate percent changes
      let percentOrdersChange = 0;
      let percentSalesChange = 0;
      let percentProfitChange = 0;
      
      if (prevOrdersCount > 0) {
        percentOrdersChange = Math.round(((ordersCount - prevOrdersCount) / prevOrdersCount) * 100);
      }
      
      if (prevTotalSales > 0) {
        percentSalesChange = Math.round(((totalSales - prevTotalSales) / prevTotalSales) * 100);
      }
      
      if (prevProfit > 0) {
        percentProfitChange = Math.round(((profit - prevProfit) / prevProfit) * 100);
      }
      
      // Calculate total books sold from the bestSellingBooks data
      const totalBooksSold = bestSellingBooks.reduce((total, item) => total + item.soldCount, 0);
      
      // Create response data
      const responseData = {
        ordersCount,
        totalSales,
        profit,
        discounts,
        bestSellingBooks,
        ordersByStatus,
        ordersByWilaya,
        totalBooksSold,
        comparisons: {
          ordersCount: {
            current: ordersCount,
            previous: prevOrdersCount,
            percentChange: percentOrdersChange
          },
          totalSales: {
            current: totalSales,
            previous: prevTotalSales,
            percentChange: percentSalesChange
          },
          profit: {
            current: profit,
            previous: prevProfit,
            percentChange: percentProfitChange
          },
          totalBooksSold: {
            current: totalBooksSold,
            previous: 0, // We don't track this yet
            percentChange: 0
          }
        }
      };
      
      // Store in cache for future requests
      dashboardCache.set(cacheKey, responseData);
      
      // Send response
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ==================== Enhanced Analytics API ====================

  // Simple in-memory cache for historical sales data
  const salesDataCache = {
    data: new Map<string, any>(),
    timestamp: new Map<string, number>(),
    ttl: 5 * 60 * 1000, // 5 minutes cache
    
    get(key: string): any {
      const cached = this.data.get(key);
      const timestamp = this.timestamp.get(key);
      
      if (cached && timestamp && Date.now() - timestamp < this.ttl) {
        console.log(`Using cached sales data for ${key}`);
        return cached;
      }
      
      return null;
    },
    
    set(key: string, data: any): void {
      this.data.set(key, data);
      this.timestamp.set(key, Date.now());
    }
  };

  // Get sales data for historical view with caching
  app.get("/api/analytics/sales", async (req, res) => {
    try {
      const period = req.query.period as string || 'year';
      const range = req.query.range as string || 'all';
      const groupBy = req.query.groupBy as string || 'month';
      
      // Create cache key based on query parameters
      const cacheKey = `sales_${period}_${range}_${groupBy}`;
      
      // Check cache first
      const cachedData = salesDataCache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
      
      console.log(`Generating fresh sales data for ${cacheKey}`);
      
      // Get all orders with items
      const allOrders = await storage.getOrders();
      
      // Create monthly sales data with extended metrics
      const monthlyData: { month: string; sales: number; ordersCount: number; booksCount: number; avgOrderValue: number }[] = [];
      
      // Define month names
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      // Initialize monthly data with zeros for all months
      for (let i = 0; i < 12; i++) {
        monthlyData.push({ 
          month: monthNames[i], 
          sales: 0,
          ordersCount: 0,
          booksCount: 0,
          avgOrderValue: 0
        });
      }
      
      // Only include actual sales from orders in the current year
      const currentYear = new Date().getFullYear();
      
      for (const order of allOrders) {
        const orderDate = new Date(order.createdAt);
        const orderYear = orderDate.getFullYear();
        
        // Only count orders from the current year
        if (orderYear === currentYear) {
          const monthIndex = orderDate.getMonth();
          
          // Add sales metrics
          monthlyData[monthIndex].sales += Number(order.finalAmount) || Number(order.totalAmount) || 0;
          monthlyData[monthIndex].ordersCount += 1;
          
          // Count books in this order
          if (order.items && Array.isArray(order.items)) {
            // Sum the quantities of all items
            const bookCount = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            monthlyData[monthIndex].booksCount += bookCount;
          }
        }
      }
      
      // Calculate average order value for each month
      for (const monthData of monthlyData) {
        if (monthData.ordersCount > 0) {
          monthData.avgOrderValue = Math.round(monthData.sales / monthData.ordersCount);
        }
      }
      
      // Filter data based on period if needed
      let filteredData = [...monthlyData];
      if (period === 'month' || range === 'month') {
        // Last month only
        const currentMonth = new Date().getMonth();
        filteredData = [monthlyData[currentMonth === 0 ? 11 : currentMonth - 1]];
      } else if (period === 'quarter' || range === '90days') {
        // Last 3 months
        const currentMonth = new Date().getMonth();
        filteredData = [];
        for (let i = 0; i < 3; i++) {
          // Calculate month index with wraparound for previous year
          const monthIndex = (currentMonth - i + 12) % 12;
          filteredData.unshift(monthlyData[monthIndex]);
        }
      } else if (period === 'year' || range === 'year') {
        // All 12 months (already set)
        // Keep only months up to the current month
        const currentMonth = new Date().getMonth();
        for (let i = 0; i <= currentMonth; i++) {
          // Keep actual data for these months
        }
        
        // Previous months should show 0 to avoid misleading data
        for (let i = currentMonth + 1; i < 12; i++) {
          monthlyData[i].sales = 0;
          monthlyData[i].ordersCount = 0;
          monthlyData[i].booksCount = 0;
          monthlyData[i].avgOrderValue = 0;
        }
      }
      
      // Store in cache for future requests
      salesDataCache.set(cacheKey, filteredData);
      
      // Send response
      res.json(filteredData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      res.status(500).json({ message: "Failed to fetch sales data" });
    }
  });

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
              ? `Validation error for wilaya ${priceData.wilayaId}: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` 
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
      // Using the xlsx import from the top of the file
      
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
  
  // Upload template for EcoTrack
  app.post('/api/templates/ecotrack-upload', upload.single('template'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Create templates directory if it doesn't exist
      const templatesDir = path.join(process.cwd(), 'templates');
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }
      
      // Check if we should keep this as the default template
      const keepAsDefault = req.body.keepAsDefault === 'true';
      
      // Move the file to templates directory with the correct name
      const targetPath = path.join(templatesDir, 'upload_ecotrack_v31.xlsx');
      
      // Copy the file to the templates directory
      fs.copyFileSync(req.file.path, targetPath);
      
      // If keep as default is selected, create a backup copy with different name
      if (keepAsDefault) {
        const backupPath = path.join(templatesDir, 'upload_ecotrack_v31_default.xlsx');
        fs.copyFileSync(req.file.path, backupPath);
        console.log('Created backup of template as default:', backupPath);
      }
      
      // Clean up the temporary file
      fs.unlinkSync(req.file.path);
      
      res.status(200).json({ 
        message: keepAsDefault 
          ? 'EcoTrack template uploaded successfully and saved as default' 
          : 'EcoTrack template uploaded successfully',
        path: targetPath,
        isDefault: keepAsDefault
      });
    } catch (error) {
      console.error('Error uploading EcoTrack template:', error);
      res.status(500).json({ message: 'Failed to upload EcoTrack template' });
    }
  });
  
  // Serve templates
  app.use('/templates', (req, res, next) => {
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    next();
  }, express.static('templates'));

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
      // We need to get the user by ID, not username
      const user = await storage.getUserById(id);
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
    // Check if this is an API call
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // For frontend routes, redirect to login
    res.redirect('/login');
  };
  
  // ==================== Loyalty System API ====================
  
  // Get loyalty settings
  app.get("/api/loyalty/settings", async (req, res) => {
    try {
      const settings = await storage.getLoyaltySettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching loyalty settings:", error);
      res.status(500).json({ message: "Failed to fetch loyalty settings" });
    }
  });
  
  // Update loyalty settings
  app.put("/api/loyalty/settings", async (req, res) => {
    try {
      const settingsData = insertLoyaltySettingsSchema.partial().parse(req.body);
      const updatedSettings = await storage.updateLoyaltySettings(settingsData);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      console.error("Error updating loyalty settings:", error);
      res.status(500).json({ message: "Failed to update loyalty settings" });
    }
  });
  
  // Get customer loyalty points and tier
  app.get("/api/loyalty/customers/:id", async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      const loyalty = await storage.getCustomerLoyaltyPoints(customerId);
      res.json(loyalty);
    } catch (error) {
      console.error("Error fetching customer loyalty info:", error);
      res.status(500).json({ 
        message: "Failed to fetch customer loyalty information",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Manually add points to a customer
  app.post("/api/loyalty/customers/:id/add-points", async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      const { points, orderId, orderAmount } = req.body;
      
      if (typeof points !== 'number' || points <= 0) {
        return res.status(400).json({ message: "Points must be a positive number" });
      }
      
      // If orderId is provided, validate it
      let orderIdNumber = 0;
      if (orderId) {
        orderIdNumber = Number(orderId);
        if (isNaN(orderIdNumber)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
      }
      
      // Calculate final amount if not provided
      const finalOrderAmount = typeof orderAmount === 'number' ? orderAmount : points * 10;
      
      const addedPoints = await storage.addLoyaltyPoints(
        customerId, 
        orderIdNumber, 
        points,
        finalOrderAmount
      );
      
      res.json({ 
        success: true, 
        customerId,
        pointsAdded: addedPoints,
        message: `Added ${addedPoints} points to customer #${customerId}`
      });
    } catch (error) {
      console.error("Error adding loyalty points:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to add loyalty points", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Redeem points for a customer
  app.post("/api/loyalty/customers/:id/redeem-points", async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      const { points, description } = req.body;
      
      if (typeof points !== 'number' || points <= 0) {
        return res.status(400).json({ message: "Points must be a positive number" });
      }
      
      const redemptionDescription = description || "Points redeemed";
      
      const success = await storage.redeemLoyaltyPoints(
        customerId, 
        points,
        redemptionDescription
      );
      
      // Get updated loyalty points after redemption
      const updatedLoyalty = await storage.getCustomerLoyaltyPoints(customerId);
      
      res.json({ 
        success,
        customerId,
        pointsRedeemed: points,
        currentPoints: updatedLoyalty.points,
        currentTier: updatedLoyalty.tier,
        message: `Redeemed ${points} points from customer #${customerId}`
      });
    } catch (error) {
      console.error("Error redeeming loyalty points:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to redeem loyalty points", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get all customers with loyalty information
  app.get("/api/loyalty/customers", async (req, res) => {
    try {
      // Get query parameters for filtering
      const loyaltyTier = req.query.tier ? String(req.query.tier) : undefined;
      const minPoints = req.query.minPoints ? Number(req.query.minPoints) : 0;
      
      // Get all customers
      const allCustomers = await storage.getCustomers();
      
      // Apply filters if specified
      let filteredCustomers = allCustomers;
      
      if (loyaltyTier && loyaltyTier !== 'all') {
        filteredCustomers = filteredCustomers.filter(customer => 
          customer.loyaltyTier === loyaltyTier
        );
      }
      
      if (minPoints > 0) {
        filteredCustomers = filteredCustomers.filter(customer => 
          (customer.loyaltyPoints || 0) >= minPoints
        );
      }
      
      // Format and return the customers with their loyalty information
      const customersWithLoyalty = filteredCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        phone2: customer.phone2,
        address: customer.address,
        wilaya: customer.wilaya,
        commune: customer.commune,
        loyaltyPoints: customer.loyaltyPoints || 0,
        loyaltyTier: customer.loyaltyTier || 'regular',
        createdAt: customer.createdAt,
      }));
      
      res.json(customersWithLoyalty);
    } catch (error) {
      console.error("Error fetching customers with loyalty info:", error);
      res.status(500).json({ 
        message: "Failed to fetch customers",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get loyalty transactions for a customer
  app.get("/api/loyalty/customers/:id/transactions", async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      let limit = 50; // Default limit
      if (req.query.limit) {
        const queryLimit = Number(req.query.limit);
        if (!isNaN(queryLimit) && queryLimit > 0) {
          limit = Math.min(queryLimit, 100); // Cap at 100 for performance
        }
      }
      
      const transactions = await storage.getLoyaltyTransactions(customerId, limit);
      
      // Get customer and loyalty info
      const customer = await storage.getCustomerById(customerId);
      const loyaltyInfo = await storage.getCustomerLoyaltyPoints(customerId);
      
      res.json({
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          loyaltyPoints: customer.loyaltyPoints,
          loyaltyTier: customer.loyaltyTier
        } : null,
        currentPoints: loyaltyInfo.points,
        currentTier: loyaltyInfo.tier,
        transactions
      });
    } catch (error) {
      console.error("Error fetching loyalty transactions:", error);
      res.status(500).json({ 
        message: "Failed to fetch loyalty transactions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Recalculate a customer's loyalty tier
  app.post("/api/loyalty/customers/:id/recalculate-tier", async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      const newTier = await storage.recalculateLoyaltyTier(customerId);
      
      // Get customer data after update
      const customer = await storage.getCustomerById(customerId);
      
      res.json({
        success: true,
        customerId,
        newTier,
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          loyaltyPoints: customer.loyaltyPoints,
          loyaltyTier: customer.loyaltyTier
        } : null,
        message: `Customer #${customerId} tier updated to ${newTier}`
      });
    } catch (error) {
      console.error("Error recalculating loyalty tier:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to recalculate loyalty tier",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ==================== Authentication API ====================
  
  // Auto-login endpoint for testing - logs in as admin automatically
  app.get("/auto-login", async (req, res, next) => {
    try {
      // Get admin user
      const adminUser = await storage.getUserByUsername('admin');
      
      if (!adminUser) {
        // Create admin user if not exists
        try {
          await storage.createUser({
            username: 'admin',
            password: 'password',
            fullName: 'Admin User',
            role: 'admin'
          });
          
          // Try to get the user again
          const createdAdmin = await storage.getUserByUsername('admin');
          if (!createdAdmin) {
            return res.status(500).json({ message: "Failed to create admin user" });
          }
          
          req.login(createdAdmin, (err) => {
            if (err) {
              return next(err);
            }
            return res.redirect('/dashboard');
          });
        } catch (error) {
          console.error("Error creating admin user:", error);
          return res.status(500).json({ message: "Failed to create admin user" });
        }
      } else {
        // Log in as admin
        const { password, ...userWithoutPassword } = adminUser;
        req.login(userWithoutPassword, (err) => {
          if (err) {
            return next(err);
          }
          return res.redirect('/dashboard');
        });
      }
    } catch (error) {
      console.error("Auto-login error:", error);
      return res.status(500).json({ message: "Auto-login failed" });
    }
  });
  
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
  
  // Auto-login endpoint is now defined above

  const httpServer = createServer(app);
  return httpServer;
}
