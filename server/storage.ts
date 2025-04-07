import { 
  books, type Book, type InsertBook,
  customers, type Customer, type InsertCustomer,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, sql as sqlBuilder, count } from "drizzle-orm";
import { nanoid } from "nanoid";

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
  
  // Order operations
  getOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<{ order: Order; items: (OrderItem & { book: Book })[] } | undefined>;
  createOrder(order: InsertOrder, items: Omit<InsertOrderItem, "orderId">[]): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  
  // Analytics
  getOrdersCount(period?: 'day' | 'week' | 'month'): Promise<number>;
  getTotalSales(period?: 'day' | 'week' | 'month'): Promise<number>;
  getProfit(period?: 'day' | 'week' | 'month'): Promise<number>;
  getBestSellingBooks(limit?: number): Promise<{ book: Book; soldCount: number }[]>;
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
      const result = await db
        .delete(books)
        .where(sqlBuilder`${books.id} IN (${ids.join(',')})`)
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

  // Order operations
  async getOrders(): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
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
    
    // Create the order
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, reference })
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
    }
    
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
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
    
    const query = db.select({ count: count() }).from(orders);
    
    // Add date filter if period is specified
    if (fromDate) {
      query.where(
        and(
          sqlBuilder`${orders.createdAt} >= ${fromDate}`,
          sqlBuilder`${orders.createdAt} <= ${now}`
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
    
    const query = db
      .select({ total: sqlBuilder`sum(${orders.totalAmount})` })
      .from(orders);
    
    // Add date filter if period is specified
    if (fromDate) {
      query.where(
        and(
          sqlBuilder`${orders.createdAt} >= ${fromDate}`,
          sqlBuilder`${orders.createdAt} <= ${now}`
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
    
    // Build the order IDs query
    const orderIdsQuery = db.select({ id: orders.id }).from(orders);
    
    // Add date filter if period is specified
    if (fromDate) {
      orderIdsQuery.where(
        and(
          sqlBuilder`${orders.createdAt} >= ${fromDate}`,
          sqlBuilder`${orders.createdAt} <= ${now}`
        )
      );
    }
    
    const orderIds = await orderIdsQuery;
    
    if (orderIds.length === 0) return 0;
    
    const orderIdList = orderIds.map(o => o.id);
    
    // Calculate total sales for delivered orders using direct IN query
    const salesResult = await db
      .select({ total: sqlBuilder`sum(${orders.totalAmount})` })
      .from(orders)
      .where(
        and(
          sqlBuilder`${orders.id} IN (${orderIdList.map(id => id).join(',')})`,
          eq(orders.status, 'delivered')
        )
      );
    
    const salesTotal = Number(salesResult[0]?.total) || 0;
    
    // Calculate total cost (buy price) using direct IN query
    const costResult = await db
      .select({ 
        total: sqlBuilder`sum(${orderItems.quantity} * ${books.buyPrice})` 
      })
      .from(orderItems)
      .innerJoin(books, eq(orderItems.bookId, books.id))
      .where(sqlBuilder`${orderItems.orderId} IN (${orderIdList.map(id => id).join(',')})`);
    
    const costTotal = Number(costResult[0]?.total) || 0;
    
    return salesTotal - costTotal;
  }

  async getBestSellingBooks(limit: number = 5): Promise<{ book: Book; soldCount: number }[]> {
    const result = await db
      .select({
        bookId: orderItems.bookId,
        soldCount: sqlBuilder`sum(${orderItems.quantity})`
      })
      .from(orderItems)
      .groupBy(orderItems.bookId)
      .orderBy(desc(sqlBuilder`sum(${orderItems.quantity})`))
      .limit(limit);
    
    if (result.length === 0) return [];
    
    const bookIds = result.map(r => r.bookId);
    
    // Use direct IN query with literal values
    const booksResult = await db
      .select()
      .from(books)
      .where(sqlBuilder`${books.id} IN (${bookIds.map(id => id).join(',')})`);
    
    const booksMap = new Map<number, Book>();
    booksResult.forEach(book => booksMap.set(book.id, book));
    
    return result
      .map(r => ({
        book: booksMap.get(r.bookId)!,
        soldCount: Number(r.soldCount)
      }))
      .filter(item => item.book !== undefined);
  }
}

export const storage = new DatabaseStorage();
