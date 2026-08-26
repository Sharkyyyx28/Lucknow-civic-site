import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSocialHandle, mapWithConcurrency } from '../../lib/socialHandleCheck'

describe('checkSocialHandle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('only probes fields that are non-blank', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await checkSocialHandle({ x: 'lmc_ward1', instagram: '', website: '' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://x.com/lmc_ward1', expect.any(Object))
    expect(result).toEqual({ x: 'ok' })
  })

  it('maps a 404 to not_found and a non-ok status to unknown', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await checkSocialHandle({ x: 'nope', instagram: 'blocked', website: '' })

    expect(result).toEqual({ x: 'not_found', instagram: 'unknown' })
  })

  it('treats a thrown/aborted request as unknown rather than failing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error'))
    )

    const result = await checkSocialHandle({ x: '', instagram: '', website: 'https://example.com' })

    expect(result).toEqual({ website: 'unknown' })
  })

  it('returns an empty object when nothing is provided', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await checkSocialHandle({ x: '', instagram: '', website: '' })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toEqual({})
  })
})

describe('mapWithConcurrency', () => {
  it('preserves input order regardless of completion order', async () => {
    const delays = [30, 10, 20]
    const result = await mapWithConcurrency(delays, 3, async (ms) => {
      await new Promise(resolve => setTimeout(resolve, ms))
      return ms
    })
    expect(result).toEqual(delays)
  })

  it('never runs more than `limit` items concurrently', async () => {
    let active = 0
    let maxActive = 0
    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise(resolve => setTimeout(resolve, 5))
      active--
      return n
    })
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it('handles an empty input list', async () => {
    const result = await mapWithConcurrency([], 3, async (n) => n)
    expect(result).toEqual([])
  })
})
