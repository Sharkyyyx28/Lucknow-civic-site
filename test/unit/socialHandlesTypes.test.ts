import { describe, expect, it } from 'vitest'
import {
  filterSocialHandles,
  instagramUrl,
  isHandleCategory,
  isHandleCheckStatus,
  xUrl,
  type SocialHandle,
} from '../../lib/socialHandlesTypes'

function makeHandle(overrides: Partial<SocialHandle> = {}): SocialHandle {
  return {
    id: '1',
    name: 'LMC Ward 1',
    category: 'official',
    role: '',
    focus: 'Civic issues in ward 1',
    x: 'lmc_ward1',
    xStatus: 'ok',
    instagram: '',
    instagramStatus: 'unchecked',
    website: '',
    websiteStatus: 'unchecked',
    checkedAt: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('isHandleCategory', () => {
  it('accepts known categories', () => {
    expect(isHandleCategory('official')).toBe(true)
    expect(isHandleCategory('ngo')).toBe(true)
  })

  it('rejects unknown or non-string values', () => {
    expect(isHandleCategory('unknown')).toBe(false)
    expect(isHandleCategory(42)).toBe(false)
    expect(isHandleCategory(undefined)).toBe(false)
  })
})

describe('isHandleCheckStatus', () => {
  it('accepts known statuses', () => {
    expect(isHandleCheckStatus('ok')).toBe(true)
    expect(isHandleCheckStatus('not_found')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isHandleCheckStatus('bogus')).toBe(false)
  })
})

describe('xUrl / instagramUrl', () => {
  it('builds the profile URL from a bare handle', () => {
    expect(xUrl('lmc_ward1')).toBe('https://x.com/lmc_ward1')
    expect(instagramUrl('lmc_ward1')).toBe('https://instagram.com/lmc_ward1')
  })
})

describe('filterSocialHandles', () => {
  const handles = [
    makeHandle({ id: '1', name: 'LMC Ward 1', category: 'official', focus: 'Roads and drains' }),
    makeHandle({ id: '2', name: 'Namma Lucknow NGO', category: 'ngo', focus: 'Tree cover and parks' }),
    makeHandle({ id: '3', name: 'Civic Voice', category: 'individual', focus: 'Potholes and roads' }),
  ]

  it('returns everything when no query or category is given', () => {
    expect(filterSocialHandles(handles, {})).toHaveLength(3)
  })

  it('filters by category', () => {
    const result = filterSocialHandles(handles, { category: 'ngo' })
    expect(result.map(h => h.id)).toEqual(['2'])
  })

  it('filters by a single search token across name/role/focus/handles', () => {
    const result = filterSocialHandles(handles, { q: 'roads' })
    expect(result.map(h => h.id).sort()).toEqual(['1', '3'])
  })

  it('requires every whitespace-separated token to match', () => {
    const result = filterSocialHandles(handles, { q: 'namma parks' })
    expect(result.map(h => h.id)).toEqual(['2'])
  })

  it('is case-insensitive', () => {
    const result = filterSocialHandles(handles, { q: 'LUCKNOW' })
    expect(result.map(h => h.id)).toEqual(['2'])
  })

  it('combines category and query filters', () => {
    const result = filterSocialHandles(handles, { q: 'roads', category: 'individual' })
    expect(result.map(h => h.id)).toEqual(['3'])
  })
})
