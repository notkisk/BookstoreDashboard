import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const runMigrations = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const connection = postgres(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "migrations" });
  console.log("Migrations completed!");

  await connection.end();
};

runMigrations().catch(console.error);
