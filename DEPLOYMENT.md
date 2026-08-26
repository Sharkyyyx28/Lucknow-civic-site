# Production Deployment

One-time runbook for standing this app up in production on Vercel or Render,
backed by a free managed MySQL-compatible database. After the one-time setup
in each section below, every push to `main` redeploys automatically — you
won't need this document again unless the app is moved to a new host or the
database is rebuilt from scratch.

This replaces the previous GitLab CI → DigitalOcean droplet pipeline
entirely. If you're looking for that runbook, it's gone — along with
`Dockerfile`, `docker-compose.prod.yml`, and `.gitlab-ci.yml`, which it
depended on. This is a different hosting shape (managed platforms with their
own native builders, no container of our own to build or run), not a
variation on the old one.

## 0. What you're deploying

- **App**: a stateless Next.js 14 app (pages router). Nothing writes to local
  disk at runtime — all persistent state lives in MySQL — so it fits a
  serverless/managed host without a persistent volume.
- **Two pages prerender against the database**: `pages/officials.tsx` and
  `pages/social-handles.tsx` use `getStaticProps` with ISR (`revalidate: 86400`
  and `60` seconds respectively). This means the database has to be reachable
  **both at build time and at request time** — from Vercel's build machines
  and serverless functions, or from Render's build and runtime. Neither has
  a fixed, allowlist-able IP, which is why the database step
  below matters: pick a provider that authenticates by credentials over TLS,
  not by IP allowlist.
- **API routes** (`pages/api/**`) query the database per-request.
- **Scheduled data refresh**: `refresh:officials`, `refresh:osm`, and
  `refresh:social-handles` are standalone scripts (`scripts/*.ts`) that only
  need network access and `DB_*` credentials — no server of their own. The
  old setup ran them from a weekly crontab on the droplet
  (`install-refresh-cron.sh`, `docker exec`ing into `lmc-node-1`). Neither
  Vercel nor Render gives you cron/shell access on the free tier, and these
  scripts don't need one — see step 4, which runs them from GitHub Actions
  instead.

## 1. Set up a free MySQL-compatible database

