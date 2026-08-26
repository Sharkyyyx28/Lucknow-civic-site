import type { NextApiRequest, NextApiResponse } from 'next'
import { getOfficialsDirectory } from '../../lib/officials'
import { filterOfficials } from '../../lib/officialsTypes'

/**
 * The officials directory as JSON. /officials renders the whole thing at build
 * time and filters in the browser, so this exists for anyone reading the data
 * from outside the site — hence the same ?q/?ward/?role/?group/?source filters.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const { contacts, wards, coverage } = await getOfficialsDirectory()

  const matches = filterOfficials(contacts, {
    q: first(req.query.q),
    ward: first(req.query.ward),
    role: first(req.query.role),
    group: first(req.query.group),
    source: first(req.query.source),
  })

  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return res.status(200).json({
    total: matches.length,
    coverage,
    wards,
    contacts: matches,
  })
}
