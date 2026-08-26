// gen-corp-svg.js  — run with: node scripts/gen-corp-svg.js
// Reads public/geojson/lucknow-5-corporations.geojson,
// projects each corporation polygon to SVG space, and prints the paths.

const fs = require('fs')
const path = require('path')

const raw = fs.readFileSync(
  path.join(__dirname, '../public/geojson/lucknow-5-corporations.geojson'),
  'utf8'
)
const geojson = JSON.parse(raw)

// Bounding box of Greater Lucknow (covers all 5 corps)
const LNG_MIN = 77.46
const LNG_MAX = 77.78
const LAT_MIN = 12.82
const LAT_MAX = 13.15

const SIZE = 340
const PAD = 18

function project(lng, lat) {
  const x = PAD + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (SIZE - 2 * PAD)
  const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SIZE - 2 * PAD)
  return [x, y]
}

// Douglas-Peucker simplification
function perpendicularDist(pt, lineStart, lineEnd) {
  const [x, y] = pt
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd
  const dx = x2 - x1
  const dy = y2 - y1
  const n = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1)
  const d = Math.sqrt(dy * dy + dx * dx)
  return d === 0 ? 0 : n / d
}

function rdp(points, epsilon) {
  if (points.length < 3) return points
  let maxDist = 0
  let maxIdx = 0
  const end = points.length - 1
  for (let i = 1; i < end; i++) {
    const d = perpendicularDist(points[i], points[0], points[end])
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, maxIdx + 1), epsilon)
    const right = rdp(points.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [points[0], points[end]]
}

// Group features by corporation name (merge multipolygon wards into one hull)
const corps = {}
for (const feature of geojson.features) {
  const name = feature.properties.NewCorp || 'Unknown'
  if (!corps[name]) corps[name] = []
  const geom = feature.geometry
  const rings = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat()
  for (const ring of rings) {
    corps[name].push(...ring.map(([lng, lat]) => project(lng, lat)))
  }
}

// For each corp compute convex hull to get a clean boundary
function cross(O, A, B) {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0])
}
function convexHull(points) {
  const n = points.length
  if (n < 3) return points
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0)
      lower.pop()
    lower.push(p)
  }
  const upper = []
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0)
      upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

const CORP_COLORS = {
  Central:      { fill: '#ccfbf1', stroke: '#0f766e' },
  East:         { fill: '#d1fae5', stroke: '#065f46' },
  West:         { fill: '#cffafe', stroke: '#0e7490' },
  South:        { fill: '#fef3c7', stroke: '#92400e' },
  'Yelahanka':  { fill: '#ede9fe', stroke: '#5b21b6' },
  // fallback
  Unknown:      { fill: '#e5e7eb', stroke: '#6b7280' },
}

const results = []
for (const [name, pts] of Object.entries(corps)) {
  const hull = convexHull(pts)
  const simplified = rdp(hull, 1.5)
  const d = simplified.map(([x, y], i) =>
    `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  ).join(' ') + ' Z'

  // Centroid for label
  const cx = (simplified.reduce((s, p) => s + p[0], 0) / simplified.length).toFixed(1)
  const cy = (simplified.reduce((s, p) => s + p[1], 0) / simplified.length).toFixed(1)

  const colors = CORP_COLORS[name] || CORP_COLORS.Unknown
  results.push({ name, d, cx, cy, ...colors })
  console.log(`\n// ${name}`)
  console.log(`{ name: '${name}', cx: ${cx}, cy: ${cy},`)
  console.log(`  fill: '${colors.fill}', stroke: '${colors.stroke}',`)
  console.log(`  d: '${d}' },`)
}
