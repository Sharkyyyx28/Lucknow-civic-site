import type { NextApiRequest, NextApiResponse } from 'next'
import { getOfficialsDirectory } from '../../lib/officials'
import type { OfficialContact } from '../../lib/officialsTypes'
import { getPostcodesForWard } from '../../lib/postcodes'
import { isWardBoundarySet, wardKey } from '../../lib/wardGeometry'

export interface WardDetailsResponse {
  ward_name: string
  pincodes: string[]
  officials: OfficialContact[]
  /** False when the officials directory couldn't be built — not "no contacts". */
  officialsOk: boolean
}

// Everything the map's ward sidebar shows besides amenities: pincodes and the
// people holding office over the ward. Bengaluru's version unioned a static
// pincode CSV with live OSM postcodes; Lucknow has no equivalent static CSV
// (see lib/wards.ts), so this reads live OSM postcodes only.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ward_name, boundary } = req.query
  if (!ward_name || typeof ward_name !== 'string') {
    return res.status(400).json({ error: 'ward_name is required' })
  }
  const set = boundary === undefined ? 'wards369' : boundary
  if (!isWardBoundarySet(set)) {
    return res.status(400).json({ error: 'boundary must be wards369 or wards198' })
  }

  const key = wardKey(ward_name)

  const [pincodes, directory] = await Promise.all([
    getPostcodesForWard(ward_name, set).catch(() => []),
    getOfficialsDirectory().catch(err => {
      console.error('[ward-details] officials directory failed:', err?.message ?? err)
      return null
    }),
  ])

  const officials = (directory?.contacts ?? []).filter(contact =>
    contact.wards.some(ward => wardKey(ward) === key)
  )

  const body: WardDetailsResponse = {
    ward_name,
    pincodes,
    officials,
    officialsOk: directory !== null,
  }

  if (directory) {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  } else {
    res.setHeader('Cache-Control', 'no-store')
  }
  return res.status(200).json(body)
}
