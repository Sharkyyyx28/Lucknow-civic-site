// One-shot job: load a curated set of social handles into the
// social_handles table, managed going forward through /admin/social-handles.
//
// IMPORTANT: this file's Bengaluru-era seed data was removed rather than
// carried over — the original list named real Bengaluru civic figures and
// Bengaluru-only agencies (BWSSB, BESCOM, BMTC, BMRCL) that became
// misattributed Lucknow entries after a text-only rebrand. See git history.
//
// The list below is Lucknow-specific, hand-researched: each handle checked
// against the org's own website (where it links its social accounts) or,
// failing that, corroborated by the account's own bio/content actually
// matching the org (not assumed from name-guessing alone). No civic
// commentators/individuals are included — none could be verified the same
// way. Run `npm run seed:social-handles` to load, then
// `npm run refresh:social-handles` to probe each link for a dead/typo'd
// handle. Sources checked, by entry:
// - LMC: bio references Lucknow's 2024 Swachh Survekshan ranking (a
//   corporation-specific claim); lmc.up.nic.in has no working social links
//   to cross-check against.
// - Jalkal: handle's own bio self-identifies as "Water Works Department,
//   Nagar Nigam Lucknow".
// - LDA: x/Instagram links pulled directly from ldalucknow.in's own header/footer.
// - Lucknow Police / Traffic Police / DM Lucknow: consistent account naming
//   and on-topic content (traffic diversions, prohibitory orders) across
//   independent searches; no official site cross-link found.
// - MVVNL: handle referenced in the org's own tweet; mvvnl.in listed as its site.
// - UP Metro (Lucknow Metro): links match upmetrorail.com's own domain family.
// - Lucknow Airport: x/Instagram/Facebook links pulled directly from the
//   airport's own site, ccsia-lucknow.adaniairports.com.
// - UP Fire Service, Lucknow: account previously handled as @fireservicelkw
//   (confirmed via its own tweets) appears to have since renamed to
//   @lucknowfire; not site-cross-checked.
// - AALI, Vatsalya, SAHAYOG: Instagram/Facebook links pulled directly from
//   each NGO's own website (aalilegal.org, vatsalya.org.in, sahayogindia.org).
//   None publish a working X/Twitter link on their own site.
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

interface SeedHandle {
  id: string
  name: string
  category: 'official' | 'ngo' | 'individual' | 'media'
  role?: string
  focus: string
  x?: string
  instagram?: string
  website?: string
}

const SEED_DATA: SeedHandle[] = [
  {
    id: 'lmc',
    name: 'Lucknow Municipal Corporation (Nagar Nigam)',
    category: 'official',
    focus: 'Roads, waste collection, parks, streetlights and other municipal services across Lucknow.',
    x: 'LMC_Lucknow',
    website: 'https://lmc.up.nic.in/',
  },
  {
    id: 'jalkal-lko',
    name: 'Jalkal Vibhag, Nagar Nigam Lucknow',
    category: 'official',
    focus: 'Water supply and sewerage — the municipal water works department, water-tax billing, and complaints.',
    x: 'jalkal_lko',
    website: 'https://jklmc.gov.in/',
  },
  {
    id: 'lda',
    name: 'Lucknow Development Authority',
    category: 'official',
    focus: 'Planned development, housing schemes, plot allotments and building-plan approvals across Lucknow.',
    x: 'LDA_Lucknow',
    instagram: 'lda_online',
    website: 'https://ldalucknow.in/',
  },
  {
    id: 'lucknow-police',
    name: 'Lucknow Police Commissionerate',
    category: 'official',
    focus: 'Law and order, crime reporting and general policing for Lucknow city.',
    x: 'lkopolice',
  },
  {
    id: 'lucknow-traffic-police',
    name: 'Lucknow Traffic Police',
    category: 'official',
    focus: 'Traffic diversions, road closures, challans and traffic advisories for Lucknow.',
    x: 'lucknowtraffic',
  },
  {
    id: 'dm-lucknow',
    name: 'District Magistrate, Lucknow',
    category: 'official',
    focus: 'District administration — prohibitory orders, school-closure notices and official district announcements.',
    x: 'AdminLKO',
    website: 'https://lucknow.nic.in/',
  },
  {
    id: 'mvvnl',
    name: 'Madhyanchal Vidyut Vitran Nigam (MVVNL)',
    category: 'official',
    focus: 'Electricity distribution and outage updates for Lucknow and the surrounding Madhyanchal region.',
    x: 'MVVNLHQ',
    website: 'https://www.mvvnl.in/',
  },
  {
    id: 'up-metro-lucknow',
    name: 'Uttar Pradesh Metro Rail Corporation (Lucknow Metro)',
    category: 'official',
    focus: 'Lucknow Metro service updates, timings and station information.',
    x: 'OfficialUPMetro',
    instagram: 'officialupmrc',
    website: 'https://lucknow.upmetrorail.com/',
  },
  {
    id: 'lko-airport',
    name: 'Chaudhary Charan Singh International Airport, Lucknow',
    category: 'official',
    focus: 'Flight information, terminal services and announcements for Lucknow airport.',
    x: 'lkoairport',
    instagram: 'lkoairport',
    website: 'https://ccsia-lucknow.adaniairports.com/',
  },
  {
    id: 'up-fire-lucknow',
    name: 'UP Fire & Emergency Services, Lucknow',
    category: 'official',
    focus: 'Fire and emergency response updates for Lucknow.',
    x: 'lucknowfire',
  },
  {
    id: 'aali',
    name: 'AALI (Association for Advocacy and Legal Initiatives)',
    category: 'ngo',
    focus: 'Lucknow-based women-led legal rights organisation working on violence against women, children and marginalised communities since 1998.',
    instagram: 'aalilegal',
    website: 'https://aalilegal.org/',
  },
  {
    id: 'vatsalya',
    name: 'Vatsalya',
    category: 'ngo',
    focus: "Lucknow-based NGO working on child rights, women's health, nutrition and education since 1995.",
    x: 'VatsalyaNGO',
    instagram: 'vatsalya.ngo',
    website: 'https://vatsalya.org.in/',
  },
  {
    id: 'sahayog',
    name: 'SAHAYOG',
    category: 'ngo',
    focus: "Women's health and gender-equality organisation, based in Lucknow.",
    instagram: 'sahayogindia',
    website: 'https://sahayogindia.org/',
  },
]

async function main() {
  const pool = (await import('../lib/db')).default

  try {
    for (const h of SEED_DATA) {
      await pool.query(
        `INSERT INTO social_handles
           (id, name, category, role, focus, x_handle, instagram_handle, website, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), category = VALUES(category), role = VALUES(role),
           focus = VALUES(focus), x_handle = VALUES(x_handle),
           instagram_handle = VALUES(instagram_handle), website = VALUES(website)`,
        [
          h.id,
          h.name,
          h.category,
          h.role ?? '',
          h.focus,
          h.x ?? '',
          h.instagram ?? '',
          h.website ?? '',
          'seed',
          'seed',
        ]
      )
    }
    console.log(`[seed-social-handles] ${SEED_DATA.length} rows seeded`)
  } catch (err) {
    console.error('[seed-social-handles] seed failed:', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
