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
  deliveringStock: integer("delivering_stock").default(0).notNull(), // Books in delivering status
  soldStock: integer("sold_stock").default(0).notNull(), // Books sold successfully
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// More flexible schema for imports with default values and transformations
export const insertBookSchema = createInsertSchema(books)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Only title is required, others have reasonable defaults
    author: z.string().default(""),
    publisher: z.string().default(""),
    price: z.preprocess(
      (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
      z.number().min(0).default(0)
    ),
    buyPrice: z.preprocess(
      (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
      z.number().min(0).default(0)
    ),
    quantityBought: z.preprocess(
      (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
      z.number().min(0).default(0)
    ),
    quantityLeft: z.preprocess(
      (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
      z.number().min(0).default(0)
    ),
    deliveringStock: z.preprocess(
      (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
      z.number().min(0).default(0)
    ),
    soldStock: z.preprocess(
      (val) => (val === "" || val === null || val === undefined) ? 0 : Number(val),
      z.number().min(0).default(0)
    ),
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
  deliveryPrice: integer("delivery_price").default(0), // in DA
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

// Delivery prices table
export const deliveryPrices = pgTable("delivery_prices", {
  id: serial("id").primaryKey(),
  wilayaId: text("wilaya_id").notNull().unique(), // wilaya code (1-58)
  wilayaName: text("wilaya_name").notNull(),
  deskPrice: integer("desk_price").default(0).notNull(), // Price for stop desk delivery
  doorstepPrice: integer("doorstep_price").default(0).notNull(), // Price for home delivery
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDeliveryPriceSchema = createInsertSchema(deliveryPrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DeliveryPrice = typeof deliveryPrices.$inferSelect;
export type InsertDeliveryPrice = z.infer<typeof insertDeliveryPriceSchema>;
