Lucknow civic details as a part of Understanding India


## Template
https://vercel.com/templates/next.js/blog-starter-kit
Demo - https://next-blog-starter.vercel.app/

## Approach
1. https://www.perplexity.ai/search/use-nextjs-to-ipXTHARsTSycxxHiTEGMSA?s=m#8a95d31c-046c-4d2c-9cc7-11e24c418c48
2. https://chat.openai.com/share/e6ab6708-10e4-481f-ad9a-834c411259fb

## How to use

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:


# Local Dev
1. nvm use node
2. npm run dev

# Notes

`blog-starter` uses [Tailwind CSS](https://tailwindcss.com) [(v3.0)](https://tailwindcss.com/blog/tailwindcss-v3).

# Some paths to checkout
https://lucknow-dev.learningpaths.io/officials
https://lucknow-dev.learningpaths.io/map

# Production Deployment
Production runs on Vercel or Render plus a free managed MySQL-compatible
database (TiDB Cloud Serverless) — see
**[`DEPLOYMENT.md`](./DEPLOYMENT.md)** for the full step-by-step guide.
Every push to `main` redeploys automatically via Vercel/Render's own git
integration; there's no CI file to maintain for this.

There's no `Dockerfile`, `docker-compose.prod.yml`, or `.gitlab-ci.yml`
anymore — those belonged to a previous GitLab CI → DigitalOcean droplet
deployment and were removed once production moved to Vercel/Render's own
git-based builds (Render runs this as a plain Node web service, no
container of our own involved).

`docker-compose.yaml` (no `.prod`) is a separate thing — the **dev/staging
box** some contributors use locally or on a shared host. Bind-mounts the
checkout, runs `npm run dev` in a plain `node` image, and talks to
`master-sql` (a MySQL container shared across other projects on that host)
over the external `shared-net` network. It does not run its own database,
and it has nothing to do with how production is deployed.

Everything from here down through "Running the compose box as root" is about
that dev/staging box (`docker-compose.yaml`) unless noted otherwise.

npm is the package manager here — `package-lock.json` is the lockfile, and
there is no `yarn.lock` (tracking both meant whichever tool you ran rewrote one
and left the other stale, which repeatedly collided with `git pull`). Run `npm
ci`, not `npm install`: `ci` installs exactly the lockfile and never rewrites
it, so the tree stays clean for the next pull. `yarn.lock` is gitignored, so
running yarn by accident leaves an untracked file rather than a blocked pull.

If a pull ever aborts with "local changes would be overwritten", the tree has
picked up churn that no one meant to keep. Throw it away and pull again:

git checkout -- yarn.lock package-lock.json
git pull origin dev

Install dependencies on the host first — the `node` service bind-mounts the
checkout and no longer installs anything itself:

npm ci
docker-compose down
docker-compose up -d --build

Real production is Vercel/Render, not this compose file — see
**[`DEPLOYMENT.md`](./DEPLOYMENT.md)**. None of the ownership notes below
(which are about this bind-mounted dev box) apply there.

## Running the compose box as root
The `node` service runs as `user: "node"` — uid 1000 — while `git pull` and
`npm ci` on the host are typically run as root. That combination is fine, and
you do not need to stop deploying as root: the container only *reads* the
mounted tree, and root writes files world-readable. Nothing in the app writes
to disk at runtime; it all goes to MySQL.

The single exception is `.next`, which the dev server writes. It has to stay
owned by uid 1000:

sudo chown -R 1000:1000 .next

`.next` is gitignored, so a root `git pull`/`npm ci` never touches it and the
ownership survives. What does break it is running `npm run dev` or
`next build` on the **host** as root — that recreates `.next` root-owned, and
the container then fails to start. Re-run the chown above if that happens.

(The container used to run `npm install --force` against the mounted tree,
which is what made root-owned files fatal — it needed to write
package-lock.json. That install is gone; the host provides `node_modules`.)

## Env files
Two different things read env files here, which is worth keeping straight:

- **Compose** (for the dev/staging box only) substitutes `${IMAGE_NAME}` and
  passes every other variable straight through via `env_file:`. It
  auto-loads a file named `.env` from the same directory as the compose file
  and nothing else, so if you keep values in `.env.local` instead you must
  pass `--env-file .env.local` explicitly.
- **Next.js** loads `.env.local` first, then `.env`, on its own. This is where
  GOOGLE_CLIENT_ID/SECRET, NEXTAUTH_SECRET and NEXTAUTH_URL are picked up.
- **Vercel/Render** don't read either file — env vars are set through each
  platform's own dashboard instead. See `DEPLOYMENT.md`.

Simplest locally is to keep one file, `.env`, so both of the first two agree;
`.env.local.example` lists every variable, including the production DB_*
shape (managed database, DB_SSL=true). Whichever you choose, Next prints what
it actually loaded at startup ("Environments: .env") — check that line when a
value seems to be ignored. Both names are gitignored.

## Database changes
Production and the shared dev database are both external — nothing here
auto-runs `database/schema.sql` on them the way a local `mysql:8.0`
container's `docker-entrypoint-initdb.d` would (see that file's header). So
schema changes go in `database/migrations/` and get applied explicitly:

```sh
npm run db:migrate
```

On a genuinely fresh database (nothing in it — see
`database/migrations/README.md` for why `users`/`user_locations` need this
too), bootstrap it first:

```sh
npm run db:bootstrap
npm run db:migrate
```

Both commands run `scripts/migrate.ts` against whatever `DB_HOST`/`DB_PORT`/
`DB_USER`/`DB_PASSWORD`/`DB_NAME`/`DB_SSL` are loaded from `.env.local`/`.env`
— the same `mysql2` driver the app itself uses, so this works unmodified
against a local test database, the shared dev database, or production.

See `database/migrations/README.md` for the file-by-file equivalent and the
rule for keeping `migrate_all.sql` in sync when a new migration is added.

## First production deploy
One-time setup before Vercel/Render's automatic deploys take over: free
database, environment variables, OAuth redirect URI, and the GitHub Actions
workflow that replaces the old cron-based data refresh. Full step-by-step
runbook: **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.