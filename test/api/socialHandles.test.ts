import { createMocks } from 'node-mocks-http'
import type { NextApiRequest, NextApiResponse } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SocialHandle } from '../../lib/socialHandlesTypes'

vi.mock('../../lib/admin', () => ({
  requireAdmin: vi.fn(),
}))
vi.mock('../../lib/socialHandles', () => ({
  listSocialHandles: vi.fn(),
  createSocialHandle: vi.fn(),
  recordHandleCheck: vi.fn(),
}))
vi.mock('../../lib/socialHandleCheck', () => ({
  checkSocialHandle: vi.fn(),
}))

import handler from '../../pages/api/social-handles/index'
import { requireAdmin } from '../../lib/admin'
import { createSocialHandle, listSocialHandles, recordHandleCheck } from '../../lib/socialHandles'
import { checkSocialHandle } from '../../lib/socialHandleCheck'

const mockedRequireAdmin = vi.mocked(requireAdmin)
const mockedList = vi.mocked(listSocialHandles)
const mockedCreate = vi.mocked(createSocialHandle)
const mockedRecordCheck = vi.mocked(recordHandleCheck)
const mockedCheckHandle = vi.mocked(checkSocialHandle)

function sampleHandle(overrides: Partial<SocialHandle> = {}): SocialHandle {
  return {
    id: '1',
    name: 'LMC Ward 1',
    category: 'official',
    role: '',
    focus: 'Civic issues',
    x: 'lmc_ward1',
    xStatus: 'unchecked',
    instagram: '',
    instagramStatus: 'unchecked',
    website: '',
    websiteStatus: 'unchecked',
    checkedAt: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/social-handles', () => {
  it('returns the full directory with no filters', async () => {
    mockedList.mockResolvedValue([sampleHandle()])
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET', query: {} })
    await handler(req, res)
    expect(mockedList).toHaveBeenCalledWith(undefined)
    expect(res._getStatusCode()).toBe(200)
    expect((res._getJSONData() as any).handles).toHaveLength(1)
  })

  it('passes through a valid category filter', async () => {
    mockedList.mockResolvedValue([])
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { category: 'ngo' },
    })
    await handler(req, res)
    expect(mockedList).toHaveBeenCalledWith('ngo')
  })

  it('does not require admin auth', async () => {
    mockedList.mockResolvedValue([])
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET', query: {} })
    await handler(req, res)
    expect(mockedRequireAdmin).not.toHaveBeenCalled()
  })
})

describe('POST /api/social-handles', () => {
  it('401s when the caller is not signed in', async () => {
    mockedRequireAdmin.mockImplementation(async (_req, res) => {
      res.status(401).json({ error: 'Sign in required' })
      return null
    })
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { name: 'X', category: 'official', focus: 'Y', x: 'handle' },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(401)
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('400s on invalid input without calling requireAdmin-gated create', async () => {
    mockedRequireAdmin.mockResolvedValue('admin@example.com')
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { name: '', category: 'official', focus: 'Y' },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
    expect(res._getJSONData()).toEqual({ error: 'A name is required' })
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('400s when none of x/instagram/website are provided', async () => {
    mockedRequireAdmin.mockResolvedValue('admin@example.com')
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { name: 'X', category: 'official', focus: 'Y' },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(400)
    expect((res._getJSONData() as any).error).toMatch(/at least one/i)
  })

  it('creates a handle, runs a best-effort check, and returns the checked handle', async () => {
    mockedRequireAdmin.mockResolvedValue('admin@example.com')
    const created = sampleHandle()
    mockedCreate.mockResolvedValue(created)
    mockedCheckHandle.mockResolvedValue({ x: 'ok' })
    mockedRecordCheck.mockResolvedValue(sampleHandle({ xStatus: 'ok' }))

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { name: 'LMC Ward 1', category: 'official', focus: 'Civic issues', x: 'lmc_ward1' },
    })
    await handler(req, res)

    expect(mockedCreate).toHaveBeenCalledWith(req.body, 'admin@example.com')
    expect(mockedCheckHandle).toHaveBeenCalledWith(created)
    expect(mockedRecordCheck).toHaveBeenCalledWith(created.id, { x: 'ok' })
    expect(res._getStatusCode()).toBe(201)
    expect((res._getJSONData() as any).handle.xStatus).toBe('ok')
  })

  it('still returns 201 with the unchecked handle when the existence check throws', async () => {
    mockedRequireAdmin.mockResolvedValue('admin@example.com')
    const created = sampleHandle()
    mockedCreate.mockResolvedValue(created)
    mockedCheckHandle.mockRejectedValue(new Error('probe failed'))

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { name: 'LMC Ward 1', category: 'official', focus: 'Civic issues', x: 'lmc_ward1' },
    })
    await handler(req, res)

    expect(res._getStatusCode()).toBe(201)
    expect((res._getJSONData() as any).handle).toEqual(created)
    expect(mockedRecordCheck).not.toHaveBeenCalled()
  })
})

describe('unsupported methods', () => {
  it('405s and sets Allow', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({ method: 'DELETE' })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(405)
    expect(res.getHeader('Allow')).toBe('GET, POST')
  })
})
