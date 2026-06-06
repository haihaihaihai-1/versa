import { describe, it, expect, beforeEach } from 'vitest'
import { TimeSeries, TimeSeriesDB, getTimeSeriesDB, resetTimeSeriesDB } from '../index'

describe('TimeSeries - basics', () => {
  let ts: TimeSeries
  beforeEach(() => { ts = new TimeSeries('temp', { room: 'lab' }) })

  it('insert and size', () => {
    ts.insert({ timestamp: 1, value: 10 })
    expect(ts.size()).toBe(1)
  })
  it('insert maintains sorted order', () => {
    ts.insert({ timestamp: 3, value: 30 })
    ts.insert({ timestamp: 1, value: 10 })
    ts.insert({ timestamp: 2, value: 20 })
    expect(ts.first()?.value).toBe(10)
    expect(ts.last()?.value).toBe(30)
  })
  it('insertMany', () => {
    ts.insertMany([{ timestamp: 1, value: 1 }, { timestamp: 2, value: 2 }, { timestamp: 3, value: 3 }])
    expect(ts.size()).toBe(3)
  })
  it('range', () => {
    ts.insertMany([{ timestamp: 1, value: 1 }, { timestamp: 2, value: 2 }, { timestamp: 3, value: 3 }])
    expect(ts.range(1, 2)).toHaveLength(2)
  })
  it('first and last', () => {
    ts.insertMany([{ timestamp: 1, value: 100 }, { timestamp: 2, value: 200 }])
    expect(ts.first()?.value).toBe(100)
    expect(ts.last()?.value).toBe(200)
  })
  it('getTags', () => {
    expect(ts.getTags()).toEqual({ room: 'lab' })
  })
  it('name_', () => {
    expect(ts.name_()).toBe('temp')
  })
})

describe('TimeSeries - downsample', () => {
  let ts: TimeSeries
  beforeEach(() => {
    ts = new TimeSeries('s')
    for (let i = 0; i < 10; i++) ts.insert({ timestamp: i * 100, value: i })
  })
  it('avg', () => {
    const ds = ts.downsample(500, 'avg')
    expect(ds).toHaveLength(2)
    expect(ds[0]?.value).toBe(2) // avg of 0,1,2,3,4
  })
  it('sum', () => {
    const ds = ts.downsample(1000, 'sum')
    expect(ds).toHaveLength(1)
    expect(ds[0]?.value).toBe(45)
  })
  it('min', () => {
    const ds = ts.downsample(1000, 'min')
    expect(ds[0]?.value).toBe(0)
  })
  it('max', () => {
    const ds = ts.downsample(1000, 'max')
    expect(ds[0]?.value).toBe(9)
  })
  it('count', () => {
    const ds = ts.downsample(500, 'count')
    expect(ds[0]?.value).toBe(5)
  })
  it('first', () => {
    const ds = ts.downsample(1000, 'first')
    expect(ds[0]?.value).toBe(0)
  })
  it('last', () => {
    const ds = ts.downsample(1000, 'last')
    expect(ds[0]?.value).toBe(9)
  })
})

describe('TimeSeries - aggregate', () => {
  let ts: TimeSeries
  beforeEach(() => {
    ts = new TimeSeries('s')
    ts.insertMany([{ timestamp: 1, value: 10 }, { timestamp: 2, value: 20 }, { timestamp: 3, value: 30 }])
  })
  it('avg', () => { expect(ts.aggregate(1, 3, 'avg')).toBe(20) })
  it('sum', () => { expect(ts.aggregate(1, 3, 'sum')).toBe(60) })
  it('min', () => { expect(ts.aggregate(1, 3, 'min')).toBe(10) })
  it('max', () => { expect(ts.aggregate(1, 3, 'max')).toBe(30) })
  it('count', () => { expect(ts.aggregate(1, 3, 'count')).toBe(3) })
  it('first', () => { expect(ts.aggregate(1, 3, 'first')).toBe(10) })
  it('last', () => { expect(ts.aggregate(1, 3, 'last')).toBe(30) })
  it('empty', () => { expect(ts.aggregate(100, 200, 'avg')).toBeNull() })
})

