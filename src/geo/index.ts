/**
 * Versa · Geo / Location Service (v61.0)
 * - Geohash encoding/decoding
 * - Lat/Lon distance (haversine, vincenty)
 * - Bounding box queries
 * - Point-in-polygon
 * - Geofencing
 * - Reverse geocoding stub
 * - Place catalog with spatial index
 * - Radius search
 * - Bearing
 * - Midpoint
 * - Destination point
 */
export interface LatLon { lat: number; lon: number }
export interface BoundingBox { minLat: number; minLon: number; maxLat: number; maxLon: number }
export interface Place extends LatLon { id: string; name: string; tags?: string[] }

const GEOHASH_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz'

export function haversineDistance(a: LatLon, b: LatLon): number {
  const R = 6371000 // meters
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function vincentyDistance(a: LatLon, b: LatLon): number {
  const a_ = 6378137
  const f = 1 / 298.257223563
  const b_ = a_ * (1 - f)
  const L = ((b.lon - a.lon) * Math.PI) / 180
  const U1 = Math.atan((1 - f) * Math.tan((a.lat * Math.PI) / 180))
  const U2 = Math.atan((1 - f) * Math.tan((b.lat * Math.PI) / 180))
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1)
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2)
  let lambda = L, lambdaP = 2 * Math.PI
  let iterLimit = 100
  let sinLambda = 0, cosLambda = 0, sinSigma = 0, cosSigma = 0, sigma = 0, sinAlpha = 0, cosSqAlpha = 0, cos2SigmaM = 0, C = 0
  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    sinLambda = Math.sin(lambda); cosLambda = Math.cos(lambda)
    sinSigma = Math.sqrt((cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2)
    if (sinSigma === 0) return 0
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda
    sigma = Math.atan2(sinSigma, cosSigma)
    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma
    cosSqAlpha = 1 - sinAlpha ** 2
    cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha
    C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha))
    lambdaP = lambda
    lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)))
  }
  const uSq = cosSqAlpha * ((a_ * a_ - b_ * b_) / (b_ * b_))
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)))
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)))
  const deltaSigma = B * sinSigma * (cos2SigmaM + (B / 4) * (cosSigma * (-1 + 2 * cos2SigmaM ** 2) - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)))
  return b_ * A * (sigma - deltaSigma)
}

