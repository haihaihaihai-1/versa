import { describe, it, expect } from 'vitest'
import { QueryBuilder, Raw, fn, createQueryBuilder, resetDefaultBuilder, getDefaultBuilder } from '../index'

describe('QueryBuilder - SELECT', () => {
  it('basic select', () => {
    const q = new QueryBuilder().select('id', 'name').from('users').toSQL()
    expect(q.sql).toBe('SELECT "id", "name" FROM "users"')
    expect(q.params).toEqual([])
  })
  it('select star', () => {
    const q = new QueryBuilder().select().from('users').toSQL()
    expect(q.sql).toBe('SELECT * FROM "users"')
  })
  it('select distinct', () => {
    const q = new QueryBuilder().select('id').distinct().from('users').toSQL()
    expect(q.sql).toBe('SELECT DISTINCT "id" FROM "users"')
  })
  it('select with table alias', () => {
    const q = new QueryBuilder().select('u.id').from('users', 'u').toSQL()
    expect(q.sql).toBe('SELECT "u"."id" FROM "users" AS "u"')
  })
  it('select with Raw', () => {
    const q = new QueryBuilder().select(new Raw('COUNT(*)')).from('users').toSQL()
    expect(q.sql).toBe('SELECT COUNT(*) FROM "users"')
  })
})

describe('QueryBuilder - WHERE', () => {
  it('where equal', () => {
    const q = new QueryBuilder().select().from('u').where('id', '=', 5).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "id" = ?')
    expect(q.params).toEqual([5])
  })
  it('where string', () => {
    const q = new QueryBuilder().select().from('u').where('name', '=', 'alice').toSQL()
    expect(q.params).toEqual(['alice'])
  })
  it('multiple where (AND)', () => {
    const q = new QueryBuilder().select().from('u').where('a', '=', 1).where('b', '=', 2).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "a" = ? AND "b" = ?')
    expect(q.params).toEqual([1, 2])
  })
  it('orWhere', () => {
    const q = new QueryBuilder().select().from('u').where('a', '=', 1).orWhere('b', '=', 2).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "a" = ? OR "b" = ?')
  })
  it('whereRaw', () => {
    const q = new QueryBuilder().select().from('u').whereRaw('a > ?', [10]).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE a > ?')
  })
  it('whereIn', () => {
    const q = new QueryBuilder().select().from('u').whereIn('id', [1, 2, 3]).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "id" IN (?,?,?)')
    expect(q.params).toEqual([1, 2, 3])
  })
  it('whereIn empty', () => {
    const q = new QueryBuilder().select().from('u').whereIn('id', []).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE 1=0')
  })
  it('whereNull', () => {
    const q = new QueryBuilder().select().from('u').whereNull('email').toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "email" IS NULL')
  })
  it('whereNotNull', () => {
    const q = new QueryBuilder().select().from('u').whereNotNull('email').toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "email" IS NOT NULL')
  })
  it('whereBetween', () => {
    const q = new QueryBuilder().select().from('u').whereBetween('age', 18, 30).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "age" BETWEEN ? AND ?')
    expect(q.params).toEqual([18, 30])
  })
  it('where with Raw', () => {
    const q = new QueryBuilder().select().from('u').where('id', '=', new Raw('NULL')).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "id" = NULL')
  })
  it('where with boolean', () => {
    const q = new QueryBuilder().select().from('u').where('active', '=', true).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "active" = ?')
    expect(q.params).toEqual([true])
  })
  it('where with null', () => {
    const q = new QueryBuilder().select().from('u').where('x', '=', null).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "x" = NULL')
  })
})

describe('QueryBuilder - JOIN', () => {
  it('inner join', () => {
    const q = new QueryBuilder().select().from('u').join('p', 'u.id = p.user_id').toSQL()
    expect(q.sql).toContain('INNER JOIN "p" ON u.id = p.user_id')
  })
  it('left join', () => {
    const q = new QueryBuilder().select().from('u').leftJoin('p', 'u.id = p.user_id').toSQL()
    expect(q.sql).toContain('LEFT JOIN "p" ON')
  })
  it('right join', () => {
    const q = new QueryBuilder().select().from('u').rightJoin('p', 'u.id = p.user_id').toSQL()
    expect(q.sql).toContain('RIGHT JOIN')
  })
  it('full join', () => {
    const q = new QueryBuilder().select().from('u').fullJoin('p', 'u.id = p.user_id').toSQL()
    expect(q.sql).toContain('FULL JOIN')
  })
  it('cross join', () => {
    const q = new QueryBuilder().select().from('u').crossJoin('p').toSQL()
    expect(q.sql).toContain('CROSS JOIN "p" ON 1=1')
  })
  it('multiple joins', () => {
    const q = new QueryBuilder().select().from('u').leftJoin('p', 'u.id = p.user_id').innerJoin('c', 'p.id = c.post_id').toSQL()
    expect(q.sql.match(/JOIN/g)).toHaveLength(2)
  })
})

