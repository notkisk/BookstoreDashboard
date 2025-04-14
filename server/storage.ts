import { 
  books, type Book, type InsertBook,
  customers, type Customer, type InsertCustomer,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  deliveryPrices, type DeliveryPrice, type InsertDeliveryPrice,
  users, type User, type InsertUser,
  loyaltyTransactions, type LoyaltyTransaction, type InsertLoyaltyTransaction,
  loyaltySettings, type LoyaltySettings, type InsertLoyaltySettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, sql as sqlBuilder, count, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

// Fix for the "in" function since we can't import it as "in"
const inOp = inArray;

// Interface for all storage operations
export interface IStorage {
  // Book operations
  getBooks(): Promise<Book[]>;
  getBookById(id: number): Promise<Book | undefined>;
  searchBooks(query: string): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, book: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: number): Promise<boolean>;
  bulkDeleteBooks(ids: number[]): Promise<{ success: number; failed: number }>;
  
  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  
  // Order operations
  getOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<{ order: Order; items: (OrderItem & { book: Book })[] } | undefined>;
  createOrder(order: InsertOrder, items: Omit<InsertOrderItem, "orderId">[]): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  
  // Delivery price operations
  getDeliveryPrices(): Promise<DeliveryPrice[]>;
  getDeliveryPriceByWilayaId(wilayaId: string): Promise<DeliveryPrice | undefined>;
  createDeliveryPrice(price: InsertDeliveryPrice): Promise<DeliveryPrice>;
  updateDeliveryPrice(id: number, price: Partial<InsertDeliveryPrice>): Promise<DeliveryPrice | undefined>;
  
  // Analytics
  getOrdersCount(period?: 'day' | 'week' | 'month'): Promise<number>;
  getTotalSales(period?: 'day' | 'week' | 'month'): Promise<number>;
  getProfit(period?: 'day' | 'week' | 'month'): Promise<number>;
  getTotalDiscounts(period?: 'day' | 'week' | 'month'): Promise<{ amount: number; percentage: number }>;
  getBestSellingBooks(limit?: number): Promise<{ book: Book; soldCount: number }[]>;
  getOrdersByStatus(): Promise<{ status: string; count: number }[]>;
  getOrdersByWilaya(limit?: number): Promise<{ wilayaId: string; wilayaName: string; count: number }[]>;
  
  // User operations
  getUserById(id: number): Promise<User | undefined>;  
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, "password"> & { password: string }): Promise<Omit<User, "password">>;
  validateUserCredentials(username: string, password: string): Promise<Omit<User, "password"> | null>;
  
  // Loyalty operations
  getLoyaltySettings(): Promise<LoyaltySettings>;
  updateLoyaltySettings(settings: Partial<InsertLoyaltySettings>): Promise<LoyaltySettings>;
  getCustomerLoyaltyPoints(customerId: number): Promise<{ points: number; tier: string }>;
  addLoyaltyPoints(customerId: number, orderId: number, amount: number, orderAmount: number): Promise<number>;
  redeemLoyaltyPoints(customerId: number, points: number, description?: string): Promise<boolean>;
  getLoyaltyTransactions(customerId: number, limit?: number): Promise<LoyaltyTransaction[]>;
  recalculateLoyaltyTier(customerId: number): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // Book operations
  async getBooks(): Promise<Book[]> {
    return await db.select().from(books).orderBy(books.title);
  }

  async getBookById(id: number): Promise<Book | undefined> {
    const results = await db.select().from(books).where(eq(books.id, id));
    return results[0];
  }

  async searchBooks(query: string): Promise<Book[]> {
    // Normalize Arabic characters for better searching
    const normalizedQuery = this.normalizeArabicText(query);
    
    // Create SQL pattern for each search variation
    const titlePattern = `%${query}%`;
    const authorPattern = `%${query}%`;
    const normalizedPattern = `%${normalizedQuery}%`;
    
    return await db
      .select()
      .from(books)
      .where(
        sqlBuilder`
          LOWER(${books.title}) LIKE LOWER(${titlePattern})
          OR LOWER(${books.author}) LIKE LOWER(${authorPattern})
          OR REPLACE(REPLACE(REPLACE(LOWER(${books.title}), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') LIKE LOWER(${normalizedPattern})
          OR REPLACE(REPLACE(REPLACE(LOWER(${books.author}), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') LIKE LOWER(${normalizedPattern})
        `
      )
      .orderBy(books.title);
  }
  
  // Helper method to normalize Arabic text for searching
  private normalizeArabicText(text: string): string {
    if (!text) return '';
    
    // Normalize common Arabic character variations
    return text
      .toLowerCase()
      .replace(/أ|إ|آ/g, 'ا')  // Normalize alif variations
      .replace(/ة/g, 'ه')      // Ta marbuta to Ha
      .replace(/ى/g, 'ي')      // Alif maksura to Ya
      .replace(/ئ/g, 'ي')      // Hamza on Ya to Ya
      .replace(/ؤ/g, 'و')      // Hamza on Waw to Waw
      .replace(/ء/g, '')       // Remove standalone Hamza
      .replace(/ـ/g, '');      // Remove Tatweel
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [newBook] = await db.insert(books).values(book).returning();
    return newBook;
  }

  async updateBook(id: number, book: Partial<InsertBook>): Promise<Book | undefined> {
    const [updatedBook] = await db
      .update(books)
      .set({ ...book, updatedAt: new Date() })
      .where(eq(books.id, id))
      .returning();
    return updatedBook;
  }

  async deleteBook(id: number): Promise<boolean> {
    const result = await db.delete(books).where(eq(books.id, id));
    return true;
  }
  
  async bulkDeleteBooks(ids: number[]): Promise<{ success: number; failed: number }> {
    if (!ids.length) {
      return { success: 0, failed: 0 };
    }
    
    try {
      // Use the IN operator for efficient bulk deletion
      // The placeholders should be handled properly with an array parameter
      const placeholders = ids.map(() => '?').join(',');
      const result = await db
        .delete(books)
        .where(sqlBuilder`${books.id} IN (${placeholders})`, ...ids)
        .returning({ id: books.id });
      
      // Return the success count based on how many records were actually deleted
      const successCount = result.length;
      
      return {
        success: successCount,
        failed: ids.length - successCount
      };
    } catch (error) {
      console.error("Error in bulk delete operation:", error);
      return { success: 0, failed: ids.length };
    }
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const results = await db.select().from(customers).where(eq(customers.id, id));
    return results[0];
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const results = await db.select().from(customers).where(eq(customers.phone, phone));
    return results[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  // Order operations
  async getOrders(): Promise<(Order & { customer?: Customer; items?: (OrderItem & { book: Book })[] })[]> {
    // First get all orders
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
    
    // For each order, fetch customer and items
    const ordersWithDetails = await Promise.all(
      allOrders.map(async (order) => {
        // Get customer
        const customerResult = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId));
        
        const customer = customerResult[0];
        
        // Get items with book details
        const orderItemsWithBooks = await db
          .select({
            orderItem: orderItems,
            book: books,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))
          .innerJoin(books, eq(orderItems.bookId, books.id));
          
        const items = orderItemsWithBooks.map(({ orderItem, book }) => ({
          ...orderItem,
          book,
        }));
        
        return {
          ...order,
          customer,
          items,
        };
      })
    );
    
    return ordersWithDetails;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const results = await db.select().from(orders).where(eq(orders.id, id));
    return results[0];
  }

  async getOrderWithItems(id: number): Promise<{ order: Order; items: (OrderItem & { book: Book })[] } | undefined> {
    const orderResult = await db.select().from(orders).where(eq(orders.id, id));
    
    if (!orderResult[0]) return undefined;
    
    const order = orderResult[0];
    
    const items = await db
      .select({
        orderItem: orderItems,
        book: books
      })
      .from(orderItems)
      .innerJoin(books, eq(orderItems.bookId, books.id))
      .where(eq(orderItems.orderId, id));
    
    return {
      order,
      items: items.map(item => ({ ...item.orderItem, book: item.book }))
    };
  }

  async createOrder(order: InsertOrder, items: Omit<InsertOrderItem, "orderId">[]): Promise<Order> {
    // Generate a unique reference number for the order
    const reference = `ORD-${nanoid(8).toUpperCase()}`;
    
    // Calculate the final amount after discounts
    let finalAmount = order.totalAmount;
    
    // Apply percentage discount first if present
    if (order.discountPercentage && order.discountPercentage > 0) {
      const percentageDiscount = Math.round(order.totalAmount * (order.discountPercentage / 100));
      finalAmount -= percentageDiscount;
    }
    
    // Then apply fixed amount discount if present
    if (order.discountAmount && order.discountAmount > 0) {
      finalAmount -= order.discountAmount;
      // Ensure we don't have negative final amount
      finalAmount = Math.max(0, finalAmount);
    }
    
    // Add delivery price to final amount
    finalAmount += (order.deliveryPrice || 0);
    
    // Create the order with initial "pending" status
    const [newOrder] = await db
      .insert(orders)
      .values({ 
        ...order, 
        status: "pending", 
        reference,
        finalAmount 
      })
      .returning();
    
    // Add the order items
    if (items.length > 0) {
      // Convert items to InsertOrderItem objects with orderId
      const orderItemsToInsert = items.map(item => ({
        ...item,
        orderId: newOrder.id
      }));
      
      // Insert all order items
      await db.insert(orderItems).values(orderItemsToInsert);
      
      // Don't update inventory for pending orders per requirement
      // Inventory will be updated when order status changes from pending to delivering
    }
    
    // Add loyalty points for the customer
    // We only add points when the order is actually delivered, not when it's created
    // This is done in the updateOrderStatus function when status changes to "delivered"
    
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    // Get current order data with items
    const orderData = await this.getOrderWithItems(id);
    if (!orderData) return undefined;
    
    const oldStatus = orderData.order.status;
    const newStatus = status;
    
    // Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    
    // Update inventory based on status change
    if (orderData.items.length > 0) {
      for (const item of orderData.items) {
        // Get current book data
        const bookResult = await db.select().from(books).where(eq(books.id, item.bookId));
        if (bookResult.length === 0) continue;
        
        const book = bookResult[0];
        const itemQuantity = item.quantity || 1; // Default to 1 if quantity is undefined
        
        // Handle various status transitions
        
        // 1. If order status changes from pending to delivering:
        // Decrease the stock quantity and add to delivering stock
        if (oldStatus === "pending" && newStatus === "delivering") {
          const newDeliveringStock = book.deliveringStock + itemQuantity;
          const newQuantityLeft = Math.max(0, book.quantityLeft - itemQuantity);
          
          await db
            .update(books)
            .set({ 
              deliveringStock: newDeliveringStock,
              quantityLeft: newQuantityLeft,
              updatedAt: new Date()
            })
            .where(eq(books.id, item.bookId));
        } 
        // 2. If order status changes from delivering to delivered:
        // Decrease the delivering stock and add to sold stock
        else if (oldStatus === "delivering" && newStatus === "delivered") {
          const newDeliveringStock = Math.max(0, book.deliveringStock - itemQuantity);
          const newSoldStock = book.soldStock + itemQuantity;
          
          await db
            .update(books)
            .set({ 
              deliveringStock: newDeliveringStock,
              soldStock: newSoldStock,
              updatedAt: new Date()
            })
            .where(eq(books.id, item.bookId));
        } 
        // 3. If order status changes from pending to reactionary:
        // No change, as no stock was moved yet
        else if (oldStatus === "pending" && newStatus === "reactionary") {
          // No inventory change needed since no items were moved from stock
        }
        // 4. If order status changes from delivering to reactionary:
        // Move books from delivering back to available stock
        else if (oldStatus === "delivering" && newStatus === "reactionary") {
          const newDeliveringStock = Math.max(0, book.deliveringStock - itemQuantity);
          const newQuantityLeft = book.quantityLeft + itemQuantity;
          
          await db
            .update(books)
            .set({ 
              deliveringStock: newDeliveringStock,
              quantityLeft: newQuantityLeft,
              updatedAt: new Date()
            })
            .where(eq(books.id, item.bookId));
        }
        // 5. Handle other return cases (returned, cancelled, etc.)
        else if ((oldStatus === "pending" || oldStatus === "delivering") && 
                (newStatus === "returned" || newStatus === "cancelled")) {
          // Return books to available stock
          const newQuantityLeft = book.quantityLeft + 
            (oldStatus === "delivering" ? itemQuantity : 0);
          const newDeliveringStock = oldStatus === "delivering" 
            ? Math.max(0, book.deliveringStock - itemQuantity)
            : book.deliveringStock;
          
          await db
            .update(books)
            .set({ 
              quantityLeft: newQuantityLeft,
              deliveringStock: newDeliveringStock,
              updatedAt: new Date()
            })
            .where(eq(books.id, item.bookId));
        }
      }
    }
    
    // Add loyalty points when an order is delivered
    if (newStatus === "delivered" && oldStatus !== "delivered") {
      try {
        // Add loyalty points for the customer
        const customerId = orderData.order.customerId;
        const finalAmount = orderData.order.finalAmount;
        
        // We don't use the amount parameter here - instead calculating based on the finalAmount
        await this.addLoyaltyPoints(
          customerId, 
          id, 
          0, // This parameter is not used as we calculate points from orderAmount
          finalAmount
        );
      } catch (error) {
        console.error("Error adding loyalty points:", error);
        // We don't throw - we don't want to prevent status update if loyalty points fail
      }
    }
    
    return updatedOrder;
  }

  async deleteOrder(id: number): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id));
    return true;
  }

  // Analytics
  async getOrdersCount(period?: 'day' | 'week' | 'month'): Promise<number> {
    const now = new Date();
    let fromDate: Date | undefined = undefined;
    
    if (period) {
      fromDate = new Date();
      if (period === 'day') {
        fromDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        fromDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        fromDate.setMonth(now.getMonth() - 1);
      }
    }
    
    // Only count delivered orders
    const query = db.select({ count: count() }).from(orders)
      .where(eq(orders.status, 'delivered'));
    
    // Add date filter if period is specified
    if (fromDate) {
      // Convert dates to ISO string for proper SQL compatibility
      const fromDateStr = fromDate.toISOString();
      const nowStr = now.toISOString();
      
      query.where(
        and(
          eq(orders.status, 'delivered'),
          sqlBuilder`${orders.createdAt} >= ${fromDateStr}`,
          sqlBuilder`${orders.createdAt} <= ${nowStr}`
        )
      );
    }
    
    const result = await query;
    return result[0]?.count || 0;
  }

  async getTotalSales(period?: 'day' | 'week' | 'month'): Promise<number> {
    const now = new Date();
    let fromDate: Date | undefined = undefined;
    
    if (period) {
      fromDate = new Date();
      if (period === 'day') {
        fromDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        fromDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        fromDate.setMonth(now.getMonth() - 1);
      }
    }
    
    // Only count delivered orders for total sales
    const query = db
      .select({ total: sqlBuilder`sum(${orders.totalAmount})` })
      .from(orders)
      .where(eq(orders.status, 'delivered'));
    
    // Add date filter if period is specified
    if (fromDate) {
      // Convert dates to ISO string for proper SQL compatibility
      const fromDateStr = fromDate.toISOString();
      const nowStr = now.toISOString();
      
      query.where(
        and(
          eq(orders.status, 'delivered'),
          sqlBuilder`${orders.createdAt} >= ${fromDateStr}`,
          sqlBuilder`${orders.createdAt} <= ${nowStr}`
        )
      );
    }
    
    const result = await query;
    return Number(result[0]?.total) || 0;
  }

  async getProfit(period?: 'day' | 'week' | 'month'): Promise<number> {
    const now = new Date();
    let fromDate: Date | undefined = undefined;
    
    if (period) {
      fromDate = new Date();
      if (period === 'day') {
        fromDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        fromDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        fromDate.setMonth(now.getMonth() - 1);
      }
    }
    
    // Get all delivered orders
    let ordersQuery = db
      .select({
        id: orders.id,
        total: orders.totalAmount
      })
      .from(orders)
      .where(eq(orders.status, 'delivered')); // Only count delivered orders
    
    // Add date filter if period is specified
    if (fromDate) {
      const fromDateStr = fromDate.toISOString();
      const nowStr = now.toISOString();
      
      ordersQuery = db
        .select({
          id: orders.id,
          total: orders.totalAmount
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, 'delivered'),
            sqlBuilder`${orders.createdAt} >= ${fromDateStr}`,
            sqlBuilder`${orders.createdAt} <= ${nowStr}`
          )
        );
    }
    
    const deliveredOrders = await ordersQuery;
    
    if (deliveredOrders.length === 0) return 0;
    
    // Calculate total sales from delivered orders
    const salesTotal = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    
    // Get all order items in a single query with join to books
    const orderIds = deliveredOrders.map(order => order.id);
    
    // Direct join query to get all items and their book costs in one go
    // This avoids multiple individual queries
    const orderItemsResult = await db
      .select({
        quantity: orderItems.quantity,
        buyPrice: books.buyPrice
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .innerJoin(books, eq(orderItems.bookId, books.id));
    
    // Calculate total cost of all items
    let costTotal = 0;
    for (const item of orderItemsResult) {
      costTotal += (Number(item.quantity) || 0) * (Number(item.buyPrice) || 0);
    }
    
    // Return profit (sales minus costs)
    return Math.abs(salesTotal - costTotal);
  }
    
  async getTotalDiscounts(period?: 'day' | 'week' | 'month'): Promise<{ amount: number; percentage: number }> {
    const now = new Date();
    let fromDate: Date | undefined = undefined;
    
    if (period) {
      fromDate = new Date();
      if (period === 'day') {
        fromDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        fromDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        fromDate.setMonth(now.getMonth() - 1);
      }
    }
    
    // Build the query with date filter and status filter for delivered orders only
    const query = db.select({
      totalAmount: sqlBuilder`SUM(${orders.totalAmount})`,
      totalDiscountAmount: sqlBuilder`SUM(${orders.discountAmount})`,
      totalDiscountPercentageValue: sqlBuilder`SUM(${orders.totalAmount} * ${orders.discountPercentage} / 100)`
    })
    .from(orders)
    .where(eq(orders.status, 'delivered'));
    
    if (fromDate) {
      // Convert dates to ISO string for proper SQL compatibility
      const fromDateStr = fromDate.toISOString();
      const nowStr = now.toISOString();
      
      query.where(
        and(
          eq(orders.status, 'delivered'),
          sqlBuilder`${orders.createdAt} >= ${fromDateStr}`,
          sqlBuilder`${orders.createdAt} <= ${nowStr}`
        )
      );
    }
    
    const result = await query;
    
    // Extract and calculate values
    const totalSales = Number(result[0]?.totalAmount) || 0;
    const discountAmount = Number(result[0]?.totalDiscountAmount) || 0;
    const discountPercentageValue = Number(result[0]?.totalDiscountPercentageValue) || 0;
    
    // Total discount amount (fixed + percentage)
    const totalDiscountAmount = discountAmount + discountPercentageValue;
    
    // Calculate percentage of total sales
    const discountPercentageOfSales = totalSales > 0 
      ? (totalDiscountAmount / totalSales) * 100 
      : 0;
    
    return { 
      amount: Math.round(totalDiscountAmount), 
      percentage: Number(discountPercentageOfSales.toFixed(2))
    };
  }

  async getBestSellingBooks(limit: number = 5): Promise<{ book: Book; soldCount: number }[]> {
    // Get the total sold quantity for each book in one query, but only for delivered orders
    const bookSales = await db
      .select({
        bookId: orderItems.bookId,
        totalQuantity: sqlBuilder`SUM(${orderItems.quantity})`
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.status, 'delivered')) // Only count delivered orders
      .groupBy(orderItems.bookId)
      .orderBy(sqlBuilder`SUM(${orderItems.quantity}) DESC`)
      .limit(limit);
      
    if (bookSales.length === 0) return [];
    
    // Get the book details for these top-selling books
    const bookIds = bookSales.map(sale => sale.bookId);
    const topBooks = await db
      .select()
      .from(books)
      .where(inArray(books.id, bookIds));
      
    // Create a map for easy lookup of book sales
    const salesMap = new Map();
    bookSales.forEach(sale => {
      salesMap.set(sale.bookId, Number(sale.totalQuantity) || 0);
    });
    
    // Build the result array with book info and sales counts
    const results = topBooks.map(book => ({
      book,
      soldCount: salesMap.get(book.id) || 0
    }));
    
    // Sort by sold count (in case the database sort order is different)
    return results.sort((a, b) => b.soldCount - a.soldCount);
  }
  
  async getOrdersByStatus(): Promise<{ status: string; count: number }[]> {
    return await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .groupBy(orders.status)
      .orderBy(desc(count()));
  }
  
  async getOrdersByWilaya(limit: number = 10): Promise<{ wilayaId: string; wilayaName: string; count: number }[]> {
    // Get customer wilaya information
    const customersTable = customers;
    const customerInfo = await db
      .select({
        id: customersTable.id,
        wilaya: customersTable.wilaya,
      })
      .from(customersTable);
    
    const customerMap = new Map<number, string>();
    customerInfo.forEach((c: { id: number, wilaya: string }) => customerMap.set(c.id, c.wilaya));
    
    // Get counts by customer ID for delivered orders only
    const orderCounts = await db
      .select({
        customerId: orders.customerId,
        count: count(),
      })
      .from(orders)
      .where(eq(orders.status, 'delivered')) // Only count delivered orders
      .groupBy(orders.customerId);
    
    // Group by wilaya
    const wilayaCountMap = new Map<string, number>();
    
    for (const order of orderCounts) {
      const wilayaId = customerMap.get(order.customerId);
      if (wilayaId) {
        const currentCount = wilayaCountMap.get(wilayaId) || 0;
        wilayaCountMap.set(wilayaId, currentCount + order.count);
      }
    }
    
    // Convert to array, sort, and limit
    const result = Array.from(wilayaCountMap.entries())
      .map(([wilayaId, count]) => ({
        wilayaId,
        wilayaName: this.getWilayaName(wilayaId),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return result;
  }
  
  // Helper method to get wilaya name from ID
  private getWilayaName(id: string): string {
    // Map of wilaya IDs to names - this could be expanded to a full list
    const wilayaNames: Record<string, string> = {
      "1": "Adrar",
      "2": "Chlef",
      "3": "Laghouat",
      "4": "Oum El Bouaghi",
      "5": "Batna",
      "6": "Béjaïa",
      "7": "Biskra",
      "8": "Béchar",
      "9": "Blida",
      "10": "Bouira",
      "11": "Tamanrasset",
      "12": "Tébessa",
      "13": "Tlemcen",
      "14": "Tiaret",
      "15": "Tizi Ouzou",
      "16": "Alger",
      "17": "Djelfa",
      "18": "Jijel",
      "19": "Sétif",
      "20": "Saïda",
      "21": "Skikda",
      "22": "Sidi Bel Abbès",
      "23": "Annaba",
      "24": "Guelma",
      "25": "Constantine",
      "26": "Médéa",
      "27": "Mostaganem",
      "28": "M'Sila",
      "29": "Mascara",
      "30": "Ouargla",
      "31": "Oran",
      "32": "El Bayadh",
      "33": "Illizi",
      "34": "Bordj Bou Arréridj",
      "35": "Boumerdès",
      "36": "El Tarf",
      "37": "Tindouf",
      "38": "Tissemsilt",
      "39": "El Oued",
      "40": "Khenchela",
      "41": "Souk Ahras",
      "42": "Tipaza",
      "43": "Mila",
      "44": "Aïn Defla",
      "45": "Naâma",
      "46": "Aïn Témouchent",
      "47": "Ghardaïa",
      "48": "Relizane",
      "49": "Timimoun",
      "50": "Bordj Baji Mokhtar",
      "51": "Ouled Djellal",
      "52": "Béni Abbès",
      "53": "In Salah",
      "54": "In Guezzam",
      "55": "Touggourt",
      "56": "Djanet",
      "57": "El M'Ghair",
      "58": "El Meniaa"
    };
    
    return wilayaNames[id] || `Wilaya ${id}`;
  }
  
  // Delivery price operations
  async getDeliveryPrices(): Promise<DeliveryPrice[]> {
    return await db.select().from(deliveryPrices).orderBy(deliveryPrices.wilayaId);
  }
  
  async getDeliveryPriceByWilayaId(wilayaId: string): Promise<DeliveryPrice | undefined> {
    const results = await db.select().from(deliveryPrices).where(eq(deliveryPrices.wilayaId, wilayaId));
    return results[0];
  }
  
  async createDeliveryPrice(price: InsertDeliveryPrice): Promise<DeliveryPrice> {
    const [newPrice] = await db.insert(deliveryPrices).values(price).returning();
    return newPrice;
  }
  
  async updateDeliveryPrice(id: number, price: Partial<InsertDeliveryPrice>): Promise<DeliveryPrice | undefined> {
    const [updatedPrice] = await db
      .update(deliveryPrices)
      .set({ ...price, updatedAt: new Date() })
      .where(eq(deliveryPrices.id, id))
      .returning();
    return updatedPrice;
  }

  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Special case for admin - try to find it ignoring case
    if (username.toLowerCase() === 'admin') {
      const results = await db.select().from(users).where(eq(users.username, 'admin'));
      if (results.length > 0) {
        return results[0];
      }
    }
    
    // Normal case-sensitive search
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async createUser(user: Omit<InsertUser, "password"> & { password: string }): Promise<Omit<User, "password">> {
    // Hash the password before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    
    // Create user with hashed password
    const [newUser] = await db
      .insert(users)
      .values({ ...user, password: hashedPassword })
      .returning();
    
    // Exclude password from the returned user object
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async validateUserCredentials(username: string, password: string): Promise<Omit<User, "password"> | null> {
    // Only allow this specific username and password
    if (username === 'gazalbookstore' && password === '1gazal_book_store1') {
      // Check if user exists
      let user = await this.getUserByUsername(username);
      
      // If user doesn't exist, create it
      if (!user) {
        try {
          const newUser = await this.createUser({
            username: 'gazalbookstore',
            password: '1gazal_book_store1', // Will be hashed in createUser
            fullName: 'Gazal Bookstore',
            role: 'admin'
          });
          return newUser;
        } catch (error) {
          console.error("Error creating gazalbookstore user:", error);
          return null;
        }
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    
    // Don't allow any other login attempts
    return null;
  }
  
  // Loyalty operations
  async getLoyaltySettings(): Promise<LoyaltySettings> {
    // Get existing settings or create default settings if none exist
    const existingSettings = await db.select().from(loyaltySettings);
    
    if (existingSettings.length > 0) {
      return existingSettings[0];
    } else {
      // Create default loyalty settings
      const [defaultSettings] = await db.insert(loyaltySettings)
        .values({
          pointsPerDinar: 0.1,
          redemptionRate: 0.5,
          minimumPointsToRedeem: 100,
          silverThreshold: 500,
          goldThreshold: 1000,
          platinumThreshold: 2000,
          silverMultiplier: 1.1,
          goldMultiplier: 1.2,
          platinumMultiplier: 1.3,
          expirationDays: 365,
          active: true
        })
        .returning();
      
      return defaultSettings;
    }
  }
  
  async updateLoyaltySettings(settings: Partial<InsertLoyaltySettings>): Promise<LoyaltySettings> {
    const currentSettings = await this.getLoyaltySettings();
    
    const [updatedSettings] = await db
      .update(loyaltySettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(loyaltySettings.id, currentSettings.id))
      .returning();
    
    return updatedSettings;
  }
  
  async getCustomerLoyaltyPoints(customerId: number): Promise<{ points: number; tier: string }> {
    const customer = await this.getCustomerById(customerId);
    
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    
    return {
      points: customer.loyaltyPoints || 0,
      tier: customer.loyaltyTier || 'regular'
    };
  }
  
  async addLoyaltyPoints(customerId: number, orderId: number, amount: number, orderAmount: number): Promise<number> {
    // Validate customer exists
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    
    // Get loyalty settings
    const settings = await this.getLoyaltySettings();
    if (!settings.active) {
      return 0; // Loyalty program is not active
    }
    
    // Get the order to exclude delivery price from loyalty calculation
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!orderResult.length) {
      return 0; // Order not found
    }
    
    const order = orderResult[0];
    
    // Calculate points based only on order amount EXCLUDING delivery price
    // We use the order's totalAmount, which is the subtotal before delivery price
    const pureOrderAmount = order.totalAmount || 0;
    
    // Calculate points - 1 point per 1 DZD as per requirements
    const pointsToAdd = Math.round(pureOrderAmount); // 1:1 ratio, so just use the amount directly
    
    // Create transaction record
    await db.insert(loyaltyTransactions).values({
      customerId,
      orderId,
      points: pointsToAdd,
      type: 'earned',
      description: `Points earned from order #${orderId}`
    });
    
    // Update customer's total points
    const newTotalPoints = (customer.loyaltyPoints || 0) + pointsToAdd;
    await db
      .update(customers)
      .set({ 
        loyaltyPoints: newTotalPoints,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
    
    // Check if customer's tier should be updated
    await this.recalculateLoyaltyTier(customerId);
    
    return pointsToAdd;
  }
  
  async redeemLoyaltyPoints(customerId: number, points: number, description: string = 'Points redeemed'): Promise<boolean> {
    // Validate customer exists
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    
    // Get loyalty settings
    const settings = await this.getLoyaltySettings();
    if (!settings.active) {
      throw new Error('Loyalty program is not active');
    }
    
    // Check if customer has enough points
    if (!customer.loyaltyPoints || customer.loyaltyPoints < points) {
      throw new Error(`Customer does not have enough points to redeem (${customer.loyaltyPoints || 0} available, ${points} requested)`);
    }
    
    // Check minimum points requirement
    if (points < settings.minimumPointsToRedeem) {
      throw new Error(`Minimum points to redeem is ${settings.minimumPointsToRedeem}`);
    }
    
    // Create transaction record (negative points for redemption)
    await db.insert(loyaltyTransactions).values({
      customerId,
      points: -points, // Negative value indicates redemption
      type: 'redeemed',
      description
    });
    
    // Update customer's total points
    const newTotalPoints = customer.loyaltyPoints - points;
    await db
      .update(customers)
      .set({ 
        loyaltyPoints: newTotalPoints,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
    
    // Check if customer's tier should be downgraded
    await this.recalculateLoyaltyTier(customerId);
    
    return true;
  }
  
  async getLoyaltyTransactions(customerId: number, limit: number = 50): Promise<LoyaltyTransaction[]> {
    // Validate customer exists
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    
    // Get transactions for the customer
    const transactions = await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, customerId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(limit);
      
    return transactions;
  }
  
  async recalculateLoyaltyTier(customerId: number): Promise<string> {
    // Validate customer exists
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    
    // Get loyalty settings
    const settings = await this.getLoyaltySettings();
    
    // Determine the tier based on current points according to new requirements:
    // - Silver tier: 1-20,000 points
    // - Gold tier: 20,000-50,000 points
    // - Platinum tier: Above 50,000 points
    let newTier = 'regular';
    const points = customer.loyaltyPoints || 0;
    
    if (points >= 50000) {
      newTier = 'platinum';
    } else if (points >= 20000) {
      newTier = 'gold';
    } else if (points >= 1) {
      newTier = 'silver';
    }
    
    // Update tier if it has changed
    if (newTier !== customer.loyaltyTier) {
      await db
        .update(customers)
        .set({ 
          loyaltyTier: newTier,
          updatedAt: new Date()
        })
        .where(eq(customers.id, customerId));
        
      // Create a transaction record for tier change
      await db.insert(loyaltyTransactions).values({
        customerId,
        points: 0,
        type: 'bonus',
        description: `Customer tier upgraded to ${newTier}`
      });
    }
    
    return newTier;
  }
}

export const storage = new DatabaseStorage();
