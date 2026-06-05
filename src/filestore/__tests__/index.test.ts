import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectStore, FileStorage, type LifecycleRule, type BucketPolicy } from '../index'

const txt = (s: string) => new TextEncoder().encode(s)
const dec = (u: Uint8Array) => new TextDecoder().decode(u)

describe('ObjectStore - buckets', () => {
  let s: ObjectStore
  beforeEach(() => { s = new ObjectStore() })

  it('create and list', () => {
    s.createBucket('a', 'alice')
    s.createBucket('b', 'bob')
    expect(s.listBuckets().sort()).toEqual(['a', 'b'])
  })

  it('create duplicate throws', () => {
    s.createBucket('a', 'alice')
    expect(() => s.createBucket('a', 'alice')).toThrow()
  })

  it('delete empty bucket', () => {
    s.createBucket('a', 'alice')
    s.deleteBucket('a')
    expect(s.bucketExists('a')).toBe(false)
  })

  it('delete non-empty bucket throws', () => {
    s.createBucket('a', 'alice')
    s.putText('a', 'k', 'v', 'alice')
    expect(() => s.deleteBucket('a')).toThrow(/not empty/)
  })

  it('bucketExists', () => {
    expect(s.bucketExists('x')).toBe(false)
    s.createBucket('x', 'alice')
    expect(s.bucketExists('x')).toBe(true)
  })
})

describe('ObjectStore - put/get', () => {
  let s: ObjectStore
  beforeEach(() => { s = new ObjectStore(); s.createBucket('b', 'alice') })

  it('roundtrip text', () => {
    s.putText('b', 'hello.txt', 'world', 'alice', { contentType: 'text/plain' })
    const got = s.getObject('b', 'hello.txt')
    expect(dec(got.data)).toBe('world')
    expect(got.meta.contentType).toBe('text/plain')
    expect(got.meta.size).toBe(5)
    expect(got.meta.etag).toMatch(/^"[0-9a-f]+-"$/)
  })

  it('get missing throws', () => {
    expect(() => s.getObject('b', 'missing')).toThrow(/not found/)
  })

  it('head returns meta or null', () => {
    expect(s.headObject('b', 'missing')).toBeNull()
    s.putText('b', 'k', 'v', 'alice')
    const h = s.headObject('b', 'k')
    expect(h).not.toBeNull()
    expect(h!.key).toBe('k')
  })

  it('delete returns true/false', () => {
    expect(s.deleteObject('b', 'k')).toBe(false)
    s.putText('b', 'k', 'v', 'alice')
    expect(s.deleteObject('b', 'k')).toBe(true)
    expect(s.headObject('b', 'k')).toBeNull()
  })

  it('list with prefix', () => {
    s.putText('b', 'a/1', '1', 'alice')
    s.putText('b', 'a/2', '2', 'alice')
    s.putText('b', 'b/1', '1', 'alice')
    const list = s.listObjects('b', 'a/')
    expect(list).toHaveLength(2)
  })

  it('objectCount and totalSize', () => {
    s.putText('b', 'a', 'hello', 'alice')
    s.putText('b', 'b', 'world!', 'alice')
    expect(s.objectCount('b')).toBe(2)
    expect(s.totalSize('b')).toBe(11)
  })

  it('versions are tracked', () => {
    s.putText('b', 'k', 'v1', 'alice')
    s.putText('b', 'k', 'v2', 'alice')
    const versions = s.listVersions('b', 'k')
    expect(versions).toHaveLength(2)
    expect(versions[0].versionId).not.toBe(versions[1].versionId)
  })

  it('custom metadata roundtrips', () => {
    s.putText('b', 'k', 'v', 'alice', { metadata: { 'x-amz-meta-foo': 'bar' } })
    const got = s.getObject('b', 'k')
    expect(got.meta.metadata['x-amz-meta-foo']).toBe('bar')
  })
})

