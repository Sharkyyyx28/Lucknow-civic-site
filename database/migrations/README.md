# Migrations

`database/schema.sql` only auto-runs on a fresh volume, and only if it's a
local `mysql:8.0` container (via `docker-entrypoint-initdb.d`) — production
and the shared dev database don't get that treatment (see that file's
header), so most of the time you're running it yourself. Either way, a
database that already has data in it never picks up a change made there
again.

So every schema change goes in **three** places:

1. `database/schema.sql` — so a fresh volume comes up complete.
2. A numbered file here — so existing databases can be brought forward one
   change at a time, and so there's a historical record of what shipped when.
3. `migrate_all.sql` — append the same statements there too, so it stays a
   complete, single-file catch-up script. It's generated from the numbered
   files, not a separate thing to design.

## Applying

Files are applied in filename order. Each one is written to be idempotent, so
re-running an already-applied migration is a no-op — there is no tracking
table, and none is needed at this size. New tables use `CREATE TABLE IF NOT
EXISTS`. New columns on an existing table can't use the equivalent `ADD
COLUMN IF NOT EXISTS` shorthand — that's a MariaDB extension that real MySQL
8.0 rejects (confirmed against 8.0.46) — so they're guarded instead by
checking `INFORMATION_SCHEMA.COLUMNS` and issuing the `ALTER TABLE` via
`PREPARE`/`EXECUTE` only when the column is missing; see
`007_social_handle_checks.sql` for the pattern to copy.

**Easiest path — one file with everything:** `migrate_all.sql` runs every
migration below in order in a single command:

```sh
npm run db:migrate
```

This runs `scripts/migrate.ts database/migrations/migrate_all.sql` — it
connects with `mysql2` (the same driver the app itself uses) using the
`DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`/`DB_SSL` env vars
already loaded from `.env.local`/`.env`, so it works unmodified against any
target: a local test database, the shared dev database, or the production
database (see DEPLOYMENT.md). There's no `mysql` CLI dependency and nothing
to `docker exec` into.

**On a brand-new database** (nothing in it yet — no `users` table, nothing):
run `npm run db:bootstrap` first. `migrate_all.sql` alone won't create it,
because two tables (`users`, `user_locations`) predate the migrations folder
and only exist in `database/schema.sql` — see that file's header.

```sh
npm run db:bootstrap   # database/schema.sql — creates everything, including users/user_locations
npm run db:migrate     # database/migrations/migrate_all.sql — idempotent, safe to run right after
```

**Step-by-step path** — same result, run one file at a time:

```sh
npx tsx scripts/migrate.ts database/migrations/001_community_posts.sql
npx tsx scripts/migrate.ts database/migrations/002_osm_cache.sql
# ...and so on, in filename order
```

Check the result rather than trusting a silent exit:

```sh
npx tsx -e "
import('./lib/db').then(async ({ default: pool }) => {
  const [rows] = await pool.query('SHOW COLUMNS FROM community_posts');
  console.log(rows);
  process.exit(0);
});
"
```

If you're testing against a local `mysql:8.0` Docker container instead
(rather than a managed/shared database), you can also use the `mysql` CLI
directly via `docker exec` — same SQL files, just a different way to run
them.

## Applied so far

| File | What it does | Status |
| --- | --- | --- |
| `001_community_posts.sql` | Adds `community_posts` for the /community feature | Applied to the local `lmc-db-1` on 2026-07-28 |
| `002_osm_cache.sql` | Adds `osm_amenities`/`osm_postcode_points`/`osm_refresh_log`, which shipped in `schema.sql` (commit `dcbd347`) without a migration | Written 2026-07-28; run it against any existing volume that predates that commit |
| `003_officials_cache.sql` | Adds `officials_contacts`/`officials_meta`/`officials_refresh_log` — the MySQL cache behind `lib/officials.ts`, replacing per-request CSV parsing/OpenCity fetches | Written 2026-08-11; run `npm run refresh:officials` afterward to warm it |
| `004_road_register_cache.sql` | Adds `road_register` — a straight copy of `data/lmc-ward-road-details.csv`, replacing per-request CSV parsing in `road-lookup`/`division-stats`/`lucknow-road-data`/`main/[slug]`/`lib/officials.ts` | Written 2026-08-12; run `npm run import:road-register` afterward to warm it |
| `005_pincode_ward_mapping_cache.sql` | Adds `pincode_ward_mapping` — a straight copy of `data/banglore-pincode-to-ward-mapping.csv`, replacing per-request CSV parsing in `ward-lookup`/`corporation-stats`/`pincode-wardid-lookup`/`lib/wardPincodes.ts` | Written 2026-08-12; run `npm run import:pincode-ward-mapping` afterward to warm it |
| `006_social_handles.sql` | Adds `social_handles` (the `/social-handles` directory, moved off a hardcoded array) and `admins` (who can edit it via `/admin`) — see `lib/socialHandles.ts` / `lib/admin.ts` | Written 2026-08-15; run `npm run seed:social-handles` afterward to load the curated starting set |
| `007_social_handle_checks.sql` | Adds `x_status`/`instagram_status`/`website_status`/`checked_at` to `social_handles` — backs the "Check"/"Check all" existence-check buttons on `/admin/social-handles`, plus the weekly `refresh:social-handles` cron job — see `lib/socialHandleCheck.ts` / `scripts/refresh-social-handle-checks.ts` | Written 2026-08-18 |
| `migrate_all.sql` | Not a migration itself — 001 through 007 concatenated into one file | Regenerate (append) whenever a new numbered migration is added |

`004` and `005` are inherited, unused schema for this Lucknow build — the
routes/lib files they mention (`road-lookup`, `division-stats`,
`lucknow-road-data`, `ward-lookup`, `corporation-stats`,
`pincode-wardid-lookup`, `lib/wardPincodes.ts`) were all built on Bengaluru-only
CSV sources with no Lucknow equivalent, and have since been deleted; see
BUILD-NOTES.md. `road_register` and `pincode_ward_mapping` still get created
by `schema.sql`/these migrations (harmless, kept so the table shapes are
there for a future contributor who finds a real Lucknow data source), but
nothing in the current app reads or writes them.

After applying (either path above), two cache tables are empty until warmed:
`officials_contacts`/`officials_meta` and `osm_*`. Run `npm run seed:all` to
populate both in one command (`refresh:officials` then `refresh:osm` — see
`package.json`) — see the top-level README's "First production deploy"
section.
