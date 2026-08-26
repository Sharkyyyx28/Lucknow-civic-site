# BUILD-NOTES — the Lucknow fork of the Bengaluru civic site

This project is a fork of a Bengaluru/BBMP civic-information site, adapted for
Lucknow. It was built by copying the original codebase, then going through it
feature by feature: keeping what's genuinely portable, replacing Bengaluru
data with verified Lucknow data where that data could be found, and cutting
(rather than faking) anything that depends on a Bengaluru-only data source
with no Lucknow equivalent.

**Guiding rule applied throughout:** never invent a civic fact. Where real,
sourced data existed, it's here. Where it didn't, the feature is either
disabled with an honest label, or built as a clearly-marked empty
placeholder — never filled with fabricated names, numbers, or geometry.

## What's real

- **Officials directory** (`/officials`) — Lucknow's 9 MLAs (state assembly),
  its Lok Sabha MP, the Mayor, and all 110 LMC ward corporators. MLA/MP/Mayor
  names and parties hand-verified against Wikipedia constituency pages and
  2022 UP Assembly / 2024 Lok Sabha election results; the corporator list was
  parsed programmatically (not hand-typed, to avoid transcription slips across
  110 rows) from Wikipedia's results table for the 2023 LMC election — its
  party tally cross-checked against Wikipedia's own summary row (BJP 80,
  SP 21, INC 4, IND 4, BSP 1) as a sanity check. See `lib/officialsSources.ts`.
  The corporators' ward names are the 2023 delimitation, which does not line
  up with the 2018 ward polygons the map draws (see "Ward boundaries" below) —
  two different real delimitations, not an error. No phone numbers or emails
  are published for anyone in this directory — there was no verified source
  for either.
- **City boundary** — the Lucknow Municipal Corporation outer boundary
  (`public/geojson/gba-boundary.geojson`, `public/lucknow-boundary.json`) is
  real, sourced from DataMeet's public `Municipal_Spatial_Data` GitHub
  repository and converted from its shapefile. This is what the map's "City
  boundary" layer and the homepage mini-map draw.
- **City centre & bounds** (`lib/mapLayers.ts`) — computed from that same
  boundary file's bounding box (roughly 80.83–81.06°E, 26.74–26.93°N).
- **Ward boundaries** (`/map`'s "Wards (2018)" layer,
  `public/geojson/lucknow-wards.geojson`) — 112 real ward polygons, also from
  DataMeet's `Municipal_Spatial_Data` repo (`Lucknow/Lucknow_ward_boundary.geojson`,
  CC BY 4.0). Its last upstream commit is from 2018, so it reflects the
  **pre-2023 delimitation** — LMC's current scheme has 110 wards, some renamed,
  merged, or newly created since. No open GIS source for the current scheme
  was found (checked: OpenCity's CKAN portal — no Lucknow dataset; OpenStreetMap
  — zero ward-level `admin_level=9/10` relations for Lucknow; a few mirrors of
  this same DataMeet file under other names, no independent newer source). The
  layer is labeled with its vintage in the UI rather than passed off as current.
- **Metro / rail** (`/metro-network`, `/metro-line-count-down`) — the Red
  Line (operational since 2019, 21 stations) and Blue Line (under
  construction, 12 stations, East-West Corridor). Station names and order are
  verified against Wikipedia and yometro.com. Station **coordinates are not
  surveyed** — they're hand-placed along each corridor's known real-world
  alignment, unlike the Bengaluru original, which had real OSM route-relation
  coordinates for its operational lines. Every line is marked
  `indicative: true` for this reason.

## What was cut, and why

Lucknow has no equivalent of several Bengaluru-specific data sources this
site depended on:

- **OpenCity's CKAN portal** (`data.opencity.in`) — Bengaluru/Karnataka only.
  No Lucknow dataset exists there. This killed the live ward-boundary fetch,
  the live MLA CSV, and the forest-wing contacts feed.
- **The BBMP road register** — an 8MB CSV naming an engineer, waste
  contractor, utility contact, etc. against every road in (part of)
  Bengaluru. No Lucknow equivalent has been found. This removed: the road
  data browser (`/lucknow-road-data` in the original), the road-register-backed
  roles in the officials directory (engineer, BWSSB, BESCOM, control room,
  fire, health, animal husbandry — everything except MLA), and the
  pincode↔ward lookup tool, which was built on a companion static CSV.
- **"Five corporations"** — Bengaluru's BBMP was split into five corporations
  (North/South/East/West/Central) in a 2025 reorganisation. Lucknow Nagar
  Nigam is a single, unified corporation. There is no Lucknow equivalent to
  draw, so the "Corporations" map layer and the homepage's old corporation-zone
  illustration were removed/relabeled rather than showing an invented split.
