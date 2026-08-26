import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lmc',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 60000,
  timezone: '+00:00',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
}

// Next.js dev/HMR re-evaluates this module on every recompile, and each
// re-evaluation used to call createPool() again — leaking a fresh 5-connection
// pool's worth of idle connections on master-sql (a container shared across
// projects) every time a file changed. Caching the pool on globalThis makes
// HMR reuse the same pool instead of creating a new one.
const globalForPool = globalThis as unknown as { mysqlPool?: mysql.Pool }

const pool = globalForPool.mysqlPool ?? mysql.createPool(dbConfig)

if (process.env.NODE_ENV !== 'production') {
  globalForPool.mysqlPool = pool
}

export default pool
