/**
 * Versa · SQL Query Builder (v60.0)
 * - Fluent chainable query builder
 * - SELECT, INSERT, UPDATE, DELETE
 * - WHERE, ORDER BY, GROUP BY, HAVING, LIMIT, OFFSET
 * - JOINs (INNER, LEFT, RIGHT, FULL)
 * - Subqueries
 * - UNION
 * - Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
 * - Parameterized queries
 * - Multiple dialects (standard, postgres, mysql, sqlite)
 * - Raw expressions
 * - Compile to SQL string
 */
export type SqlDialect = 'standard' | 'postgres' | 'mysql' | 'sqlite'
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
export type OrderDirection = 'ASC' | 'DESC'
export type SqlValue = string | number | boolean | Date | null | undefined

export interface CompiledQuery {
  sql: string
  params: SqlValue[]
}

export class Raw {
  constructor(public expr: string) {}
}

function isRaw(v: unknown): v is Raw { return v instanceof Raw }
function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return '`' + name.replace(/`/g, '``') + '`'
  if (dialect === 'sqlite' || dialect === 'postgres' || dialect === 'standard') return '"' + name.replace(/"/g, '""') + '"'
  return name
}
function placeholder(idx: number, dialect: SqlDialect): string {
  if (dialect === 'postgres') return `$${idx}`
  return '?'
}
function valueToSql(v: SqlValue, dialect: SqlDialect, params: SqlValue[]): string {
  if (v === null || v === undefined) return 'NULL'
  if (v instanceof Date) return `'${v.toISOString()}'`
  if (typeof v === 'number' && !isFinite(v)) return v > 0 ? "'+Inf'" : "'-Inf'"
  if (typeof v === 'number' || typeof v === 'boolean') {
    params.push(v)
    return placeholder(params.length, dialect)
  }
  params.push(v)
  return placeholder(params.length, dialect)
}

export class QueryBuilder {
  private _type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT'
  private _distinct = false
  private _columns: (string | Raw)[] = ['*']
  private _table = ''
  private _tableAlias = ''
  private _joins: { type: JoinType; table: string; on: string }[] = []
  private _wheres: { sql: string; params: SqlValue[] } = { sql: '', params: [] }
  private _groupBy: string[] = []
  private _having: { sql: string; params: SqlValue[] } = { sql: '', params: [] }
  private _orderBy: { col: string; dir: OrderDirection }[] = []
  private _limitVal: number | null = null
  private _offsetVal: number | null = null
  private _insertValues: Record<string, SqlValue> = {}
  private _updateValues: Record<string, SqlValue> = {}
  private _unions: { type: 'UNION' | 'UNION ALL'; query: QueryBuilder }[] = []

  constructor(public dialect: SqlDialect = 'standard') {}

  // -------- SELECT --------
  select(...cols: (string | Raw)[]): this { this._type = 'SELECT'; this._columns = cols.length ? cols : ['*']; return this }
  distinct(): this { this._distinct = true; return this }
  from(table: string, alias?: string): this { this._table = table; this._tableAlias = alias ?? ''; return this }
  as(alias: string): this { this._tableAlias = alias; return this }

  // -------- INSERT --------
  insert(table: string): this { this._type = 'INSERT'; this._table = table; return this }
  values(data: Record<string, SqlValue>): this { this._insertValues = data; return this }

  // -------- UPDATE --------
  update(table: string): this { this._type = 'UPDATE'; this._table = table; return this }
  set(data: Record<string, SqlValue>): this { this._updateValues = { ...this._updateValues, ...data }; return this }

  // -------- DELETE --------
  delete(table?: string): this { this._type = 'DELETE'; if (table) this._table = table; return this }

  // -------- WHERE --------
  where(col: string, op: string, val: SqlValue | Raw): this {
    const params: SqlValue[] = []
    let valSql: string
    if (isRaw(val)) valSql = val.expr
    else valSql = valueToSql(val, this.dialect, params)
    const cond = `${quoteIdent(col, this.dialect)} ${op} ${valSql}`
    this._wheres = this.combineWhere(this._wheres, cond, 'AND', params)
    return this
  }
  orWhere(col: string, op: string, val: SqlValue | Raw): this {
    const params: SqlValue[] = []
    let valSql: string
    if (isRaw(val)) valSql = val.expr
    else valSql = valueToSql(val, this.dialect, params)
    const cond = `${quoteIdent(col, this.dialect)} ${op} ${valSql}`
    this._wheres = this.combineWhere(this._wheres, cond, 'OR', params)
    return this
  }
  whereRaw(sql: string, params: SqlValue[] = []): this { this._wheres = this.combineWhere(this._wheres, sql, 'AND', params); return this }
  whereIn(col: string, vals: SqlValue[]): this {
    if (vals.length === 0) { this._wheres = this.combineWhere(this._wheres, '1=0', 'AND', []); return this }
    const params: SqlValue[] = []
    const placeholders = vals.map(v => valueToSql(v, this.dialect, params)).join(',')
    const cond = `${quoteIdent(col, this.dialect)} IN (${placeholders})`
    this._wheres = this.combineWhere(this._wheres, cond, 'AND', params)
    return this
  }
  whereNull(col: string): this { this._wheres = this.combineWhere(this._wheres, `${quoteIdent(col, this.dialect)} IS NULL`, 'AND', []); return this }
  whereNotNull(col: string): this { this._wheres = this.combineWhere(this._wheres, `${quoteIdent(col, this.dialect)} IS NOT NULL`, 'AND', []); return this }
  whereBetween(col: string, lo: SqlValue, hi: SqlValue): this {
    const params: SqlValue[] = []
    const a = valueToSql(lo, this.dialect, params)
    const b = valueToSql(hi, this.dialect, params)
    this._wheres = this.combineWhere(this._wheres, `${quoteIdent(col, this.dialect)} BETWEEN ${a} AND ${b}`, 'AND', params)
    return this
  }
  private combineWhere(curr: { sql: string; params: SqlValue[] }, cond: string, conj: 'AND' | 'OR', params: SqlValue[]): { sql: string; params: SqlValue[] } {
    if (!curr.sql) return { sql: cond, params }
    return { sql: `${curr.sql} ${conj} ${cond}`, params: [...curr.params, ...params] }
  }

  // -------- JOIN --------
  join(table: string, on: string, type: JoinType = 'INNER'): this { this._joins.push({ type, table, on }); return this }
  leftJoin(table: string, on: string): this { this._joins.push({ type: 'LEFT', table, on }); return this }
  innerJoin(table: string, on: string): this { this._joins.push({ type: 'INNER', table, on }); return this }
  rightJoin(table: string, on: string): this { this._joins.push({ type: 'RIGHT', table, on }); return this }
  fullJoin(table: string, on: string): this { this._joins.push({ type: 'FULL', table, on }); return this }
  crossJoin(table: string): this { this._joins.push({ type: 'CROSS', table, on: '1=1' }); return this }

  // -------- GROUP/HAVING --------
  groupBy(...cols: string[]): this { this._groupBy.push(...cols); return this }
  having(col: string, op: string, val: SqlValue | Raw): this {
    const params: SqlValue[] = []
    let valSql: string
    if (isRaw(val)) valSql = val.expr
    else valSql = valueToSql(val, this.dialect, params)
    this._having.sql += (this._having.sql ? ' AND ' : '') + `${quoteIdent(col, this.dialect)} ${op} ${valSql}`
    this._having.params.push(...params)
    return this
  }

  // -------- ORDER/LIMIT --------
  orderBy(col: string, dir: OrderDirection = 'ASC'): this { this._orderBy.push({ col, dir }); return this }
  limit(n: number): this { this._limitVal = n; return this }
  offset(n: number): this { this._offsetVal = n; return this }

  // -------- UNION --------
  union(qb: QueryBuilder): this { this._unions.push({ type: 'UNION', query: qb }); return this }
  unionAll(qb: QueryBuilder): this { this._unions.push({ type: 'UNION ALL', query: qb }); return this }

  // -------- Compile --------
  toSQL(): CompiledQuery {
    const allParams: SqlValue[] = []
    let sql: string
    if (this._type === 'SELECT') sql = this.compileSelect(allParams)
    else if (this._type === 'INSERT') sql = this.compileInsert(allParams)
    else if (this._type === 'UPDATE') sql = this.compileUpdate(allParams)
    else sql = this.compileDelete(allParams)
    // unions
    for (const u of this._unions) {
      const sub = u.query.toSQL()
      sql += ` ${u.type} ${sub.sql}`
      allParams.push(...sub.params)
    }
    return { sql, params: allParams }
  }
  toString(): string { return this.toSQL().sql }

  private compileSelect(params: SqlValue[]): string {
    const cols = this._columns.map(c => isRaw(c) ? c.expr : (c === '*' ? '*' : c.split('.').map(p => quoteIdent(p, this.dialect)).join('.'))).join(', ')
    const distinct = this._distinct ? 'DISTINCT ' : ''
    let sql = `SELECT ${distinct}${cols} FROM ${this.tableSql()}`
    for (const j of this._joins) sql += ` ${j.type} JOIN ${quoteIdent(j.table, this.dialect)} ON ${j.on}`
    if (this._wheres.sql) { sql += ` WHERE ${this._wheres.sql}`; params.push(...this._wheres.params) }
    if (this._groupBy.length) sql += ' GROUP BY ' + this._groupBy.map(c => quoteIdent(c, this.dialect)).join(', ')
    if (this._having.sql) { sql += ` HAVING ${this._having.sql}`; params.push(...this._having.params) }
    if (this._orderBy.length) sql += ' ORDER BY ' + this._orderBy.map(o => `${quoteIdent(o.col, this.dialect)} ${o.dir}`).join(', ')
    if (this._limitVal != null) sql += ` LIMIT ${this._limitVal}`
    if (this._offsetVal != null) sql += ` OFFSET ${this._offsetVal}`
    return sql
  }
  private compileInsert(params: SqlValue[]): string {
    const cols = Object.keys(this._insertValues)
    const placeholders = cols.map(c => valueToSql(this._insertValues[c]!, this.dialect, params))
    return `INSERT INTO ${this.tableSql()} (${cols.map(c => quoteIdent(c, this.dialect)).join(', ')}) VALUES (${placeholders.join(', ')})`
  }
  private compileUpdate(params: SqlValue[]): string {
    const sets: string[] = []
    for (const [k, v] of Object.entries(this._updateValues)) sets.push(`${quoteIdent(k, this.dialect)} = ${valueToSql(v, this.dialect, params)}`)
    let sql = `UPDATE ${this.tableSql()} SET ${sets.join(', ')}`
    if (this._wheres.sql) { sql += ` WHERE ${this._wheres.sql}`; params.push(...this._wheres.params) }
    return sql
  }
  private compileDelete(params: SqlValue[]): string {
    let sql = `DELETE FROM ${this.tableSql()}`
    if (this._wheres.sql) { sql += ` WHERE ${this._wheres.sql}`; params.push(...this._wheres.params) }
    return sql
  }
  private tableSql(): string {
    let s = quoteIdent(this._table, this.dialect)
    if (this._tableAlias) s += ' AS ' + quoteIdent(this._tableAlias, this.dialect)
    return s
  }

  // -------- Cloning --------
  clone(): QueryBuilder {
    const c = new QueryBuilder(this.dialect)
    c._type = this._type; c._distinct = this._distinct; c._columns = [...this._columns]
    c._table = this._table; c._tableAlias = this._tableAlias
    c._joins = [...this._joins]
    c._wheres = { sql: this._wheres.sql, params: [...this._wheres.params] }
    c._groupBy = [...this._groupBy]
    c._having = { sql: this._having.sql, params: [...this._having.params] }
    c._orderBy = [...this._orderBy]
    c._limitVal = this._limitVal; c._offsetVal = this._offsetVal
    c._insertValues = { ...this._insertValues }; c._updateValues = { ...this._updateValues }
    c._unions = this._unions.map(u => ({ type: u.type, query: u.query.clone() }))
    return c
  }
}

// -------- Aggregates helpers --------
export const fn = {
  count: (col: string = '*') => new Raw(`COUNT(${col === '*' ? '*' : quoteIdent(col, 'standard')})`),
  sum: (col: string) => new Raw(`SUM(${quoteIdent(col, 'standard')})`),
  avg: (col: string) => new Raw(`AVG(${quoteIdent(col, 'standard')})`),
  min: (col: string) => new Raw(`MIN(${quoteIdent(col, 'standard')})`),
  max: (col: string) => new Raw(`MAX(${quoteIdent(col, 'standard')})`)
}

let _instance: QueryBuilder | null = null
export function createQueryBuilder(dialect: SqlDialect = 'standard'): QueryBuilder { return new QueryBuilder(dialect) }
export function getDefaultBuilder(): QueryBuilder { if (!_instance) _instance = new QueryBuilder(); return _instance }
export function resetDefaultBuilder(): void { _instance = null }
export { QueryBuilder as default }
