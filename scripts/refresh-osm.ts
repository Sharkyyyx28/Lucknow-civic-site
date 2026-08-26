// One-shot job: pull the latest OSM amenities + postcode points via Overpass
// and replace the osm_amenities / osm_postcode_points tables in MySQL, so
// request-time code (lib/amenities.ts, lib/postcodes.ts) never has to wait on
// the public Overpass API. Run on a schedule (e.g. weekly cron/Task
// Scheduler) via `npm run refresh:osm`; amenities and postcodes change slowly,
// so a missed run just means slightly stale data, not failure — request-time
// code keeps serving whatever's already in the table.
//
// Run outside of Next.js, so no env file is loaded automatically — load them
// ourselves before importing anything that reads DB_* env vars. Mirrors
// Next's own precedence (.env.local first, then .env, README's "Env files"
// section): a value already set by an earlier source is never overwritten,
// so .env.local can override .env and either can be the only file present.
// Getting this wrong is silent — mysql2 falls back to an empty password
// rather than failing to start, so a skipped file shows up as ER_ACCESS_DENIED
// against the db container, not as a missing-env-var error here.
import fs from 'fs'
import path from 'path'

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
  // Deferred until after loadEnvLocal() so lib/db.ts picks up DB_* env vars.
  const { refreshAmenitiesFromOverpass } = await import('../lib/amenities')
  const { refreshPostcodesFromOverpass } = await import('../lib/postcodes')
  const pool = (await import('../lib/db')).default

  const [amenities, postcodes] = await Promise.allSettled([
    refreshAmenitiesFromOverpass(),
    refreshPostcodesFromOverpass(),
  ])

  if (amenities.status === 'fulfilled') {
    console.log(`[refresh-osm] amenities: ${amenities.value} rows`)
  } else {
    console.error('[refresh-osm] amenities refresh failed:', amenities.reason)
  }

  if (postcodes.status === 'fulfilled') {
    console.log(`[refresh-osm] postcodes: ${postcodes.value} rows`)
  } else {
    console.error('[refresh-osm] postcodes refresh failed:', postcodes.reason)
  }

  await pool.end()
  if (amenities.status === 'rejected' && postcodes.status === 'rejected') {
    process.exitCode = 1
  }
}

main()
