import { describe, it, expect, beforeEach } from 'vitest'
import { haversineDistance, vincentyDistance, bearing, midpoint, destinationPoint, boundingBox, pointInPolygon, encodeGeohash, decodeGeohash, GeoIndex, Geofence, GeofenceManager, getGeoIndex, getGeofenceManager, resetGeo } from '../index'

describe('haversineDistance', () => {
  it('zero distance for same point', () => {
    expect(haversineDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 0 })).toBe(0)
  })
  it('1 degree lat ≈ 111 km', () => {
    const d = haversineDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })
    expect(d).toBeGreaterThan(110000)
    expect(d).toBeLessThan(112000)
  })
  it('NYC to LA ~3935 km', () => {
    const d = haversineDistance({ lat: 40.7128, lon: -74.0060 }, { lat: 34.0522, lon: -118.2437 })
    expect(d / 1000).toBeGreaterThan(3900)
    expect(d / 1000).toBeLessThan(4000)
  })
})

describe('vincentyDistance', () => {
  it('same as haversine approximately', () => {
    const a = { lat: 40, lon: -74 }
    const b = { lat: 34, lon: -118 }
    const v = vincentyDistance(a, b)
    const h = haversineDistance(a, b)
    expect(Math.abs(v - h) / h).toBeLessThan(0.01)
  })
  it('zero for same point', () => {
    expect(vincentyDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 0 })).toBe(0)
  })
})

describe('bearing', () => {
  it('due north', () => {
    const b = bearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })
    expect(b).toBeCloseTo(0, 1)
  })
  it('due east', () => {
    const b = bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })
    expect(b).toBeCloseTo(90, 1)
  })
  it('due south', () => {
    const b = bearing({ lat: 0, lon: 0 }, { lat: -1, lon: 0 })
    expect(b).toBeCloseTo(180, 1)
  })
  it('due west', () => {
    const b = bearing({ lat: 0, lon: 0 }, { lat: 0, lon: -1 })
    expect(b).toBeCloseTo(270, 1)
  })
})

describe('midpoint', () => {
  it('midpoint of equator span', () => {
    const m = midpoint({ lat: 0, lon: 0 }, { lat: 0, lon: 10 })
    expect(m.lon).toBeCloseTo(5, 5)
    expect(m.lat).toBeCloseTo(0, 5)
  })
  it('same point', () => {
    const m = midpoint({ lat: 5, lon: 5 }, { lat: 5, lon: 5 })
    expect(m.lat).toBeCloseTo(5, 5)
    expect(m.lon).toBeCloseTo(5, 5)
  })
})

describe('destinationPoint', () => {
  it('due north 111km', () => {
    const p = destinationPoint({ lat: 0, lon: 0 }, 111000, 0)
    expect(p.lat).toBeCloseTo(1, 1)
  })
})

describe('boundingBox', () => {
  it('around (0,0) 1000km', () => {
    const bb = boundingBox({ lat: 0, lon: 0 }, 1000000)
    expect(bb.minLat).toBeLessThan(0)
    expect(bb.maxLat).toBeGreaterThan(0)
    expect(bb.minLon).toBeLessThan(0)
    expect(bb.maxLon).toBeGreaterThan(0)
  })
})

describe('pointInPolygon', () => {
  const square: { lat: number; lon: number }[] = [
    { lat: 0, lon: 0 }, { lat: 0, lon: 10 }, { lat: 10, lon: 10 }, { lat: 10, lon: 0 }
  ]
  it('point inside', () => {
    expect(pointInPolygon({ lat: 5, lon: 5 }, square)).toBe(true)
  })
  it('point outside', () => {
    expect(pointInPolygon({ lat: 15, lon: 5 }, square)).toBe(false)
  })
  it('corner', () => {
    expect(pointInPolygon({ lat: 0, lon: 0 }, square)).toBe(true)
  })
})

describe('geohash', () => {
  it('encode', () => {
    const gh = encodeGeohash({ lat: 57.64911, lon: 10.40744 }, 11)
    expect(gh).toBe('u4pruydqqvj')
  })
  it('decode round-trip', () => {
    const p = { lat: 40.7128, lon: -74.0060 }
    const gh = encodeGeohash(p, 9)
    const dec = decodeGeohash(gh)
    expect(Math.abs(dec.center.lat - p.lat)).toBeLessThan(0.01)
    expect(Math.abs(dec.center.lon - p.lon)).toBeLessThan(0.01)
  })
  it('precision 1', () => {
    expect(encodeGeohash({ lat: 0, lon: 0 }, 1)).toBe('s')
  })
  it('precision 5', () => {
    expect(encodeGeohash({ lat: 57.64911, lon: 10.40744 }, 5).length).toBe(5)
  })
  it('decode has bbox', () => {
    const dec = decodeGeohash('u4pru')
    expect(dec.bbox.maxLat).toBeGreaterThan(dec.bbox.minLat)
  })
})

