// One-shot job: populate the community feed with sample posts so it isn't
// empty on a fresh database. Unlike officials/social-handles (verified,
// sourced data), community posts are inherently opinions/reports from real
// residents — there is no "real" source to seed from. SEED_POSTS below is
// synthetic demo content, clearly attributed to a single seed account
// (never a real person), not a claim that any of these events happened.
//
// Coordinates reuse the already-verified locality centres from
// lib/areaAges.ts rather than invented points. ward_name/corporation are not
// hardcoded — resolved via wardAtPoint(), the same boundary-geometry lookup
// pages/api/community/posts.ts uses for a real post, so seeded rows land in
// whichever ward's feed they'd actually belong to.
//
// Safe to re-run: skips any (title, lat, lng) already present for the seed
// account instead of duplicating it.
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

import type { PostCategory } from '../lib/communityTypes'

const SEED_AUTHOR_EMAIL = 'seed-demo@lucknow.local'
const SEED_AUTHOR_NAME = 'Sample post (seed data)'

interface SeedPost {
  title: string
  body: string
  category: PostCategory
  lat: number
  lng: number
  placeLabel: string
}

const SEED_POSTS: SeedPost[] = [
  {
    title: 'Streetlights out along the main Hazratganj stretch',
    body: 'Several streetlights between the crossing and the market entrance have been dark for a couple of weeks now. Makes the evening crowd a bit harder to navigate safely.',
    category: 'issue',
    lat: 26.8556,
    lng: 80.943,
    placeLabel: 'Near the Hazratganj crossing',
  },
  {
    title: 'Aminabad market cleanup crew doing great work',
    body: "Noticed the lanes near the market have been noticeably cleaner the last month — whoever's on the morning sweep shift is doing a solid job.",
    category: 'praise',
    lat: 26.8558,
    lng: 80.9282,
    placeLabel: 'Aminabad market lanes',
  },
  {
    title: "Best time to visit Chowk's food street without the crowds?",
    body: 'Planning to take some out-of-town family to try the food there. Is there a quieter time of day, or is it packed pretty much whenever it opens?',
    category: 'question',
    lat: 26.8639,
    lng: 80.9028,
    placeLabel: 'Chowk food street',
  },
  {
    title: 'Waterlogging near Charbagh station after heavy rain',
    body: 'The stretch just outside the station forecourt floods badly whenever there\'s a heavy spell — ankle-deep in places. Been like this for a couple of monsoons now.',
    category: 'issue',
    lat: 26.832,
    lng: 80.919,
    placeLabel: 'Charbagh station forecourt',
  },
  {
    title: 'New park benches installed in Aliganj',
    body: "The park near the sector market got a set of new benches and a repainted boundary wall this month. Small thing but it's a nicer spot to sit now.",
    category: 'update',
    lat: 26.911,
    lng: 80.9531,
    placeLabel: 'Aliganj sector park',
  },
  {
    title: 'Indira Nagar park well maintained this season',
    body: 'Grass is cut regularly and the walking track edges are kept clear. One of the better-kept parks I\'ve come across in this part of the city.',
    category: 'praise',
    lat: 26.8833,
    lng: 80.9833,
    placeLabel: 'Indira Nagar park',
  },
  {
    title: 'Anyone know when the Gomti Nagar flyover work finishes?',
    body: 'The construction barricades have been up for a while and traffic backs up badly during evening hours. Curious if there\'s an announced completion date anywhere.',
    category: 'question',
    lat: 26.8449,
    lng: 81.0095,
    placeLabel: 'Gomti Nagar flyover site',
  },
  {
    title: 'Garbage collection has been irregular in Rajajipuram',
    body: 'The morning collection has been skipping some lanes two or three times a week lately — bins are overflowing by the time it does come round.',
    category: 'issue',
    lat: 26.847,
    lng: 80.8763,
    placeLabel: 'Rajajipuram sector lanes',
  },
]

async function main() {
  const { wardAtPoint } = await import('../lib/wardLookup')
  const { createPost, listPosts } = await import('../lib/community')
  const pool = (await import('../lib/db')).default
  const { saveName } = await import('../lib/profiles')

  await saveName(SEED_AUTHOR_EMAIL, SEED_AUTHOR_NAME)

  const { posts: existing } = await listPosts({ authorKey: SEED_AUTHOR_EMAIL, limit: 100 })
  const alreadySeeded = new Set(existing.map(p => `${p.title}|${p.lat}|${p.lng}`))

  let created = 0
  let skippedDuplicate = 0
  let skippedUnmapped = 0

  try {
    for (const post of SEED_POSTS) {
      const key = `${post.title}|${post.lat}|${post.lng}`
      if (alreadySeeded.has(key)) {
        skippedDuplicate++
        continue
      }

      const hit = await wardAtPoint(post.lat, post.lng)
      if (!hit) {
        console.warn(`[seed-community-posts] skipping "${post.title}" — point falls outside the mapped ward boundaries`)
        skippedUnmapped++
        continue
      }

      await createPost(SEED_AUTHOR_EMAIL, {
        title: post.title,
        body: post.body,
        category: post.category,
        wardName: hit.wardName,
        corporation: hit.corporation,
        placeLabel: post.placeLabel,
        lat: post.lat,
        lng: post.lng,
      })
      created++
    }
    console.log(
      `[seed-community-posts] created=${created} skipped(duplicate)=${skippedDuplicate} skipped(unmapped)=${skippedUnmapped}`
    )
  } finally {
    await pool.end()
  }
}

main().catch(err => {
  console.error('[seed-community-posts] seed failed:', err)
  process.exitCode = 1
})
