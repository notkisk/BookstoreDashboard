import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Use DATABASE_URL environment variable provided by Replit
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set!");
  process.exit(1);
}

// Simplified approach
console.log("Connecting to database using Replit's DATABASE_URL...");
const connectionString = process.env.DATABASE_URL;

// Connection options for better reliability
const client = postgres(connectionString, {
  max: 10, // Max number of connections
  idle_timeout: 20, // Max seconds a connection can be idle
  connect_timeout: 10, // Max seconds to connect
  prepare: false, // For better compatibility
});

export const db = drizzle(client);
