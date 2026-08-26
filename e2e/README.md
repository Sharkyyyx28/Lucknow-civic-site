# e2e tests

Playwright specs that run against a real `npm run dev` server (started
automatically by `playwright.config.ts` if one isn't already running on
`PORT`/3000).

Only pages whose data comes from static files or client-side fetches are
covered here — see each spec's header comment for why. Most of the site's
other pages (`/officials`, `/social-handles`, `/profile`, `/lucknow-road-data`,
`/pincode-wardid-lookup`, ...) call the database in `getStaticProps` /
`getServerSideProps`, so exercising them needs a dev server pointed at a real,
seeded MySQL instance (see `.env.local.example` and `database/schema.sql`).
Once that's available, add specs for them the same way — `page.route()` to
mock a specific `/api/*` client fetch, or a real run against seeded data for
the SSG/SSR path itself.