describe('QueryBuilder - GROUP/ORDER/LIMIT', () => {
  it('groupBy', () => {
    const q = new QueryBuilder().select('dept').from('u').groupBy('dept').toSQL()
    expect(q.sql).toBe('SELECT "dept" FROM "u" GROUP BY "dept"')
  })
  it('groupBy multi', () => {
    const q = new QueryBuilder().select().from('u').groupBy('dept', 'team').toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" GROUP BY "dept", "team"')
  })
  it('having', () => {
    const q = new QueryBuilder().select('dept', fn.count()).from('u').groupBy('dept').having('id', '>', 5).toSQL()
    expect(q.sql).toContain('HAVING')
  })
  it('orderBy ASC', () => {
    const q = new QueryBuilder().select().from('u').orderBy('id').toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" ORDER BY "id" ASC')
  })
  it('orderBy DESC', () => {
    const q = new QueryBuilder().select().from('u').orderBy('id', 'DESC').toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" ORDER BY "id" DESC')
  })
  it('limit/offset', () => {
    const q = new QueryBuilder().select().from('u').limit(10).offset(20).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" LIMIT 10 OFFSET 20')
  })
  it('multi orderBy', () => {
    const q = new QueryBuilder().select().from('u').orderBy('a').orderBy('b', 'DESC').toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" ORDER BY "a" ASC, "b" DESC')
  })
})

describe('QueryBuilder - INSERT', () => {
  it('basic insert', () => {
    const q = new QueryBuilder().insert('u').values({ name: 'alice', age: 30 }).toSQL()
    expect(q.sql).toBe('INSERT INTO "u" ("name", "age") VALUES (?, ?)')
    expect(q.params).toEqual(['alice', 30])
  })
  it('insert with null', () => {
    const q = new QueryBuilder().insert('u').values({ name: 'a', email: null }).toSQL()
    expect(q.sql).toBe('INSERT INTO "u" ("name", "email") VALUES (?, NULL)')
  })
})

describe('QueryBuilder - UPDATE', () => {
  it('basic update', () => {
    const q = new QueryBuilder().update('u').set({ name: 'bob' }).where('id', '=', 1).toSQL()
    expect(q.sql).toBe('UPDATE "u" SET "name" = ? WHERE "id" = ?')
    expect(q.params).toEqual(['bob', 1])
  })
  it('update multi', () => {
    const q = new QueryBuilder().update('u').set({ a: 1, b: 2 }).where('id', '=', 1).toSQL()
    expect(q.sql).toBe('UPDATE "u" SET "a" = ?, "b" = ? WHERE "id" = ?')
  })
})

describe('QueryBuilder - DELETE', () => {
  it('basic delete', () => {
    const q = new QueryBuilder().delete('u').where('id', '=', 5).toSQL()
    expect(q.sql).toBe('DELETE FROM "u" WHERE "id" = ?')
    expect(q.params).toEqual([5])
  })
  it('delete all', () => {
    const q = new QueryBuilder().delete('u').toSQL()
    expect(q.sql).toBe('DELETE FROM "u"')
  })
})

describe('QueryBuilder - UNION', () => {
  it('union', () => {
    const q1 = new QueryBuilder().select('id').from('a')
    const q2 = new QueryBuilder().select('id').from('b')
    const result = q1.union(q2).toSQL()
    expect(result.sql).toContain('UNION')
  })
  it('union all', () => {
    const q1 = new QueryBuilder().select('id').from('a')
    const q2 = new QueryBuilder().select('id').from('b')
    const result = q1.unionAll(q2).toSQL()
    expect(result.sql).toContain('UNION ALL')
  })
})

describe('QueryBuilder - Dialects', () => {
  it('postgres uses $1', () => {
    const q = new QueryBuilder('postgres').select().from('u').where('id', '=', 1).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "id" = $1')
    expect(q.params).toEqual([1])
  })
  it('mysql uses backticks', () => {
    const q = new QueryBuilder('mysql').select().from('u').where('id', '=', 1).toSQL()
    expect(q.sql).toBe('SELECT * FROM `u` WHERE `id` = ?')
  })
  it('sqlite uses double quotes', () => {
    const q = new QueryBuilder('sqlite').select().from('u').where('id', '=', 1).toSQL()
    expect(q.sql).toBe('SELECT * FROM "u" WHERE "id" = ?')
  })
})

describe('QueryBuilder - Clone & utilities', () => {
  it('clone is independent', () => {
    const q = new QueryBuilder().select().from('u').where('id', '=', 1)
    const c = q.clone().where('name', '=', 'a')
    expect(q.toSQL().sql).toBe('SELECT * FROM "u" WHERE "id" = ?')
    expect(c.toSQL().sql).toBe('SELECT * FROM "u" WHERE "id" = ? AND "name" = ?')
  })
  it('toString', () => {
    const q = new QueryBuilder().select().from('u').toString()
    expect(q).toBe('SELECT * FROM "u"')
  })
  it('createQueryBuilder', () => {
    expect(createQueryBuilder()).toBeInstanceOf(QueryBuilder)
  })
  it('getDefaultBuilder singleton', () => {
    resetDefaultBuilder()
    const a = getDefaultBuilder()
    const b = getDefaultBuilder()
    expect(a).toBe(b)
  })
})

describe('fn helpers', () => {
  it('count', () => { expect(fn.count().expr).toBe('COUNT(*)') })
  it('count col', () => { expect(fn.count('id').expr).toBe('COUNT("id")') })
  it('sum', () => { expect(fn.sum('amount').expr).toBe('SUM("amount")') })
  it('avg', () => { expect(fn.avg('age').expr).toBe('AVG("age")') })
  it('min', () => { expect(fn.min('x').expr).toBe('MIN("x")') })
  it('max', () => { expect(fn.max('x').expr).toBe('MAX("x")') })
})