- **369-ward delimitation** — Bengaluru's current ward boundaries, published
  by OpenCity. Lucknow has no equivalent live/current open-data source (the
  `wards369` id is kept internally so the large map component didn't need
  restructuring). It now serves real 2018 ward geometry — see "What's real"
  below and `lib/wards.ts` for the vintage caveat.
- **"Old ward boundary (198)"** — Bengaluru's pre-2025 ward scheme. Lucknow
  has no known equivalent legacy scheme, so this layer is also an empty
  placeholder (`public/geojson/LUCKNOW.geojson`), labeled "not applicable."
- **Social handles seed data** (`scripts/seed-social-handles.ts`) — the
  Bengaluru original's ~20 hand-researched entries (government accounts,
  NGOs, civic commentators) named real Bengaluru people and Bengaluru-only
  agencies (BWSSB, BESCOM, BMTC, BMRCL). After the text-only rebrand pass,
  these became real people's names and handles misattributed to Lucknow —
  caught and removed during a later local-run check, not the original build
  pass. `SEED_DATA` is now empty; see that file's header for what a real
  Lucknow version needs.
- **Area age layer** — Bengaluru's version tinted every ward by the era of
  its nearest of 42 dated localities, sourced from a circulated infographic
  about Bengaluru neighbourhoods. No equivalent single source exists for
  Lucknow, so `lib/areaAges.ts`'s `DATED_AREAS` is a much shorter,
  independently fact-checked list (12 localities, one to a few per era) built
  from citable sources — Wikipedia, district-government and institutional
  histories — rather than a full survey. See that file's header and each
  entry's `note` for sourcing.

## What still needs sourcing (open items for a future contributor)

1. **A current (post-2023 delimitation) Lucknow ward boundary GeoJSON.**
   `public/geojson/lucknow-wards.geojson` now has real ward geometry — 112
   wards, unblocking the ward layer on `/map`, ward-level community post
   filtering, and OSM postcode/amenity bucketing by ward — but it's a 2018
   file (pre-2023 delimitation), so ward names/counts drift from LMC's current
   110-ward scheme (see "What's real"). If the current scheme ever surfaces as
   GIS data (LMC or UP SEC), swap it in at `lib/wards.ts` and drop the vintage
   caveats it introduced (`lib/mapLayers.ts`'s `wards369` label,
   `pages/map.tsx`'s meta description, this file).
2. **Verified office contact numbers** for the 9 MLAs, the MP, the Mayor and
   the 110 corporators, from an official source (e.g. the UP Vidhan Sabha
   website, Lok Sabha website, or LMC itself), if this directory should ever
   carry phone numbers.
3. **A fuller dated-localities list for Lucknow.** `lib/areaAges.ts` now has
   12 sourced entries (Lakshman Tila, Chowk, The Residency, Hazratganj,
   Aminabad, Qaiserbagh, Charbagh, Rajajipuram, Aliganj, Indira Nagar, Gomti
   Nagar, Sushant Golf City) covering all seven eras, but it's a spot-checked
   sample, not a survey — there is room for many more per era from a citable
   source, not a guess.
4. **MySQL** — `pages/officials.tsx` and `/social-handles` build via
   `getStaticProps`, which needs a reachable database. This build environment
   has no MySQL server, so those two pages fail to prerender here (the same
   would happen for the original Bengaluru app without a configured
   database) — `npx next build` otherwise compiles clean and generates all
   12 other pages. Point `DB_HOST`/`DB_USER`/etc. (see `.env.local`) at a real
   MySQL instance, run `database/schema.sql`, then `npm run seed:all`, and
   the build will complete fully.

## What needed no changes

- `components/MetroNetworkMap.tsx` / `MetroLineRouteMap.tsx` — fully generic,
  driven entirely by `lib/metroNetworkData.ts`.
- The MySQL schema and cache-table plumbing (`lib/db.ts`, `database/schema.sql`)
  — table shapes are portable; only what's loaded into them changed. Two
  tables (`road_register`, `pincode_ward_mapping`) are now unused dead schema
  since their features were cut — harmless to leave, safe to drop in a future
  migration.
- Community posts, saved-places/profile, social handles directory, auth —
  all generic, city-agnostic features carried over unchanged.

## Coordinates changed

`lib/mapLayers.ts`'s `LUCKNOW_CENTER`/`LUCKNOW_BOUNDS` (and the matching
constants in `components/LucknowMap.tsx`, `lib/postcodes.ts`,
`lib/amenities.ts`) held literal Bengaluru coordinates in the immediate
post-rebrand copy (a plain find-and-replace only touches text, not numbers).
These are now real Lucknow coordinates derived from the DataMeet boundary
file's bounding box.
