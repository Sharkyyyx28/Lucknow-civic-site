import { createMocks } from 'node-mocks-http'
import type { NextApiRequest, NextApiResponse } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/amenities', () => ({
  getAmenitiesForWard: vi.fn(),
}))

import handler from '../../pages/api/ward-amenities'
import { getAmenitiesForWard } from '../../lib/amenities'

const mockedGetAmenitiesForWard = vi.mocked(getAmenitiesForWard)

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/ward-amenities', () => {
  it('400s when ward_name is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET', query: {} })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
    expect(res._getJSONData()).toEqual({ error: 'ward_name is required' })
    expect(mockedGetAmenitiesForWard).not.toHaveBeenCalled()
  })

  it('400s on an invalid boundary set', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { ward_name: 'Byrathi', boundary: 'wards198x' },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
    expect(res._getJSONData()).toEqual({ error: 'boundary must be wards369 or wards198' })
  })

  it('defaults to the wards369 boundary set', async () => {
    mockedGetAmenitiesForWard.mockResolvedValue({
      ok: true,
      counts: { hospitals: 1, parks: 2, schools: 3, safety: 0 },
      items: { hospitals: [], parks: [], schools: [], safety: [] },
    })
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { ward_name: 'Byrathi' },
    })
    await handler(req, res)
    expect(mockedGetAmenitiesForWard).toHaveBeenCalledWith('Byrathi', 'wards369')
    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData()).toMatchObject({ ward_name: 'Byrathi', boundary: 'wards369', ok: true })
    expect(res.getHeader('Cache-Control')).toContain('max-age')
  })

  it('does not cache a not-ok response', async () => {
    mockedGetAmenitiesForWard.mockResolvedValue({
      ok: false,
      counts: { hospitals: 0, parks: 0, schools: 0, safety: 0 },
      items: { hospitals: [], parks: [], schools: [], safety: [] },
    })
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { ward_name: 'Nonexistent Ward', boundary: 'wards198' },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect((res._getJSONData() as any).ok).toBe(false)
    expect(res.getHeader('Cache-Control')).toBe('no-store')
  })
})
