CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"publisher" text NOT NULL,
	"price" integer NOT NULL,
	"buy_price" integer NOT NULL,
	"quantity_bought" integer NOT NULL,
	"quantity_left" integer NOT NULL,
	"delivering_stock" integer DEFAULT 0 NOT NULL,
	"sold_stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"phone2" text,
	"address" text NOT NULL,
	"wilaya" text NOT NULL,
	"commune" text NOT NULL,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"loyalty_tier" text DEFAULT 'regular' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "delivery_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"wilaya_id" text NOT NULL,
	"wilaya_name" text NOT NULL,
	"desk_price" integer DEFAULT 0 NOT NULL,
	"doorstep_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_prices_wilaya_id_unique" UNIQUE("wilaya_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"points_per_dinar" double precision DEFAULT 1 NOT NULL,
	"redemption_rate" double precision DEFAULT 0.5 NOT NULL,
	"minimum_points_to_redeem" integer DEFAULT 100 NOT NULL,
	"silver_threshold" integer DEFAULT 1 NOT NULL,
	"gold_threshold" integer DEFAULT 20000 NOT NULL,
	"platinum_threshold" integer DEFAULT 50000 NOT NULL,
	"silver_multiplier" double precision DEFAULT 1 NOT NULL,
	"gold_multiplier" double precision DEFAULT 1 NOT NULL,
	"platinum_multiplier" double precision DEFAULT 1 NOT NULL,
	"expiration_days" integer DEFAULT 365 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"order_id" integer,
	"points" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"book_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"customer_id" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"discount_amount" integer DEFAULT 0,
	"discount_percentage" double precision DEFAULT 0,
	"final_amount" integer DEFAULT 0 NOT NULL,
	"delivery_type" text NOT NULL,
	"delivery_price" integer DEFAULT 0,
	"fragile" boolean DEFAULT false,
	"echange" boolean DEFAULT false,
	"pickup" boolean DEFAULT false,
	"recouvrement" boolean DEFAULT false,
	"stop_desk" boolean DEFAULT true,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;