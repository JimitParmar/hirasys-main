import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "hirasys",
  password: "hirasys123",
  database: "hirasys",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("Database connected");
});

pool.on("error", (err) => {
  console.error("Database error:", err);
});

export { pool as db };

// Helper for single queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 100) {
    console.log("Slow query:", { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

// Helper for getting single row
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await query(text, params);
  return (res.rows[0] as T) || null;
}

// Helper for getting multiple rows
export async function queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await query(text, params);
  return res.rows as T[];
}