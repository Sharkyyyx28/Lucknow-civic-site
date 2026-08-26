// Builds the officials directory. Server only — see lib/officialsTypes.ts for
// the shapes the pages share.
//
// Bengaluru's version of this file merged three sources (the BBMP road
// register, OpenCity MLAs, OpenCity forest wing) with a lot of fuzzy-matching
// machinery to bridge ward-name spelling differences between them. Lucknow
// has no road register and no OpenCity portal, so this version is much
// simpler: it just turns lib/officialsSources.ts's static MLA/MP/Mayor/
// corporator lists into OfficialContact rows. The MLA and corporator lists
// key by two different, real ward delimitations (2022 assembly constituencies
// vs the 2023 LMC wards) — no attempt is made to reconcile them with each
// other or with the map's 2018 ward polygons; see lib/officialsSources.ts.
//
// The MySQL cache (officials_contacts/officials_meta) is kept — it costs
// nothing to keep the same read path as before, and it means
// pages/officials.tsx and pages/api/officials.ts didn't need to change at
// all. But building this directory from a hardcoded array is so cheap there
// is little practical benefit to caching it; the DB path mainly exists so a
// future contributor who adds a real live source (if Lucknow ever gets an
// open-data portal) can drop it in without re-plumbing the read side.

import type { RowDataPacket } from 'mysql2/promise'
import pool from './db'
import {
  MAYOR,
  MLA_RECORDS,
  MLA_DIRECTORY_VERIFIED_AT,
  MP,
  CORPORATOR_RECORDS,
  LMC_CORPORATOR_DIRECTORY_VERIFIED_AT,
} from './officialsSources'
import { SOURCES, type Coverage, type OfficialContact, type OfficialsDirectory, type SourceId } from './officialsTypes'