describe('ObjectStore - multipart', () => {
  let s: ObjectStore
  beforeEach(() => { s = new ObjectStore(); s.createBucket('b', 'alice') })

  it('initiate returns uploadId', () => {
    const u = s.initiateMultipart('b', 'big.bin', 'alice')
    expect(u.uploadId).toMatch(/^up-/)
    expect(u.completed).toBe(false)
  })

  it('upload part and list parts', () => {
    const u = s.initiateMultipart('b', 'big.bin', 'alice')
    s.uploadPart(u.uploadId, 1, txt('part1'))
    s.uploadPart(u.uploadId, 2, txt('part2'))
    const parts = s.listParts(u.uploadId)
    expect(parts).toHaveLength(2)
    expect(parts[0].partNumber).toBe(1)
    expect(parts[1].partNumber).toBe(2)
  })

  it('complete merges parts into object', () => {
    const u = s.initiateMultipart('b', 'big.bin', 'alice')
    s.uploadPart(u.uploadId, 1, txt('AAAA'))
    s.uploadPart(u.uploadId, 2, txt('BBBB'))
    const meta = s.completeMultipart(u.uploadId, 'alice')
    expect(meta.size).toBe(8)
    expect(s.headObject('b', 'big.bin')).not.toBeNull()
  })

  it('complete with no parts throws', () => {
    const u = s.initiateMultipart('b', 'big.bin', 'alice')
    expect(() => s.completeMultipart(u.uploadId, 'alice')).toThrow(/No parts/)
  })

  it('complete twice throws', () => {
    const u = s.initiateMultipart('b', 'big.bin', 'alice')
    s.uploadPart(u.uploadId, 1, txt('x'))
    s.completeMultipart(u.uploadId, 'alice')
    expect(() => s.completeMultipart(u.uploadId, 'alice')).toThrow(/already completed/)
  })

  it('abort removes upload', () => {
    const u = s.initiateMultipart('b', 'k', 'alice')
    s.uploadPart(u.uploadId, 1, txt('x'))
    s.abortMultipart(u.uploadId)
    expect(s.getUpload(u.uploadId)).toBeNull()
  })

  it('upload part with invalid number throws', () => {
    const u = s.initiateMultipart('b', 'k', 'alice')
    expect(() => s.uploadPart(u.uploadId, 0, txt('x'))).toThrow(/out of range/)
    expect(() => s.uploadPart(u.uploadId, 10001, txt('x'))).toThrow(/out of range/)
  })

  it('upload to missing uploadId throws', () => {
    expect(() => s.uploadPart('missing', 1, txt('x'))).toThrow(/not found/)
  })

  it('parts are ordered by partNumber on complete', () => {
    const u = s.initiateMultipart('b', 'k', 'alice')
    s.uploadPart(u.uploadId, 3, txt('CCC'))
    s.uploadPart(u.uploadId, 1, txt('AAA'))
    s.uploadPart(u.uploadId, 2, txt('BBB'))
    const parts = s.listParts(u.uploadId)
    expect(parts.map(p => p.partNumber)).toEqual([1, 2, 3])
  })
})

