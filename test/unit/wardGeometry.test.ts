import { describe, expect, it } from 'vitest'
import { findWardForPoint, isWardBoundarySet, wardKey, type WardPolygon } from '../../lib/wardGeometry'

describe('wardKey', () => {
  it('strips the leading "N - " ward-number prefix and lowercases', () => {
    expect(wardKey('12 - Byrathi')).toBe('byrathi')
  })

  it('trims whitespace and leaves names without a prefix alone', () => {
    expect(wardKey('  Kengeri  ')).toBe('kengeri')
  })
})

describe('isWardBoundarySet', () => {
  it('accepts the two known sets', () => {
    expect(isWardBoundarySet('wards369')).toBe(true)
    expect(isWardBoundarySet('wards198')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isWardBoundarySet('wards198x')).toBe(false)
    expect(isWardBoundarySet(undefined)).toBe(false)
  })
})

describe('findWardForPoint', () => {
  // A simple 2x2 square centered at the origin, and a second ward far away —
  // exercises both the bbox pre-check and the exact polygon test.
  const nearWard: WardPolygon = {
    key: 'near',
    geometry: {
      type: 'Polygon',
      coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]],
    },
    bbox: [-1, -1, 1, 1],
  }
  const farWard: WardPolygon = {
    key: 'far',
    geometry: {
      type: 'Polygon',
      coordinates: [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
    },
    bbox: [10, 10, 12, 12],
  }
  const wards = [nearWard, farWard]

  it('finds the ward containing the point', () => {
    expect(findWardForPoint(0, 0, wards)?.key).toBe('near')
  })

  it('returns null when no ward contains the point', () => {
    expect(findWardForPoint(50, 50, wards)).toBeNull()
  })

  it('skips wards using the bbox before the exact polygon test', () => {
    expect(findWardForPoint(11, 11, wards)?.key).toBe('far')
  })
})