function slugify(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

let cache: Promise<OfficialsDirectory> | null = null

export function getOfficialsDirectory(): Promise<OfficialsDirectory> {
  if (!cache) {
    cache = loadOfficialsDirectory().catch(err => {
      cache = null
      throw err
    })
  }
  return cache
}

async function loadOfficialsDirectory(): Promise<OfficialsDirectory> {
  const stored = await loadFromDb()
  if (stored) {
    console.log(
      `[officials] serving ${stored.directory.contacts.length} contacts from ` +
        `officials_contacts (cache refreshed ${stored.refreshedAt})`
    )
    return stored.directory
  }

  console.error(
    '[officials] officials_contacts is empty — falling back to a live build ' +
      '(run `npm run refresh:officials` to warm the cache)'
  )
  const live = buildOfficialsDirectory()
  saveToDb(live).catch(err =>
    console.error('[officials] failed to warm db cache after live fallback:', err)
  )
  return live
}

interface ContactRow extends RowDataPacket {
  id: string
  role: string
  source: string
  name: string
  designation: string | null
  phones: string[]
  email: string | null
  wards: string[]
  coverage_label: string
  roads: number
}

interface MetaRow extends RowDataPacket {
  wards: string[]
  coverage: Coverage
  refreshed_at: Date
}

async function loadFromDb(): Promise<{ directory: OfficialsDirectory; refreshedAt: Date } | null> {
  const [rows] = await pool.query<ContactRow[]>(
    `SELECT id, role, source, name, designation, phones, email, wards, coverage_label, roads
     FROM officials_contacts`
  )
  if (rows.length === 0) return null

  const [metaRows] = await pool.query<MetaRow[]>(
    'SELECT wards, coverage, refreshed_at FROM officials_meta WHERE id = 1'
  )
  const meta = metaRows[0]
  if (!meta) return null

  const contacts: OfficialContact[] = rows.map(row => ({
    id: row.id,
    role: row.role,
    source: row.source as SourceId,
    name: row.name,
    ...(row.designation ? { party: row.designation } : {}),
    phones: row.phones,
    ...(row.email ? { email: row.email } : {}),
    wards: row.wards,
    coverageLabel: row.coverage_label,
    roads: row.roads,
  }))

  return {
    directory: { contacts, wards: meta.wards, coverage: meta.coverage },
    refreshedAt: meta.refreshed_at,
  }
}

// Full replace inside a transaction, same pattern as the Bengaluru version and
// as lib/amenities.ts.
async function saveToDb(directory: OfficialsDirectory): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM officials_contacts')
    const placeholders = directory.contacts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    if (directory.contacts.length > 0) {
      const values = directory.contacts.flatMap(c => [
        c.id,
        c.role,
        c.source,
        c.name,
        c.party ?? null,
        JSON.stringify(c.phones),
        c.email ?? null,
        JSON.stringify(c.wards),
        c.coverageLabel,
        c.roads,
      ])
      await conn.query(
        `INSERT INTO officials_contacts
           (id, role, source, name, designation, phones, email, wards, coverage_label, roads)
         VALUES ${placeholders}`,
        values
      )
    }
    await conn.query(
      `INSERT INTO officials_meta (id, wards, coverage) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE wards = VALUES(wards), coverage = VALUES(coverage)`,
      [JSON.stringify(directory.wards), JSON.stringify(directory.coverage)]
    )
    // mlas_live/forest_live are a holdover from the Bengaluru schema (whether
    // that refresh reached OpenCity live). This directory has no live source
    // at all — it's a static, hand-verified file — so mlas_live records "the
    // static source was used" (always true) and forest_live stays false
    // since there is no forest-wing role in this build.
    await conn.query(
      'INSERT INTO officials_refresh_log (contact_count, mlas_live, forest_live) VALUES (?, ?, ?)',
      [directory.contacts.length, true, false]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export function buildOfficialsDirectory(): OfficialsDirectory {
  const mlaContacts: OfficialContact[] = MLA_RECORDS.map(record => ({
    id: `mla:${slugify(record.name)}`,
    role: 'mla',
    source: 'mla-directory' as const,
    name: record.name,
    party: record.party,
    phones: [],
    wards: [record.constituency],
    coverageLabel: `${record.constituency} (AC ${record.acNo})`,
    roads: 0,
  }))

  const mayorContact: OfficialContact = {
    id: `mayor:${slugify(MAYOR.name)}`,
    role: 'mayor',
    source: 'mla-directory',
    name: MAYOR.name,
    party: MAYOR.party,
    phones: [],
    wards: ['Lucknow'],
    coverageLabel: 'Lucknow Municipal Corporation',
    roads: 0,
  }

  const mpContact: OfficialContact = {
    id: `mp:${slugify(MP.name)}`,
    role: 'mp',
    source: 'mla-directory',
    name: MP.name,
    party: MP.party,
    phones: [],
    wards: [MP.constituency],
    coverageLabel: `${MP.constituency} (Lok Sabha)`,
    roads: 0,
  }

  const corporatorContacts: OfficialContact[] = CORPORATOR_RECORDS.map(record => ({
    id: `corporator:${slugify(record.name)}-ward-${record.wardNo}`,
    role: 'corporator',
    source: 'lmc-corporators-2023' as const,
    name: record.name,
    party: record.party,
    phones: [],
    wards: [record.wardName],
    coverageLabel: `Ward ${record.wardNo} — ${record.wardName}`,
    roads: 0,
  }))

  const contacts = [...mlaContacts, mayorContact, mpContact, ...corporatorContacts]
  const wards = [...new Set(contacts.flatMap(c => c.wards))].sort()

  const coverage: Coverage = {
    sources: [
      {
        id: 'mla-directory',
        ...SOURCES['mla-directory'],
        updated: MLA_DIRECTORY_VERIFIED_AT,
        contacts: mlaContacts.length + 2, // + Mayor + MP
        live: true, // committed to the repo — always available, nothing to fall back from
      },
      {
        id: 'lmc-corporators-2023',
        ...SOURCES['lmc-corporators-2023'],
        updated: LMC_CORPORATOR_DIRECTORY_VERIFIED_AT,
        contacts: corporatorContacts.length,
        live: true,
      },
    ],
    wardCount: wards.length,
    totalWards: wards.length,
    roadCount: 0,
    roadRegisterZones: [],
    roadRegisterWardCount: 0,
  }

  return { contacts, wards, coverage }
}

// Kept for parity with scripts/refresh-officials.ts, which calls this on a
// schedule. There's nothing to actually "refresh" against — the source is a
// static file — so this just rebuilds from it and re-warms the cache, which
// is harmless to run repeatedly.
export async function refreshOfficialsDirectory(): Promise<OfficialsDirectory> {
  const directory = buildOfficialsDirectory()
  await saveToDb(directory)
  cache = Promise.resolve(directory)
  return directory
}
