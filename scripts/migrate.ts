// One-shot job: run a .sql file against the database configured by DB_* env
// vars (same variables lib/db.ts reads). Talks to MySQL via mysql2 — the
// same driver the app itself uses, respecting DB_SSL — instead of shelling
// out to the `mysql` CLI or `docker exec`ing into a local database
// container, because production has neither: it's a managed/cloud
// MySQL-compatible database (e.g. TiDB Cloud Serverless — see
// DEPLOYMENT.md), reachable only over the network, with no container of
// ours to exec into and no docker-entrypoint-initdb.d to auto-run
// database/schema.sql on first boot the way a local `mysql:8.0` container
// gets. This script is that missing bootstrap step, and doubles as the
// migration runner everywhere else too (dev, the shared master-sql box, CI)
// since it only needs network access + credentials, not a particular
// deployment shape.
//
// Usage:
//   npm run db:bootstrap                    -- runs database/schema.sql (fresh database only)
//   npm run db:migrate                      -- runs database/migrations/migrate_all.sql (safe to re-run any time)
//   npx tsx scripts/migrate.ts path/to.sql  -- runs any specific file
//
// Run outside of Next.js, so no env file is loaded automatically — load them
// ourselves before reading DB_* env vars. Mirrors Next's own precedence
// (.env.local first, then .env — see README's "Env files" section): a value
// already set by an earlier source is never overwritten.
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

function loadEnvFile(filename: string): void {
  const envPath = path.join(process.cwd(), filename)
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    const key = match[1]
    if (process.env[key] !== undefined) continue
    process.env[key] = (match[2] ?? '').trim().replace(/^["']|["']$/g, '')
  }
}
loadEnvFile('.env.local')
loadEnvFile('.env')

async function main() {
  const target = process.argv[2] ?? 'database/migrations/migrate_all.sql'
  const filePath = path.resolve(process.cwd(), target)
  if (!fs.existsSync(filePath)) {
    console.error(`No such file: ${filePath}`)
    process.exit(1)
  }
  const sql = fs.readFileSync(filePath, 'utf8')
  const dbName = process.env.DB_NAME || 'lmc'
  const host = process.env.DB_HOST || 'localhost'

  // No `database` in the connection config on purpose: database/schema.sql
  // creates the database itself (`CREATE DATABASE IF NOT EXISTS ... USE
  // ...`), so the very first bootstrap run against a brand-new managed
  // cluster has to connect *before* that database exists — passing
  // `database` here would make mysql2 refuse the connection outright.
  // Migration files have no USE of their own (deliberately — see their
  // header comments), so `USE` the target database explicitly below
  // instead of hardcoding it into every file.
  const connection = await mysql.createConnection({
    host,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    connectTimeout: 60000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })

  try {
    // Fails silently on a database that doesn't exist yet — fine as long as
    // the file about to run creates it itself (schema.sql does; migration
    // files don't, and will correctly fail below if run against a database
    // that was never bootstrapped).
    await connection.query(`USE \`${dbName}\`;`).catch(() => {})

    console.log(`Running ${path.relative(process.cwd(), filePath)} against ${dbName}@${host}...`)
    await connection.query(sql)
    console.log('Done.')
  } finally {
    await connection.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
