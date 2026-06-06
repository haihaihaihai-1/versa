import { useState } from 'react'
import { QueryBuilder, fn, Raw } from './index'

const TABS = ['SELECT', 'WHERE', 'JOIN', 'GROUP/HAVING', 'INSERT', 'UPDATE', 'DELETE', 'UNION', 'Dialects', 'Aggregates'] as const
type Tab = typeof TABS[number]

export default function QueryBuilderPage() {
  const [tab, setTab] = useState<Tab>('SELECT')
  const [dialect, setDialect] = useState<'standard' | 'postgres' | 'mysql' | 'sqlite'>('standard')
  const [out, setOut] = useState('')
  const [table, setTable] = useState('users')
  const [col, setCol] = useState('id')
  const [op, setOp] = useState('=')
  const [val, setVal] = useState('5')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v60.0 SQL Query Builder</h1>
      <p className="text-sm text-slate-400">链式 SQL 构造器 · 4 种方言（standard/postgres/mysql/sqlite）· 参数化查询</p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs">方言:</label>
        <select value={dialect} onChange={e => setDialect(e.target.value as 'standard' | 'postgres' | 'mysql' | 'sqlite')} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
          <option value="standard">standard</option>
          <option value="postgres">postgres</option>
          <option value="mysql">mysql</option>
          <option value="sqlite">sqlite</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'SELECT' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder(dialect).select('id', 'name', 'email').from(table).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">SELECT id, name, email</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select().distinct().from(table).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">SELECT DISTINCT *</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select('u.id', 'u.name', 'p.title').from(table, 'u').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">SELECT u.cols FROM users u</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select(new Raw('NOW()')).from(table).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">SELECT NOW()</button>
          </div>
        </div>
      )}

      {tab === 'WHERE' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <input value={col} onChange={e => setCol(e.target.value)} placeholder="col" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={op} onChange={e => setOp(e.target.value)} placeholder="op" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={val} onChange={e => setVal(e.target.value)} placeholder="val" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const v = val === 'null' ? null : val === 'true' ? true : val === 'false' ? false : isNaN(Number(val)) ? val : Number(val)
              setOut(new QueryBuilder(dialect).select().from(table).where(col, op, v as string | number).toString())
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">where</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select().from(table).whereIn(col, [1, 2, 3]).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">IN (1,2,3)</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select().from(table).whereNull(col).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">IS NULL</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select().from(table).whereBetween(col, 10, 20).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">BETWEEN</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select().from(table).whereRaw('age > ?', [18]).toString())} className="px-3 py-1.5 bg-amber-700 rounded text-xs">raw</button>
          </div>
        </div>
      )}

      {tab === 'JOIN' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder(dialect).select('u.name', 'p.title').from('users', 'u').join('posts', 'u.id = p.user_id', 'INNER').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">INNER JOIN</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select('u.name', 'p.title').from('users', 'u').leftJoin('posts', 'u.id = p.user_id').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">LEFT JOIN</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select('a.x', 'b.y').from('a').rightJoin('b', 'a.id = b.aid').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">RIGHT JOIN</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select('a.x', 'b.y').from('a').fullJoin('b', 'a.id = b.aid').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">FULL JOIN</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select('a.x', 'b.y').from('a').crossJoin('b').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">CROSS JOIN</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select('u.id', 'p.title', 'c.text').from('users', 'u').leftJoin('posts', 'u.id = p.user_id').innerJoin('comments', 'p.id = c.post_id').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">multi-join</button>
          </div>
        </div>
      )}

      {tab === 'GROUP/HAVING' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder(dialect).select('dept', fn.count()).from('emp').groupBy('dept').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">GROUP BY dept + COUNT</button>
            <button onClick={() => { const q = new QueryBuilder(dialect).select('dept', fn.count()).from('emp').groupBy('dept'); q.having('id', '>', 5); setOut(q.toString()) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">HAVING {`>`} 5</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select().from('u').orderBy('id', 'DESC').limit(10).offset(20).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">ORDER BY DESC + LIMIT + OFFSET</button>
          </div>
        </div>
      )}

      {tab === 'INSERT' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder(dialect).insert('users').values({ name: 'alice', age: 30, email: 'a@x.com' }).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">INSERT single</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).insert('users').values({ name: 'bob', email: null }).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">INSERT with NULL</button>
          </div>
        </div>
      )}

      {tab === 'UPDATE' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder(dialect).update('users').set({ name: 'bob', age: 31 }).where('id', '=', 1).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">UPDATE single</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).update('users').set({ active: true }).where('last_login', '<', '2024-01-01').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">UPDATE bulk</button>
          </div>
        </div>
      )}

      {tab === 'DELETE' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder(dialect).delete('users').where('id', '=', 5).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">DELETE WHERE</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).delete('users').whereIn('id', [1, 2, 3]).toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">DELETE WHERE IN</button>
          </div>
        </div>
      )}

      {tab === 'UNION' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const q1 = new QueryBuilder(dialect).select('id', 'name').from('active_users')
              const q2 = new QueryBuilder(dialect).select('id', 'name').from('archived_users')
              setOut(q1.union(q2).toString())
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">UNION</button>
            <button onClick={() => {
              const q1 = new QueryBuilder(dialect).select('id', 'name').from('a')
              const q2 = new QueryBuilder(dialect).select('id', 'name').from('b')
              setOut(q1.unionAll(q2).toString())
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">UNION ALL</button>
          </div>
        </div>
      )}

      {tab === 'Dialects' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder('postgres').select().from('u').where('id', '=', 1).toString())} className="px-3 py-1.5 bg-indigo-700 rounded text-xs">postgres $1</button>
            <button onClick={() => setOut(new QueryBuilder('mysql').select().from('u').where('id', '=', 1).toString())} className="px-3 py-1.5 bg-orange-700 rounded text-xs">mysql backticks</button>
            <button onClick={() => setOut(new QueryBuilder('sqlite').select().from('u').where('id', '=', 1).toString())} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">sqlite dquotes</button>
            <button onClick={() => setOut(new QueryBuilder('standard').select().from('u').where('id', '=', 1).toString())} className="px-3 py-1.5 bg-slate-700 rounded text-xs">standard ?</button>
          </div>
        </div>
      )}

      {tab === 'Aggregates' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(new QueryBuilder(dialect).select(fn.count()).from('orders').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">COUNT(*)</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select(fn.sum('amount')).from('orders').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">SUM(amount)</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select(fn.avg('price')).from('products').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">AVG(price)</button>
            <button onClick={() => setOut(new QueryBuilder(dialect).select(fn.min('age'), fn.max('age')).from('users').toString())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">MIN/MAX(age)</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono">{out}</pre>
    </div>
  )
}
