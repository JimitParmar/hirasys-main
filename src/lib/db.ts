import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual params only for local dev
  ...(!process.env.DATABASE_URL && {
    host: "localhost",
    port: 5432,
    user: "hirasys",
    password: "hirasys123",
    database: "hirasys",
  }),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Required for Railway/Neon SSL
  ssl: process.env.DATABASE_URL?.includes("railway.app") || process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("connect", () => {
  console.log("Database connected");
});

pool.on("error", (err) => {
  console.error("Database error:", err);
});

export { pool as db };

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 100) {
    console.log("Slow query:", { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await query(text, params);
  return (res.rows[0] as T) || null;
}

export async function queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await query(text, params);
  return res.rows as T[];
}