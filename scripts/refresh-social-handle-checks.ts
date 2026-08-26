// One-shot job: re-probe every social handle's X/Instagram/website links for
// existence and persist the result, so /admin/social-handles's status
// badges reflect reality even for entries nobody has manually re-checked
// recently. Same probe logic behind the admin "Check"/"Check all" buttons
// (see lib/socialHandleCheck.ts) — this just runs it unattended on a
// schedule (weekly cron/Task Scheduler) via `npm run refresh:social-handles`.
// A missed run just means stale status badges, not failure — the admin page
// keeps showing whatever's already in the table. Mirrors
// scripts/refresh-officials.ts.
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

// Same budget the admin "Check all" API route uses (pages/api/social-handles/check-all.ts) —
// enough to get through the whole directory quickly without every request
// getting rate-limited into 'unknown'.
const CONCURRENCY = 4

async function main() {
  // Deferred until after loadEnvFile() so lib/db.ts picks up DB_* env vars.
  const { listSocialHandles, recordHandleCheck } = await import('../lib/socialHandles')
  const { checkSocialHandle, mapWithConcurrency } = await import('../lib/socialHandleCheck')
  const pool = (await import('../lib/db')).default

  try {
    const handles = await listSocialHandles()
    const counts = { ok: 0, not_found: 0, unknown: 0 }

    await mapWithConcurrency(handles, CONCURRENCY, async handle => {
      const result = await checkSocialHandle(handle)
      await recordHandleCheck(handle.id, result)
      for (const status of Object.values(result)) {
        if (status && status !== 'unchecked') counts[status]++
      }
    })

    console.log(
      `[refresh-social-handles] checked ${handles.length} handles — ` +
        `ok=${counts.ok} not_found=${counts.not_found} unknown=${counts.unknown}`
    )
    if (counts.not_found > 0) {
      console.log(`[refresh-social-handles] ${counts.not_found} link(s) came back 404 — worth a look in /admin/social-handles`)
    }
  } catch (err) {
    console.error('[refresh-social-handles] refresh failed:', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