export function bearing(from: LatLon, to: LatLon): number {
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat * Math.PI) / 180
  const Δλ = ((to.lon - from.lon) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function midpoint(a: LatLon, b: LatLon): LatLon {
  const φ1 = (a.lat * Math.PI) / 180
  const λ1 = (a.lon * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const λ2 = (b.lon * Math.PI) / 180
  const Bx = Math.cos(φ2) * Math.cos(λ2 - λ1)
  const By = Math.cos(φ2) * Math.sin(λ2 - λ1)
  const φm = Math.atan2(Math.sin(φ1) + Math.sin(φ2), Math.sqrt((Math.cos(φ1) + Bx) ** 2 + By ** 2))
  const λm = λ1 + Math.atan2(By, Math.cos(φ1) + Bx)
  return { lat: (φm * 180) / Math.PI, lon: (λm * 180) / Math.PI }
}

export function destinationPoint(from: LatLon, distanceMeters: number, bearingDeg: number): LatLon {
  const R = 6371000
  const δ = distanceMeters / R
  const θ = (bearingDeg * Math.PI) / 180
  const φ1 = (from.lat * Math.PI) / 180
  const λ1 = (from.lon * Math.PI) / 180
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  return { lat: (φ2 * 180) / Math.PI, lon: (λ2 * 180) / Math.PI }
}

export function boundingBox(center: LatLon, radiusMeters: number): BoundingBox {
  const R = 6371000
  const Δφ = (radiusMeters / R) * (180 / Math.PI)
  const Δλ = (radiusMeters / (R * Math.cos((center.lat * Math.PI) / 180))) * (180 / Math.PI)
  return { minLat: center.lat - Δφ, minLon: center.lon - Δλ, maxLat: center.lat + Δφ, maxLon: center.lon + Δλ }
}

export function pointInPolygon(point: LatLon, polygon: LatLon[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.lon, yi = polygon[i]!.lat
    const xj = polygon[j]!.lon, yj = polygon[j]!.lat
    const intersect = ((yi > point.lat) !== (yj > point.lat)) && (point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function encodeGeohash(point: LatLon, precision: number = 9): string {
  let lat = [-90, 90] as [number, number]
  let lon = [-180, 180] as [number, number]
  let even = true
  let bit = 0
  let ch = 0
  let hash = ''
  while (hash.length < precision) {
    if (even) {
      const mid = (lon[0] + lon[1]) / 2
      if (point.lon >= mid) { ch = (ch << 1) | 1; lon = [mid, lon[1]] } else { ch = ch << 1; lon = [lon[0], mid] }
    } else {
      const mid = (lat[0] + lat[1]) / 2
      if (point.lat >= mid) { ch = (ch << 1) | 1; lat = [mid, lat[1]] } else { ch = ch << 1; lat = [lat[0], mid] }
    }
    even = !even
    if (++bit === 5) { hash += GEOHASH_ALPHABET[ch]; bit = 0; ch = 0 }
  }
  return hash
}

export function decodeGeohash(hash: string): { center: LatLon; bbox: BoundingBox } {
  let lat = [-90, 90] as [number, number]
  let lon = [-180, 180] as [number, number]
  let even = true
  for (const c of hash) {
    const cd = GEOHASH_ALPHABET.indexOf(c)
    for (let n = 4; n >= 0; n--) {
      const bit = (cd >> n) & 1
      if (even) {
        const mid = (lon[0] + lon[1]) / 2
        if (bit === 1) lon = [mid, lon[1]]; else lon = [lon[0], mid]
      } else {
        const mid = (lat[0] + lat[1]) / 2
        if (bit === 1) lat = [mid, lat[1]]; else lat = [lat[0], mid]
      }
      even = !even
    }
  }
  return {
    center: { lat: (lat[0] + lat[1]) / 2, lon: (lon[0] + lon[1]) / 2 },
    bbox: { minLat: lat[0], minLon: lon[0], maxLat: lat[1], maxLon: lon[1] }
  }
}

export class GeoIndex {
  private places = new Map<string, Place>()
  private byGeohash = new Map<string, Set<string>>()

  add(place: Place): void {
    this.places.set(place.id, place)
    const gh = encodeGeohash(place, 6)
    if (!this.byGeohash.has(gh)) this.byGeohash.set(gh, new Set())
    this.byGeohash.get(gh)!.add(place.id)
  }
  remove(id: string): boolean {
    const p = this.places.get(id); if (!p) return false
    const gh = encodeGeohash(p, 6)
    this.byGeohash.get(gh)?.delete(id)
    return this.places.delete(id)
  }
  get(id: string): Place | undefined { return this.places.get(id) }
  size(): number { return this.places.size }
  list(): Place[] { return [...this.places.values()] }

  within(center: LatLon, radiusMeters: number): Place[] {
    const bb = boundingBox(center, radiusMeters)
    const candidates = new Set<string>()
    const cgh = encodeGeohash(center, 5)
    for (const [gh, ids] of this.byGeohash) {
      const dec = decodeGeohash(gh)
      if (dec.bbox.maxLat < bb.minLat || dec.bbox.minLat > bb.maxLat) continue
      if (dec.bbox.maxLon < bb.minLon || dec.bbox.minLon > bb.maxLon) continue
      for (const id of ids) candidates.add(id)
    }
    // also include neighbors for safety
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue
        const lat = center.lat + dy * 0.05
        const lon = center.lon + dx * 0.05
        const gh = encodeGeohash({ lat, lon }, 5)
        const ids = this.byGeohash.get(gh); if (ids) for (const id of ids) candidates.add(id)
      }
    }
    const out: Place[] = []
    for (const id of candidates) {
      const p = this.places.get(id); if (!p) continue
      if (haversineDistance(center, p) <= radiusMeters) out.push(p)
    }
    return out
  }

  nearest(point: LatLon, count: number = 1): Place[] {
    const all = this.list()
    all.sort((a, b) => haversineDistance(point, a) - haversineDistance(point, b))
    return all.slice(0, count)
  }
}

export class Geofence {
  id: string
  shape: { type: 'circle'; center: LatLon; radius: number } | { type: 'polygon'; points: LatLon[] }
  constructor(id: string, shape: Geofence['shape']) { this.id = id; this.shape = shape }
  contains(point: LatLon): boolean {
    if (this.shape.type === 'circle') return haversineDistance(point, this.shape.center) <= this.shape.radius
    return pointInPolygon(point, this.shape.points)
  }
}

export class GeofenceManager {
  private fences = new Map<string, Geofence>()
  add(f: Geofence): void { this.fences.set(f.id, f) }
  remove(id: string): boolean { return this.fences.delete(id) }
  get(id: string): Geofence | undefined { return this.fences.get(id) }
  list(): Geofence[] { return [...this.fences.values()] }
  test(point: LatLon): string[] {
    const out: string[] = []
    for (const f of this.fences.values()) if (f.contains(point)) out.push(f.id)
    return out
  }
}

let _geo: GeoIndex | null = null
let _fence: GeofenceManager | null = null
export function getGeoIndex(): GeoIndex { if (!_geo) _geo = new GeoIndex(); return _geo }
export function getGeofenceManager(): GeofenceManager { if (!_fence) _fence = new GeofenceManager(); return _fence }
export function resetGeo(): void { _geo = null; _fence = null }
export { GeoIndex as default }
