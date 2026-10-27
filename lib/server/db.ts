import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as { pool?: mysql.Pool };

// One pool per process, reused across hot reloads in development.
const pool = globalForDb.pool ?? mysql.createPool({ uri: process.env.DATABASE_URL ?? "mysql://setpoint:devpass@localhost:3306/setpoint", connectionLimit: 10, timezone: "Z" });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export type Db = typeof db;