describe('GeoIndex', () => {
  let idx: GeoIndex
  beforeEach(() => { idx = new GeoIndex() })
  it('add and get', () => {
    idx.add({ id: 'a', name: 'A', lat: 1, lon: 2 })
    expect(idx.get('a')?.name).toBe('A')
  })
  it('remove', () => {
    idx.add({ id: 'a', name: 'A', lat: 1, lon: 2 })
    expect(idx.remove('a')).toBe(true)
    expect(idx.get('a')).toBeUndefined()
  })
  it('remove non-existent', () => {
    expect(idx.remove('x')).toBe(false)
  })
  it('size', () => {
    idx.add({ id: 'a', name: 'A', lat: 1, lon: 2 })
    idx.add({ id: 'b', name: 'B', lat: 3, lon: 4 })
    expect(idx.size()).toBe(2)
  })
  it('list', () => {
    idx.add({ id: 'a', name: 'A', lat: 1, lon: 2 })
    expect(idx.list()).toHaveLength(1)
  })
  it('within', () => {
    idx.add({ id: 'a', name: 'A', lat: 0, lon: 0 })
    idx.add({ id: 'b', name: 'B', lat: 1, lon: 1 })
    const r = idx.within({ lat: 0, lon: 0 }, 200000)
    expect(r.length).toBeGreaterThanOrEqual(1)
  })
  it('within excludes far', () => {
    idx.add({ id: 'a', name: 'A', lat: 0, lon: 0 })
    idx.add({ id: 'b', name: 'B', lat: 50, lon: 50 })
    const r = idx.within({ lat: 0, lon: 0 }, 10000)
    expect(r).toHaveLength(1)
  })
  it('nearest', () => {
    idx.add({ id: 'a', name: 'A', lat: 0, lon: 0 })
    idx.add({ id: 'b', name: 'B', lat: 0.1, lon: 0.1 })
    const r = idx.nearest({ lat: 0, lon: 0 }, 1)
    expect(r[0]?.id).toBe('a')
  })
  it('nearest k', () => {
    idx.add({ id: 'a', name: 'A', lat: 0, lon: 0 })
    idx.add({ id: 'b', name: 'B', lat: 0.1, lon: 0.1 })
    idx.add({ id: 'c', name: 'C', lat: 0.2, lon: 0.2 })
    const r = idx.nearest({ lat: 0, lon: 0 }, 2)
    expect(r).toHaveLength(2)
  })
})

describe('Geofence', () => {
  it('circle contains', () => {
    const f = new Geofence('f', { type: 'circle', center: { lat: 0, lon: 0 }, radius: 100000 })
    expect(f.contains({ lat: 0, lon: 0 })).toBe(true)
  })
  it('circle rejects', () => {
    const f = new Geofence('f', { type: 'circle', center: { lat: 0, lon: 0 }, radius: 100000 })
    expect(f.contains({ lat: 10, lon: 10 })).toBe(false)
  })
  it('polygon contains', () => {
    const f = new Geofence('f', { type: 'polygon', points: [{ lat: 0, lon: 0 }, { lat: 0, lon: 10 }, { lat: 10, lon: 10 }, { lat: 10, lon: 0 }] })
    expect(f.contains({ lat: 5, lon: 5 })).toBe(true)
  })
})

describe('GeofenceManager', () => {
  let mgr: GeofenceManager
  beforeEach(() => { mgr = new GeofenceManager() })
  it('add and get', () => {
    const f = new Geofence('f', { type: 'circle', center: { lat: 0, lon: 0 }, radius: 1000 })
    mgr.add(f)
    expect(mgr.get('f')).toBe(f)
  })
  it('remove', () => {
    mgr.add(new Geofence('f', { type: 'circle', center: { lat: 0, lon: 0 }, radius: 1000 }))
    expect(mgr.remove('f')).toBe(true)
  })
  it('list', () => {
    mgr.add(new Geofence('a', { type: 'circle', center: { lat: 0, lon: 0 }, radius: 1000 }))
    mgr.add(new Geofence('b', { type: 'circle', center: { lat: 1, lon: 1 }, radius: 1000 }))
    expect(mgr.list()).toHaveLength(2)
  })
  it('test point', () => {
    mgr.add(new Geofence('home', { type: 'circle', center: { lat: 0, lon: 0 }, radius: 1000 }))
    mgr.add(new Geofence('office', { type: 'circle', center: { lat: 50, lon: 50 }, radius: 1000 }))
    const matched = mgr.test({ lat: 0, lon: 0 })
    expect(matched).toContain('home')
    expect(matched).not.toContain('office')
  })
})

describe('singletons', () => {
  beforeEach(() => resetGeo())
  it('getGeoIndex singleton', () => {
    expect(getGeoIndex()).toBe(getGeoIndex())
  })
  it('getGeofenceManager singleton', () => {
    expect(getGeofenceManager()).toBe(getGeofenceManager())
  })
})
