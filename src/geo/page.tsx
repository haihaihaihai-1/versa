import { useState } from 'react'
import { haversineDistance, vincentyDistance, bearing, midpoint, destinationPoint, boundingBox, pointInPolygon, encodeGeohash, decodeGeohash, GeoIndex, Geofence, GeofenceManager } from './index'

const TABS = ['Distance', 'Bearing/Midpoint', 'Geohash', 'Index', 'Search', 'Geofence'] as const
type Tab = typeof TABS[number]

export default function GeoPage() {
  const [tab, setTab] = useState<Tab>('Distance')
  const [lat1, setLat1] = useState('40.7128')
  const [lon1, setLon1] = useState('-74.0060')
  const [lat2, setLat2] = useState('34.0522')
  const [lon2, setLon2] = useState('-118.2437')
  const [out, setOut] = useState('')
  const [index] = useState(() => new GeoIndex())
  const [fences] = useState(() => new GeofenceManager())

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v61.0 Geo / Location</h1>
      <p className="text-sm text-slate-400">Haversine/Vincenty 距离 · Geohash 编码 · 边界框/多边形 · Geofence · 空间索引</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">lat1</label>
          <input value={lat1} onChange={e => setLat1(e.target.value)} className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">lon1</label>
          <input value={lon1} onChange={e => setLon1(e.target.value)} className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">lat2</label>
          <input value={lat2} onChange={e => setLat2(e.target.value)} className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">lon2</label>
          <input value={lon2} onChange={e => setLon2(e.target.value)} className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
        </div>
      </div>

      {tab === 'Distance' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(`Haversine: ${(haversineDistance({ lat: +lat1, lon: +lon1 }, { lat: +lat2, lon: +lon2 }) / 1000).toFixed(2)} km`)} className="px-3 py-1.5 bg-blue-700 rounded text-xs">haversine</button>
            <button onClick={() => setOut(`Vincenty: ${(vincentyDistance({ lat: +lat1, lon: +lon1 }, { lat: +lat2, lon: +lon2 }) / 1000).toFixed(2)} km`)} className="px-3 py-1.5 bg-blue-700 rounded text-xs">vincenty</button>
          </div>
        </div>
      )}

      {tab === 'Bearing/Midpoint' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(`Bearing: ${bearing({ lat: +lat1, lon: +lon1 }, { lat: +lat2, lon: +lon2 }).toFixed(2)}°`)} className="px-3 py-1.5 bg-blue-700 rounded text-xs">bearing</button>
            <button onClick={() => {
              const m = midpoint({ lat: +lat1, lon: +lon1 }, { lat: +lat2, lon: +lon2 })
              setOut(`Midpoint: ${m.lat.toFixed(4)}, ${m.lon.toFixed(4)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">midpoint</button>
            <button onClick={() => {
              const p = destinationPoint({ lat: +lat1, lon: +lon1 }, 100000, 90)
              setOut(`100km East of p1: ${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">destination 100km E</button>
            <button onClick={() => {
              const bb = boundingBox({ lat: +lat1, lon: +lon1 }, 100000)
              setOut(`BBox 100km: ${JSON.stringify(bb, null, 2)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">bbox 100km</button>
            <button onClick={() => {
              const poly: { lat: number; lon: number }[] = [{ lat: 0, lon: 0 }, { lat: 0, lon: 10 }, { lat: 10, lon: 10 }, { lat: 10, lon: 0 }]
              const inside = pointInPolygon({ lat: +lat1, lon: +lon1 }, poly)
              setOut(`Point in (0,0)-(10,10) square: ${inside}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">in polygon?</button>
          </div>
        </div>
      )}

      {tab === 'Geohash' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const gh = encodeGeohash({ lat: +lat1, lon: +lon1 }, 9)
              const dec = decodeGeohash(gh)
              setOut(`Geohash: ${gh}\nDecoded center: ${dec.center.lat.toFixed(4)}, ${dec.center.lon.toFixed(4)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">encode + decode</button>
            <button onClick={() => {
              const gh = encodeGeohash({ lat: +lat1, lon: +lon1 }, 6)
              setOut(`Geohash(6): ${gh}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">encode(6)</button>
            <button onClick={() => {
              const dec = decodeGeohash('u4pruydqqvj')
              setOut(`Decode u4pruydqqvj: center=${dec.center.lat.toFixed(4)},${dec.center.lon.toFixed(4)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">decode fixed</button>
          </div>
        </div>
      )}

      {tab === 'Index' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              index.add({ id: 'a', name: 'NYC', lat: 40.7128, lon: -74.0060 })
              index.add({ id: 'b', name: 'LA', lat: 34.0522, lon: -118.2437 })
              index.add({ id: 'c', name: 'Chicago', lat: 41.8781, lon: -87.6298 })
              setOut(`Added 3 places. Size: ${index.size()}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add 3 cities</button>
            <button onClick={() => setOut('List: ' + JSON.stringify(index.list().map(p => p.name)))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list</button>
            <button onClick={() => setOut('get a: ' + JSON.stringify(index.get('a')))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">get(a)</button>
            <button onClick={() => { index.remove('a'); setOut('removed a') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">remove(a)</button>
          </div>
        </div>
      )}

      {tab === 'Search' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const r = index.within({ lat: 40, lon: -100 }, 1500000)
              setOut(`within 1500km: ${r.map(p => p.name + '@' + p.lat.toFixed(1) + ',' + p.lon.toFixed(1)).join(', ')}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">within 1500km of (40,-100)</button>
            <button onClick={() => {
              const r = index.nearest({ lat: 40, lon: -100 }, 2)
              setOut(`nearest 2: ${r.map(p => p.name).join(', ')}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">nearest 2</button>
          </div>
        </div>
      )}

      {tab === 'Geofence' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              fences.add(new Geofence('home', { type: 'circle', center: { lat: 40.7128, lon: -74.0060 }, radius: 50000 }))
              fences.add(new Geofence('west-coast', { type: 'polygon', points: [{ lat: 32, lon: -125 }, { lat: 32, lon: -115 }, { lat: 48, lon: -115 }, { lat: 48, lon: -125 }] }))
              setOut(`Added 2 fences. Total: ${fences.list().length}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add fences</button>
            <button onClick={() => setOut('matched: ' + JSON.stringify(fences.test({ lat: +lat1, lon: +lon1 })))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">test p1</button>
            <button onClick={() => setOut('matched: ' + JSON.stringify(fences.test({ lat: +lat2, lon: +lon2 })))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">test p2</button>
            <button onClick={() => setOut('list: ' + fences.list().map(f => f.id).join(', '))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list</button>
            <button onClick={() => { fences.remove('home'); setOut('removed home') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">remove home</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out}</pre>
    </div>
  )
}