describe('TimeSeries - interpolate', () => {
  it('interpolates', () => {
    const ts = new TimeSeries('s')
    ts.insertMany([{ timestamp: 0, value: 0 }, { timestamp: 10, value: 100 }])
    expect(ts.interpolate(5)).toBe(50)
  })
  it('before first', () => {
    const ts = new TimeSeries('s')
    ts.insertMany([{ timestamp: 0, value: 0 }, { timestamp: 10, value: 100 }])
    expect(ts.interpolate(-5)).toBe(0)
  })
  it('after last', () => {
    const ts = new TimeSeries('s')
    ts.insertMany([{ timestamp: 0, value: 0 }, { timestamp: 10, value: 100 }])
    expect(ts.interpolate(20)).toBe(100)
  })
  it('empty', () => {
    expect(new TimeSeries('s').interpolate(5)).toBeNull()
  })
})

describe('TimeSeriesDB', () => {
  let db: TimeSeriesDB
  beforeEach(() => { db = new TimeSeriesDB() })

  it('createSeries', () => {
    const s = db.createSeries('temp', { room: 'lab' })
    expect(s.size()).toBe(0)
  })
  it('createSeries duplicate throws', () => {
    db.createSeries('temp')
    expect(() => db.createSeries('temp')).toThrow()
  })
  it('dropSeries', () => {
    db.createSeries('temp')
    expect(db.dropSeries('temp')).toBe(true)
  })
  it('getSeries', () => {
    db.createSeries('temp')
    expect(db.getSeries('temp')).toBeDefined()
  })
  it('listSeries', () => {
    db.createSeries('a'); db.createSeries('b')
    expect(db.listSeries()).toHaveLength(2)
  })
  it('findSeries by tag', () => {
    db.createSeries('a', { env: 'prod' })
    db.createSeries('b', { env: 'dev' })
    const r = db.findSeries(t => t.env === 'prod')
    expect(r).toHaveLength(1)
  })
  it('size', () => {
    db.createSeries('a'); db.createSeries('b')
    expect(db.size()).toBe(2)
  })
  it('totalPoints', () => {
    const a = db.createSeries('a')
    a.insert({ timestamp: 1, value: 1 })
    a.insert({ timestamp: 2, value: 2 })
    expect(db.totalPoints()).toBe(2)
  })
  it('clear', () => {
    db.createSeries('a')
    db.clear()
    expect(db.size()).toBe(0)
  })

  it('addContinuousQuery', () => {
    const src = db.createSeries('raw')
    for (let i = 0; i < 100; i++) src.insert({ timestamp: i * 1000, value: i })
    const rollup = db.addContinuousQuery('hourly', 'raw', 5000, 'avg')
    expect(rollup.size()).toBeGreaterThan(0)
  })
  it('refreshContinuousQuery', () => {
    const src = db.createSeries('raw')
    src.insertMany([{ timestamp: 0, value: 0 }, { timestamp: 1000, value: 10 }, { timestamp: 2000, value: 20 }])
    db.addContinuousQuery('r', 'raw', 1000, 'avg')
    db.refreshContinuousQuery('r')
  })
  it('addContinuousQuery no source throws', () => {
    expect(() => db.addContinuousQuery('r', 'missing', 1000, 'avg')).toThrow()
  })

  it('setRetention + applyRetention by maxAgeMs', () => {
    const s = db.createSeries('s')
    s.insert({ timestamp: 1000, value: 1 })
    s.insert({ timestamp: 3000, value: 3 })
    db.setRetention({ maxAgeMs: 2000 })
    const removed = db.applyRetention()
    expect(removed).toBe(1)
  })
  it('setRetention + applyRetention by maxPoints', () => {
    const s = db.createSeries('s')
    for (let i = 0; i < 10; i++) s.insert({ timestamp: i, value: i })
    db.setRetention({ maxPoints: 5 })
    const removed = db.applyRetention()
    expect(removed).toBe(5)
  })
})

describe('singleton', () => {
  beforeEach(() => resetTimeSeriesDB())
  it('singleton', () => {
    expect(getTimeSeriesDB()).toBe(getTimeSeriesDB())
  })
})
