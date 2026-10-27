// Applies db/migrations in order. Safe to run on every deploy.
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL ?? "mysql://setpoint:devpass@localhost:3306/setpoint";
const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
await migrate(drizzle(conn), { migrationsFolder: "./db/migrations" });
console.log("migrations applied");
await conn.end();
