import type { NextApiRequest, NextApiResponse } from 'next'
import { getWards369 } from '../../lib/wards'
import { getPostcodesForWard } from '../../lib/postcodes'

export interface WardListEntry {
  wardName: string
  wardNameKannada: string
  wardNumber: string
  corporation: string
  constituency: string
  pincodes: string[]
}

// Ward names/metadata only (no geometry) — for pickers like the profile form.
// Bengaluru's version unioned a static pincode CSV with live OSM data; Lucknow
// has no equivalent static CSV (see lib/wards.ts), so this reads live OSM
// postcodes only. `corporation`/`constituency` come back empty for every ward
// since the source data (see lib/wards.ts) doesn't carry that metadata.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { geojson } = await getWards369()

  const wards: WardListEntry[] = (
    await Promise.all(
      geojson.features.map(async f => {
        const props = f.properties as Record<string, unknown>
        const wardName = typeof props.ward_name === 'string' ? props.ward_name : null
        if (!wardName) return null
        const pincodes = await getPostcodesForWard(wardName).catch(() => [])
        return {
          wardName,
          wardNameKannada: '',
          wardNumber: typeof props.ward_id === 'string' ? props.ward_id : '',
          corporation: typeof props.Corporation === 'string' ? props.Corporation : '',
          constituency: typeof props.Assembly === 'string' ? props.Assembly : '',
          pincodes,
        }
      })
    )
  )
    .filter((w): w is WardListEntry => w !== null)
    .sort((a, b) =>
      a.wardName.replace(/^\d+\s*-\s*/, '').localeCompare(b.wardName.replace(/^\d+\s*-\s*/, ''))
    )

  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return res.status(200).json({ wards })
}