**Recommended: [TiDB Cloud Serverless](https://tidbcloud.com/).** It speaks
the MySQL wire protocol (works unmodified with this app's `mysql2` driver and
`database/schema.sql`), has a free-forever Serverless tier (no credit card,
5 GiB storage, 50M Request Units/month — comfortably more than this app's
tables need), and — critically — accepts connections from any source over
TLS with just a username/password, so it works from Vercel's build machines
and serverless functions without an IP-allowlist step.

Other free options, with caveats:
- **Aiven for MySQL** — free tier is a time-limited trial now, not indefinite.
  Fine to test with, not to depend on long-term.
- **Clever Cloud "Dev" plan** — free forever, but capped at ~5 MB storage.
  Likely too small once `osm_amenities`/`community_posts` grow.
- **PlanetScale** — no longer has a free tier (discontinued 2024).

Steps, using TiDB Cloud Serverless:

1. Sign up at [tidbcloud.com](https://tidbcloud.com/) and create a
   **Serverless** cluster (pick a region close to your app host — e.g. an
   AWS `us-east-1` region if you'll deploy to Vercel's default region).
2. Once it's up, click **Connect**, choose the general/`mysql2` connection
   option, and generate a password. Note down: host (looks like
   `gateway01.<region>.prod.aws.tidbcloud.com`), port (`4000`), and user
   (looks like `<prefix>.root`).
3. Create the app's database — either run `CREATE DATABASE lmc;` in TiDB's
   built-in SQL editor, or skip this: `npm run db:bootstrap` (next step)
   issues `CREATE DATABASE IF NOT EXISTS lmc` itself, and the default user
   has privileges to do that.
4. Connections require TLS — this app already handles that
   (`DB_SSL=true` → `lib/db.ts` connects with `ssl: { rejectUnauthorized: false }`),
   so no CA bundle or code change is needed.

Then, from your own machine (anywhere with network access — this does not
need to run on the production host):

```sh
cp .env.local.example .env.local
# Fill in DB_HOST / DB_PORT / DB_USER / DB_PASSWORD from TiDB's Connect panel.
# DB_NAME=lmc
# DB_SSL=true

npm run db:bootstrap   # creates the database + all tables
npm run db:migrate     # no-op right after bootstrap; keeps the two in sync going forward
npm run seed:all       # populates officials_contacts/officials_meta and osm_amenities/osm_postcode_points
```

Verify:

```sh
npx tsx -e "
import('./lib/db').then(async ({ default: pool }) => {
  const [rows] = await pool.query('SHOW TABLES');
  console.log(rows);
  process.exit(0);
});
"
```

You should see all 11 tables from `database/schema.sql`. `seed:all` can take
a minute or two (it calls the Overpass API for OSM data) — see
`seed-all.log`-equivalent output in your terminal.

## 2. Push the repo to GitHub

Both Vercel and Render deploy by connecting to a git repo (not the old
SSH + container-registry flow). If this repo isn't on GitHub yet:

```sh
git remote add origin <your-new-github-repo-url>
git push -u origin main
```

## 3. Deploy on Vercel (recommended)

1. [vercel.com](https://vercel.com/) → **New Project** → import the GitHub
   repo. Framework preset auto-detects as Next.js — no changes needed to
   `next.config.js` or build commands.
2. **Project Settings → Environment Variables** — add these for the
   Production environment (see `.env.local.example` for what each does):
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` — Vercel assigns `https://<project>.vercel.app` on first
     deploy; deploy once, note the domain (or your custom domain if you're
     attaching one), then set this and redeploy.
   - `ADMIN_EMAILS`
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=lmc`, `DB_SSL=true`
     — from step 1.
3. In Google Cloud Console → APIs & Services → Credentials, update the OAuth
   client's **Authorized redirect URI** to
   `https://<your-domain>/api/auth/callback/google`.
4. Deploy. Because `pages/officials.tsx` and `pages/social-handles.tsx`
   prerender against the database at build time, the build will fail the
   same way it does in a database-less local environment (see
   `BUILD-NOTES.md`'s open item 4) if step 1 hasn't been run yet against this
   same database — bootstrap and seed first.
5. From here on, every push to `main` redeploys automatically, and every
   pull request gets its own preview deployment — this is what replaces
   `.gitlab-ci.yml`. Nothing else to configure.

## 4. Deploy on Render (alternative)

No Docker involved — Render builds and runs this as a plain Node web service.

1. [render.com](https://render.com/) → **New → Web Service** → connect the
   GitHub repo.
2. Runtime: **Node**. Build command: `npm ci && npm run build`. Start
   command: `npm run start`.
3. Instance type: **Free** — note this spins the service down after 15
   minutes idle, and a request after that takes ~30–60s to wake it back up.
   Fine for a demo; upgrade to a paid instance if that cold start matters.
4. **Environment** tab — same variable list as the Vercel section above.
5. `NEXTAUTH_URL` — Render assigns `https://<service-name>.onrender.com`;
   same first-deploy-then-set approach as Vercel. If you're running Render as
   your real production host, point the Google OAuth redirect URI at its
   domain instead of (or in addition to, if you genuinely run both) Vercel's.
6. Every push to `main` auto-redeploys once connected — Render's own git
   integration, no CI file needed.

You don't need both Vercel and Render — pick one as your actual production
host. Vercel is the better fit for this app (zero-config Next.js support,
ISR works natively, ephemeral builds handle the database dependency
cleanly); Render is a reasonable alternative if you'd rather run this as a
conventional always-on-when-warm Node server instead of Vercel's serverless
model.

## 5. Replace the crontab refresh jobs with GitHub Actions

The old weekly crontab (`install-refresh-cron.sh`, running
`refresh-osm-cron.sh` / `refresh-officials-cron.sh` /
`refresh-social-handles-cron.sh` via `docker exec lmc-node-1`) assumed a
server you control. Vercel and Render's free tiers give you neither shell nor
cron access, and don't need to — the refresh scripts already only need
network access and `DB_*` credentials, so a scheduled GitHub Actions workflow
runs them just as well, independent of wherever the app itself is hosted.

Add these as **repository secrets** (Settings → Secrets and variables →
Actions) on the GitHub repo: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, `DB_SSL`.

`.github/workflows/refresh-data.yml` (already added by this cleanup) runs
`refresh:officials`, `refresh:osm`, and `refresh:social-handles` weekly. It
collapses the old three-separate-cron-times layout into one scheduled run
since these are independent, lightweight jobs on an ephemeral GitHub-hosted
runner, not competing for resources on a shared box the way the droplet's
cron jobs were. You can also trigger it manually from the Actions tab
(`workflow_dispatch`) instead of waiting for the following Sunday.

## 6. Verify the deploy

- Site loads at your Vercel/Render domain.
- Sign-in with Google works (confirms `NEXTAUTH_*`/`GOOGLE_CLIENT_*` are correct).
- `/officials` and `/social-handles` show real data (confirms step 1's seed
  worked, not just a request-time fallback).
- The database provider's dashboard (TiDB Cloud's cluster overview, etc.)
  shows active connections/query traffic.
- The GitHub Actions workflow's first manual run (Actions tab → "Refresh
  data" → **Run workflow**) succeeds.

## Troubleshooting

- **Build fails while prerendering `/officials` or `/social-handles`** — the
  database is unreachable at build time, or hasn't been bootstrapped/seeded
  yet. Confirm the `DB_*` values in Vercel/Render's environment settings are
  correct, and that step 1 was run against this exact database.
- **`redirect_uri_mismatch` on Google sign-in** — the Google Cloud Console
  redirect URI doesn't exactly match `<NEXTAUTH_URL>/api/auth/callback/google`
  (scheme, host, and trailing slash all have to match exactly).
- **`ER_ACCESS_DENIED` or an SSL-related connection error** — `DB_SSL=true`
  isn't actually set (check for a leftover `.env.local.example` default), or
  the password doesn't match what the database provider's dashboard shows
  right now — regenerate it there if unsure.
- **Render free tier feels slow on the first request after a while** —
  expected; the instance spun down after 15 minutes idle and is cold-starting.
  Not a bug — see step 4.
- **A migration or seed script can't reach the database** — `db:bootstrap`/
  `db:migrate`/`seed:all` (step 1) just need network access to the database
  from wherever you run them (your machine, a GitHub Actions runner) — they
  don't need to run on the production host itself.