describe('ObjectStore - policy / ACL', () => {
  let s: ObjectStore
  beforeEach(() => { s = new ObjectStore(); s.createBucket('b', 'alice') })

  it('default allows all when no policy', () => {
    expect(s.checkPermission('b', 'k', 's3:GetObject', 'anyone')).toBe(true)
  })

  it('explicit allow works', () => {
    const pol: BucketPolicy = {
      bucket: 'b', version: '2012-10-17',
      statements: [{
        sid: 'allow-bob', effect: 'Allow',
        principal: 'bob', actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::b/*'],
      }],
    }
    s.setPolicy('b', pol)
    expect(s.checkPermission('b', 'k', 's3:GetObject', 'bob')).toBe(true)
    expect(s.checkPermission('b', 'k', 's3:GetObject', 'eve')).toBe(true) // default allow
  })

  it('explicit deny blocks', () => {
    const pol: BucketPolicy = {
      bucket: 'b', version: '2012-10-17',
      statements: [{
        sid: 'deny-eve', effect: 'Deny',
        principal: 'eve', actions: ['s3:*'],
        resources: ['arn:aws:s3:::b/*'],
      }],
    }
    s.setPolicy('b', pol)
    expect(s.checkPermission('b', 'k', 's3:GetObject', 'eve')).toBe(false)
    expect(s.checkPermission('b', 'k', 's3:GetObject', 'alice')).toBe(true)
  })

  it('wildcard resource matches prefix', () => {
    const pol: BucketPolicy = {
      bucket: 'b', version: '2012-10-17',
      statements: [{
        sid: 'p', effect: 'Deny',
        principal: '*', actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::b/private/*'],
      }],
    }
    s.setPolicy('b', pol)
    expect(s.checkPermission('b', 'public/k', 's3:GetObject', 'x')).toBe(true)
    expect(s.checkPermission('b', 'private/k', 's3:GetObject', 'x')).toBe(false)
  })

  it('wildcard principal matches all', () => {
    const pol: BucketPolicy = {
      bucket: 'b', version: '2012-10-17',
      statements: [{ sid: 'p', effect: 'Deny', principal: '*', actions: ['s3:DeleteObject'], resources: ['*'] }],
    }
    s.setPolicy('b', pol)
    expect(s.checkPermission('b', 'k', 's3:DeleteObject', 'eve')).toBe(false)
  })

  it('wildcard actions match anything', () => {
    const pol: BucketPolicy = {
      bucket: 'b', version: '2012-10-17',
      statements: [{ sid: 'p', effect: 'Deny', principal: 'eve', actions: ['*'], resources: ['*'] }],
    }
    s.setPolicy('b', pol)
    expect(s.checkPermission('b', 'k', 's3:GetObject', 'eve')).toBe(false)
    expect(s.checkPermission('b', 'k', 's3:PutObject', 'eve')).toBe(false)
  })

  it('getPolicy returns copy', () => {
    const pol: BucketPolicy = { bucket: 'b', version: '2012-10-17', statements: [] }
    s.setPolicy('b', pol)
    const p = s.getPolicy('b')
    expect(p).not.toBeNull()
    p!.statements.push({ sid: 'x', effect: 'Allow', principal: 'a', actions: ['x'], resources: ['x'] })
    // original should not be mutated
    expect(s.getPolicy('b')!.statements).toHaveLength(0)
  })
})

describe('ObjectStore - lifecycle', () => {
  let s: ObjectStore
  beforeEach(() => { s = new ObjectStore(); s.createBucket('b', 'alice') })

  it('set and get lifecycle', () => {
    const rules: LifecycleRule[] = [{ id: 'r1', prefix: 'tmp/', expirationDays: 7, enabled: true }]
    s.setLifecycle('b', rules)
    expect(s.getLifecycle('b')).toHaveLength(1)
  })

  it('expire old objects', () => {
    s.putText('b', 'tmp/k', 'v', 'alice')
    s.setLastModifiedForTesting('b', 'tmp/k', Date.now() - 8 * 86_400_000)
    s.setLifecycle('b', [{ id: 'r1', prefix: 'tmp/', expirationDays: 7, enabled: true }])
    const result = s.runLifecycle('b')
    expect(result.deleted).toContain('tmp/k')
    expect(s.headObject('b', 'tmp/k')).toBeNull()
  })

  it('transition to archive', () => {
    s.putText('b', 'old/k', 'v', 'alice')
    s.setLastModifiedForTesting('b', 'old/k', Date.now() - 60 * 86_400_000)
    s.setLifecycle('b', [{ id: 'r', prefix: 'old/', transitionToArchiveDays: 30, enabled: true }])
    const result = s.runLifecycle('b')
    expect(result.transitioned).toContain('old/k')
    expect(s.headObject('b', 'old/k')!.storageClass).toBe('ARCHIVE')
  })

  it('disabled rule does nothing', () => {
    s.putText('b', 'k', 'v', 'alice')
    s.setLifecycle('b', [{ id: 'r', prefix: '', expirationDays: 0, enabled: false }])
    expect(s.runLifecycle('b').deleted).toHaveLength(0)
  })
})

describe('ObjectStore - presigned URLs', () => {
  let s: ObjectStore
  beforeEach(() => { s = new ObjectStore() })

  it('generates URL with method and signature', () => {
    const p = s.generatePresignedUrl({ bucket: 'b', key: 'k', method: 'GET', expiresIn: 60 }, 'secret')
    expect(p.url).toContain('s3://b/k')
    expect(p.method).toBe('GET')
    expect(p.signature).toBeTruthy()
  })

  it('verifies valid URL', () => {
    const p = s.generatePresignedUrl({ bucket: 'b', key: 'k', method: 'GET', expiresIn: 60 }, 'secret')
    expect(s.verifyPresignedUrl(p.url, 'GET', 'secret')).toBe(true)
  })

  it('rejects wrong method', () => {
    const p = s.generatePresignedUrl({ bucket: 'b', key: 'k', method: 'GET', expiresIn: 60 }, 'secret')
    expect(s.verifyPresignedUrl(p.url, 'PUT', 'secret')).toBe(false)
  })

  it('rejects wrong secret', () => {
    const p = s.generatePresignedUrl({ bucket: 'b', key: 'k', method: 'GET', expiresIn: 60 }, 'secret1')
    expect(s.verifyPresignedUrl(p.url, 'GET', 'secret2')).toBe(false)
  })

  it('rejects expired URL', () => {
    const p = s.generatePresignedUrl({ bucket: 'b', key: 'k', method: 'GET', expiresIn: 0 }, 'secret')
    // expiresIn=0 means expires immediately; tiny wait to ensure expired
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(s.verifyPresignedUrl(p.url, 'GET', 'secret')).toBe(false)
        resolve()
      }, 10)
    })
  })

  it('rejects malformed URL', () => {
    expect(s.verifyPresignedUrl('not-a-url', 'GET', 's')).toBe(false)
  })
})

describe('ObjectStore - stats', () => {
  it('reports totals', () => {
    const s = new ObjectStore()
    s.createBucket('a', 'x')
    s.createBucket('b', 'x')
    s.putText('a', 'k1', 'hello', 'x')
    s.putText('a', 'k2', 'world', 'x')
    s.putText('b', 'k3', '!', 'x')
    const st = s.stats()
    expect(st.buckets).toBe(2)
    expect(st.totalObjects).toBe(3)
    expect(st.totalSize).toBe(11)
  })
})

describe('FileStorage facade', () => {
  it('putText and getText', () => {
    const fs = new FileStorage()
    fs.store.createBucket('b', 'alice')
    fs.putText('b', 'k', 'hello world', 'alice', { contentType: 'text/plain' })
    expect(fs.getText('b', 'k')).toBe('hello world')
  })

  it('uploadMultipart convenience', () => {
    const fs = new FileStorage()
    fs.store.createBucket('b', 'alice')
    const chunks = [txt('chunk1-'), txt('chunk2-'), txt('chunk3')]
    const meta = fs.uploadMultipart('b', 'k', 'alice', chunks)
    expect(meta.size).toBe(20)
  })
})
