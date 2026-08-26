// One-shot job: rebuild the officials directory from source (the static
// MLA/Mayor list in lib/officialsSources.ts, see lib/officials.ts) and
// replace the officials_contacts / officials_meta tables in MySQL, so
// request-time code (pages/officials.tsx, pages/api/officials.ts) reads from
// the DB cache instead of rebuilding the (cheap, but non-zero) directory on
// every request. Run on a schedule (e.g. weekly cron/Task Scheduler) via
// `npm run refresh:officials`; a missed run just means slightly stale data,
// not failure — request-time code keeps serving whatever's already in the
// table. There's no live source to actually go stale here (the MLA list is a
// static, hand-verified file), so in practice this only matters after
// lib/officialsSources.ts itself is edited. Mirrors scripts/refresh-osm.ts.
//
// Run outside of Next.js, so no env file is loaded automatically — load them
// ourselves before importing anything that reads DB_* env vars. See
// refresh-osm.ts for why this order matters (a skipped env file shows up as
// ER_ACCESS_DENIED against the db container, not as a missing-env-var error).
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
  // Deferred until after loadEnvFile() so lib/db.ts picks up DB_* env vars.
  const officials = await import('../lib/officials')
  const pool = (await import('../lib/db')).default

  try {
    const directory = await officials.refreshOfficialsDirectory()
    // One line per source so a skim of refresh-officials.log shows not just
    // that the job ran, but the contact count and last-verified date for
    // each source (also recorded in officials_refresh_log for later
    // querying). There's only one source here (the static MLA/Mayor list),
    // so `live` is always true — see lib/officials.ts's buildOfficialsDirectory.
    for (const source of directory.coverage.sources) {
      console.log(
        `[refresh-officials] ${source.id}: ${source.contacts} contacts, ` +
          `live=${source.live}, updated=${source.updated ?? 'n/a'}`
      )
    }
    console.log(`[refresh-officials] ${directory.contacts.length} contacts total`)
  } catch (err) {
    console.error('[refresh-officials] refresh failed:', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
