import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Book inventory table
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  publisher: text("publisher").notNull(),
  price: integer("price").notNull(), // in DA (Algerian Dinar)
  buyPrice: integer("buy_price").notNull(), // cost price
  quantityBought: integer("quantity_bought").notNull(),
  quantityLeft: integer("quantity_left").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Customer table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  phone2: text("phone2"),
  address: text("address").notNull(),
  wilaya: text("wilaya").notNull(), // numbered 01-58
  commune: text("commune").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Order table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(), // Order reference number
  customerId: integer("customer_id").notNull().references(() => customers.id),
  totalAmount: integer("total_amount").notNull(), // in DA
  deliveryType: text("delivery_type").notNull(),
  fragile: boolean("fragile").default(false),
  echange: boolean("echange").default(false),
  pickup: boolean("pickup").default(false),
  recouvrement: boolean("recouvrement").default(false),
  stopDesk: boolean("stop_desk").default(true), // mandatory field
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  reference: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

// Order items - junction table for books in orders
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  bookId: integer("book_id").notNull().references(() => books.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(), // Price at the time of order
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
