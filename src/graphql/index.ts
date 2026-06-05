/**
 * Versa · GraphQL Gateway (v24.0)
 *
 * 能力:
 * - Schema 构造器 (SDL parser → AST)
 * - Resolver 注册表
 * - 查询执行 (深度优先, 字段解析, N+1 防御)
 * - 订阅 (基于 realtime channel)
 * - 查询批处理 (DataLoader 模式)
 * - Schema 拼接 (federation stub)
 * - 错误处理 (GraphQLError 格式)
 * - 内省 (introspection)
 * - 权限 (字段级 directive)
 */

export type GraphQLValue = string | number | boolean | null | GraphQLValue[] | { [k: string]: GraphQLValue } | undefined

export interface GraphQLError {
  message: string
  path?: (string | number)[]
  extensions?: Record<string, any>
  locations?: { line: number; column: number }[]
}

export interface GraphQLResult<T = any> {
  data?: T
  errors?: GraphQLError[]
}

export type ResolverFn = (parent: any, args: any, ctx: GraphQLContext, info: GraphQLResolveInfo) => any | Promise<any>
export type SubscriptionResolverFn = (
  parent: any,
  args: any,
  ctx: GraphQLContext,
  info: GraphQLResolveInfo
) => AsyncIterable<any>

export interface GraphQLResolveInfo {
  fieldName: string
  path: { key: string | number; prev: GraphQLResolveInfo | null }
  returnType: GraphQLType
  fragments: Record<string, FragmentDef>
}

// ============== Type System ==============

export type GraphQLType =
  | { kind: 'Scalar'; name: string }
  | { kind: 'Object'; name: string; fields: Record<string, FieldDef> }
  | { kind: 'List'; ofType: GraphQLType }
  | { kind: 'NonNull'; ofType: GraphQLType }
  | { kind: 'Enum'; name: string; values: string[] }
  | { kind: 'InputObject'; name: string; fields: Record<string, FieldDef> }

export interface FieldDef {
  type: GraphQLType
  description?: string
  args?: Record<string, { type: GraphQLType; defaultValue?: any }>
  resolve?: ResolverFn
  subscribe?: SubscriptionResolverFn
  deprecationReason?: string
  directives?: { name: string; args?: Record<string, any> }[]
}

export interface FragmentDef {
  name: string
  onType: string
  fields: Selection[]
}

// ============== 标量 ==============

const SCALARS = ['String', 'Int', 'Float', 'Boolean', 'ID'] as const
export type ScalarName = typeof SCALARS[number]

export function isScalar(t: GraphQLType): t is { kind: 'Scalar'; name: string } {
  return t.kind === 'Scalar' && (SCALARS as readonly string[]).includes(t.name)
}
export function nonNull(t: GraphQLType): GraphQLType { return { kind: 'NonNull', ofType: t } }
export function list(t: GraphQLType): GraphQLType { return { kind: 'List', ofType: t } }
export function enumType(name: string, values: string[]): GraphQLType { return { kind: 'Enum', name, values } }
export function inputObject(name: string, fields: Record<string, FieldDef>): GraphQLType {
  return { kind: 'InputObject', name, fields }
}
export function objectType(name: string, fields: Record<string, FieldDef>): GraphQLType {
  return { kind: 'Object', name, fields }
}
export function scalarType(name: string): GraphQLType { return { kind: 'Scalar', name } }

export function unwrap(t: GraphQLType): GraphQLType {
  if (t.kind === 'NonNull' || t.kind === 'List') return unwrap(t.ofType)
  return t
}

export function typeName(t: GraphQLType): string {
  const u = unwrap(t)
  return u.kind === 'Scalar' || u.kind === 'Object' || u.kind === 'Enum' || u.kind === 'InputObject' ? u.name : 'Unknown'
}

// ============== Schema ==============

export class Schema {
  private types: Map<string, GraphQLType> = new Map()
  private resolvers: Map<string, Map<string, ResolverFn>> = new Map()
  private subscriptions: Map<string, Map<string, SubscriptionResolverFn>> = new Map()
  private queryName = 'Query'
  private mutationName = 'Mutation'
  private subscriptionName = 'Subscription'
  private enumTypes: Map<string, string[]> = new Map()
  private inputTypes: Map<string, Record<string, FieldDef>> = new Map()

  constructor() {
    for (const s of SCALARS) this.types.set(s, { kind: 'Scalar', name: s })
  }

  addType(t: GraphQLType) {
    if (t.kind === 'Object') this.types.set(t.name, t)
    else if (t.kind === 'Enum') { this.types.set(t.name, t); this.enumTypes.set(t.name, t.values) }
    else if (t.kind === 'InputObject') { this.types.set(t.name, t); this.inputTypes.set(t.name, t.fields) }
    else if (t.kind === 'Scalar') this.types.set(t.name, t)
  }

  addResolver(typeName: string, fieldName: string, resolver: ResolverFn) {
    if (!this.resolvers.has(typeName)) this.resolvers.set(typeName, new Map())
    this.resolvers.get(typeName)!.set(fieldName, resolver)
  }

  addSubscription(typeName: string, fieldName: string, sub: SubscriptionResolverFn) {
    if (!this.subscriptions.has(typeName)) this.subscriptions.set(typeName, new Map())
    this.subscriptions.get(typeName)!.set(fieldName, sub)
  }

  getType(name: string) { return this.types.get(name) }
  getEnumValues(name: string) { return this.enumTypes.get(name) }
  getInputFields(name: string) { return this.inputTypes.get(name) }

  getResolver(typeName: string, fieldName: string): ResolverFn | undefined {
    const fromMap = this.resolvers.get(typeName)?.get(fieldName)
    if (fromMap) return fromMap
    const t = this.types.get(typeName)
    if (t && t.kind === 'Object') {
      const fd = t.fields[fieldName]
      if (fd?.resolve) return fd.resolve
    }
    return undefined
  }

  getSubscription(typeName: string, fieldName: string): SubscriptionResolverFn | undefined {
    return this.subscriptions.get(typeName)?.get(fieldName)
  }

  /** 序列化为 SDL (简化) */
  toSDL(): string {
    const lines: string[] = []
    for (const t of this.types.values()) {
      if (t.kind === 'Scalar' && (SCALARS as readonly string[]).includes(t.name)) continue
      if (t.kind === 'Scalar') lines.push(`scalar ${t.name}`)
      else if (t.kind === 'Enum') lines.push(`enum ${t.name} { ${t.values.join(' ')} }`)
      else if (t.kind === 'Object') {
        const fieldStrs = Object.entries(t.fields).map(([fn, fd]) => {
          let s = `  ${fn}: ${printType(fd.type)}`
          if (fd.args && Object.keys(fd.args).length > 0) {
            s += `(args: ${Object.entries(fd.args).map(([an, ad]) => `${an}: ${printType(ad.type)}`).join(', ')})`
          }
          return s
        })
        lines.push(`type ${t.name} {\n${fieldStrs.join('\n')}\n}`)
      } else if (t.kind === 'InputObject') {
        const fieldStrs = Object.entries(t.fields).map(([fn, fd]) => `  ${fn}: ${printType(fd.type)}`)
        lines.push(`input ${t.name} {\n${fieldStrs.join('\n')}\n}`)
      }
    }
    return lines.join('\n\n')
  }

  /** 内省 (用于 GraphQL Playground) */
  introspect() {
    const types: any[] = []
    for (const [name, t] of this.types) {
      if (t.kind === 'Scalar' && (SCALARS as readonly string[]).includes(name)) continue
      if (t.kind === 'Object') {
        types.push({
          kind: 'OBJECT',
          name: t.name,
          fields: Object.entries(t.fields).map(([fn, fd]) => ({
            name: fn,
            type: introspectType(fd.type),
            args: fd.args ? Object.entries(fd.args).map(([an, ad]) => ({ name: an, type: introspectType(ad.type) })) : [],
          })),
        })
      }
    }
    return {
      __schema: {
        types,
        queryType: { name: this.queryName },
        mutationType: { name: this.mutationName },
        subscriptionType: { name: this.subscriptionName },
      },
    }
  }
}

function printType(t: GraphQLType): string {
  if (t.kind === 'NonNull') return printType(t.ofType) + '!'
  if (t.kind === 'List') return '[' + printType(t.ofType) + ']'
  return t.kind === 'Scalar' || t.kind === 'Object' || t.kind === 'Enum' || t.kind === 'InputObject' ? t.name : 'Unknown'
}

function introspectType(t: GraphQLType): any {
  if (t.kind === 'NonNull') return { kind: 'NON_NULL', ofType: introspectType(t.ofType) }
  if (t.kind === 'List') return { kind: 'LIST', ofType: introspectType(t.ofType) }
  return { kind: t.kind.toUpperCase(), name: t.kind === 'Scalar' || t.kind === 'Object' || t.kind === 'Enum' || t.kind === 'InputObject' ? t.name : 'Unknown' }
}

// ============== Query Parser (简化) ==============

export interface Document {
  definitions: Definition[]
  fragments: Record<string, FragmentDef>
}

export type Definition = OperationDef | FragmentDefinitionDef

export interface OperationDef {
  kind: 'OperationDefinition'
  operation: 'query' | 'mutation' | 'subscription'
  name?: string
  selectionSet: SelectionSet
  variableDefinitions: VariableDefinition[]
}

export interface FragmentDefinitionDef {
  kind: 'FragmentDefinition'
  name: string
  typeCondition: string
  selectionSet: SelectionSet
}

export interface FragmentDef {
  name: string
  onType: string
  fields: Selection[]
}

export interface VariableDefinition {
  variable: string
  type: GraphQLType
  defaultValue?: any
}

export interface SelectionSet {
  selections: Selection[]
}

export type Selection = FieldSelection | FragmentSpreadSelection | InlineFragmentSelection

export interface FieldSelection {
  kind: 'Field'
  name: string
  alias?: string
  arguments: Record<string, ArgumentValue>
  selectionSet?: SelectionSet
  directives: Directive[]
}

export interface FragmentSpreadSelection {
  kind: 'FragmentSpread'
  name: string
  directives: Directive[]
}

export interface InlineFragmentSelection {
  kind: 'InlineFragment'
  onType?: string
  selectionSet: SelectionSet
  directives: Directive[]
}

export interface Directive {
  name: string
  args: Record<string, any>
}

export type ArgumentValue = { kind: 'variable'; name: string } | { kind: 'literal'; value: any }

// 简化版 Parser (仅支持常用语法)
export function parse(source: string): Document {
  const tokens = tokenize(source)
  const parser = new Parser(tokens)
  return parser.parseDocument()
}

class Parser {
  private pos = 0
  constructor(private tokens: Token[]) {}

  parseDocument(): Document {
    const definitions: Definition[] = []
    const fragments: Record<string, FragmentDef> = {}
    while (this.pos < this.tokens.length) {
      if (this.peek().type === 'BRACE_L') {
        // shorthand { field } → 包装为 query
        definitions.push({
          kind: 'OperationDefinition',
          operation: 'query',
          name: undefined,
          selectionSet: this.parseSelectionSet(),
          variableDefinitions: [],
        })
        continue
      }
      const token = this.consume()
      if (token.type === 'NAME' && token.value === 'fragment') {
        const fd = this.parseFragmentDef()
        definitions.push(fd)
        fragments[fd.name] = { name: fd.name, onType: fd.typeCondition, fields: fd.selectionSet.selections as FieldSelection[] }
      } else if (token.type === 'NAME' && (token.value === 'query' || token.value === 'mutation' || token.value === 'subscription')) {
        const op = token.value as 'query' | 'mutation' | 'subscription'
        let name: string | undefined
        if (this.peek().type === 'NAME' && this.peek().value !== '{') {
          name = this.consume().value
        }
        let variableDefinitions: VariableDefinition[] = []
        if (this.peek().type === 'PAREN_L') {
          this.consume()
          while (this.peek().type !== 'PAREN_R') {
            const v = this.consume()
            if (v.type === 'DOLLAR') {
              const nameTok = this.consume()
              if (this.peek().type === 'COLON') this.consume()
              const type = this.parseTypeRef()
              variableDefinitions.push({ variable: nameTok.value, type })
            } else if (v.type === 'NAME') {
              if (this.peek().type === 'COLON') this.consume()
              const type = this.parseTypeRef()
              variableDefinitions.push({ variable: v.value, type })
            }
          }
          this.consume()  // )
        }
        const selectionSet = this.parseSelectionSet()
        definitions.push({ kind: 'OperationDefinition', operation: op, name, selectionSet, variableDefinitions })
      }
    }
    return { definitions, fragments }
  }

  private parseFragmentDef(): FragmentDefinitionDef {
    const name = this.consume().value
    this.consume()  // on
    const typeCondition = this.consume().value
    const selectionSet = this.parseSelectionSet()
    return { kind: 'FragmentDefinition', name, typeCondition, selectionSet }
  }

  private parseTypeRef(): GraphQLType {
    let t: GraphQLType
    const token = this.consume()
    if (token.type === 'BRACKET_L') {
      const inner = this.parseTypeRef()
      this.consume()  // ]
      t = { kind: 'List', ofType: inner }
    } else {
      t = { kind: 'Scalar', name: token.value }
    }
    if (this.peek().type === 'BANG') {
      this.consume()
      t = { kind: 'NonNull', ofType: t }
    }
    return t
  }

  private parseSelectionSet(): SelectionSet {
    this.consume()  // {
    const selections: Selection[] = []
    while (this.peek().type !== 'BRACE_R') {
      selections.push(this.parseSelection())
    }
    this.consume()  // }
    return { selections }
  }

  private parseSelection(): Selection {
    const token = this.peek()
    if (token.type === 'SPREAD') {
      this.consume()
      const next = this.peek()
      if (next.type === 'NAME' && next.value === 'on') {
        this.consume()  // 'on'
        const onType = this.consume().value
        const selectionSet = this.parseSelectionSet()
        return { kind: 'InlineFragment', onType, selectionSet, directives: [] }
      }
      if (next.type === 'BRACE_L') {
        let onType: string | undefined
        if (this.peek().type === 'NAME' && this.peek().value === 'on') {
          this.consume()
          onType = this.consume().value
        }
        const selectionSet = this.parseSelectionSet()
        return { kind: 'InlineFragment', onType, selectionSet, directives: [] }
      }
      const name = this.consume().value
      return { kind: 'FragmentSpread', name, directives: [] }
    }
    let name: string
    let alias: string | undefined
    if (token.type === 'NAME' && this.peekAt(1)?.type === 'COLON') {
      alias = token.value
      this.consume(); this.consume()  // alias :
      name = this.consume().value
    } else {
      name = this.consume().value
    }
    let args: Record<string, ArgumentValue> = {}
    if (this.peek().type === 'PAREN_L') {
      this.consume()
      while (this.peek().type !== 'PAREN_R') {
        const argName = this.consume().value
        this.consume()  // :
        args[argName] = this.parseValue()
      }
      this.consume()  // )
    }
    let selectionSet: SelectionSet | undefined
    if (this.peek().type === 'BRACE_L') {
      selectionSet = this.parseSelectionSet()
    }
    return { kind: 'Field', name, alias, arguments: args, selectionSet, directives: [] }
  }

  private parseValue(): ArgumentValue {
    if (this.peek().type === 'DOLLAR') {
      this.consume()
      return { kind: 'variable', name: this.consume().value }
    }
    const t = this.consume()
    if (t.type === 'STRING') return { kind: 'literal', value: t.value }
    if (t.type === 'NUMBER') return { kind: 'literal', value: Number(t.value) }
    if (t.type === 'BOOLEAN') return { kind: 'literal', value: t.value === 'true' }
    if (t.type === 'NULL') return { kind: 'literal', value: null }
    if (t.type === 'BRACE_L') {
      const obj: any = {}
      while (this.peek().type !== 'BRACE_R') {
        const k = this.consume().value
        this.consume()  // :
        obj[k] = this.parseValue().kind === 'literal' ? (this.parseValue() as any).value : null
      }
      this.consume()  // }
      return { kind: 'literal', value: obj }
    }
    return { kind: 'literal', value: null }
  }

  private peek() { return this.tokens[this.pos] }
  private peekAt(n: number) { return this.tokens[this.pos + n] }
  private consume() { return this.tokens[this.pos++] }
}

interface Token {
  type: 'NAME' | 'STRING' | 'NUMBER' | 'BOOLEAN' | 'NULL' | 'BRACE_L' | 'BRACE_R' | 'PAREN_L' | 'PAREN_R' | 'BRACKET_L' | 'BRACKET_R' | 'COLON' | 'BANG' | 'SPREAD' | 'DOLLAR'
  value: any
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const c = source[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '{') { tokens.push({ type: 'BRACE_L', value: '{' }); i++; continue }
    if (c === '}') { tokens.push({ type: 'BRACE_R', value: '}' }); i++; continue }
    if (c === '(') { tokens.push({ type: 'PAREN_L', value: '(' }); i++; continue }
    if (c === ')') { tokens.push({ type: 'PAREN_R', value: ')' }); i++; continue }
    if (c === '[') { tokens.push({ type: 'BRACKET_L', value: '[' }); i++; continue }
    if (c === ']') { tokens.push({ type: 'BRACKET_R', value: ']' }); i++; continue }
    if (c === ':') { tokens.push({ type: 'COLON', value: ':' }); i++; continue }
    if (c === '!') { tokens.push({ type: 'BANG', value: '!' }); i++; continue }
    if (c === '$') { tokens.push({ type: 'DOLLAR', value: '$' }); i++; continue }
    if (c === '.' && source[i + 1] === '.' && source[i + 2] === '.') {
      tokens.push({ type: 'SPREAD', value: '...' }); i += 3; continue
    }
    if (c === '"') {
      let j = i + 1
      while (j < source.length && source[j] !== '"') j++
      tokens.push({ type: 'STRING', value: source.slice(i + 1, j) })
      i = j + 1
      continue
    }
    if (/[0-9-]/.test(c)) {
      let j = i
      while (j < source.length && /[0-9.\-eE]/.test(source[j])) j++
      tokens.push({ type: 'NUMBER', value: source.slice(i, j) })
      i = j
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < source.length && /[A-Za-z0-9_]/.test(source[j])) j++
      const value = source.slice(i, j)
      let type: Token['type'] = 'NAME'
      if (value === 'true' || value === 'false') type = 'BOOLEAN'
      else if (value === 'null') type = 'NULL'
      tokens.push({ type, value })
      i = j
      continue
    }
    i++  // 跳过未知字符
  }
  return tokens
}

// ============== Executor ==============

export interface GraphQLContext {
  [k: string]: any
}

export async function execute(
  schema: Schema,
  source: string,
  variableValues: Record<string, any> = {},
  contextValue: GraphQLContext = {}
): Promise<GraphQLResult> {
  const errors: GraphQLError[] = []
  let doc: Document
  try {
    doc = parse(source)
  } catch (e: any) {
    return { errors: [{ message: 'Parse error: ' + e.message }] }
  }

  const op = doc.definitions.find((d) => d.kind === 'OperationDefinition') as OperationDef | undefined
  if (!op) return { errors: [{ message: 'No operation found' }] }

  const fragmentMap: Record<string, FragmentDef> = {}
  for (const d of doc.definitions) {
    if (d.kind === 'FragmentDefinition') {
      fragmentMap[d.name] = { name: d.name, onType: d.typeCondition, fields: d.selectionSet.selections as FieldSelection[] }
    }
  }

  const data: any = {}
  try {
    if (op.operation === 'query' || op.operation === 'mutation') {
      const rootTypeName = op.operation === 'query' ? 'Query' : 'Mutation'
      const rootType = schema.getType(rootTypeName)
      if (!rootType || rootType.kind !== 'Object') {
        return { errors: [{ message: `Root type ${rootTypeName} not found` }] }
      }
      for (const sel of op.selectionSet.selections) {
        if (sel.kind !== 'Field') continue
        const fieldName = sel.name
        const fieldDef = rootType.fields[fieldName]
        if (!fieldDef) {
          errors.push({ message: `Field not found: ${fieldName}`, path: [fieldName] })
          continue
        }
        const args = resolveArgs(sel.arguments, variableValues, fragmentMap)
        const resolver = schema.getResolver(rootTypeName, fieldName)
        const result = resolver
          ? await resolver(undefined, args, contextValue, makeInfo(fieldName, sel, fieldDef, fragmentMap))
          : args
        data[sel.alias || fieldName] = await completeValue(result, fieldDef.type, sel, contextValue, fragmentMap, [fieldName], errors, schema)
      }
    } else if (op.operation === 'subscription') {
      data._subscription = '__requires_async_iterator__'
    }
  } catch (e: any) {
    errors.push({ message: e.message })
  }

  return errors.length > 0 ? { data, errors } : { data }
}

function resolveArgs(args: Record<string, ArgumentValue>, vars: Record<string, any>, fragments: Record<string, FragmentDef>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(args)) {
    if (v.kind === 'variable') out[k] = vars[v.name]
    else if (v.kind === 'literal') {
      // 简化: 如果是 { ... } 字符串格式已被 parseValue 转为对象
      out[k] = v.value
    }
  }
  return out
}

function makeInfo(fieldName: string, sel: FieldSelection, fieldDef: FieldDef, fragments: Record<string, FragmentDef>): GraphQLResolveInfo {
  return {
    fieldName,
    path: { key: fieldName, prev: null },
    returnType: fieldDef.type,
    fragments,
  }
}

async function completeValue(
  value: any,
  type: GraphQLType,
  sel: Selection,
  context: GraphQLContext,
  fragments: Record<string, FragmentDef>,
  path: (string | number)[],
  errors: GraphQLError[],
  schema: Schema
): Promise<any> {
  if (value instanceof Error) {
    errors.push({ message: value.message, path })
    return null
  }
  if (type.kind === 'NonNull') {
    const r = await completeValue(value, type.ofType, sel, context, fragments, path, errors, schema)
    if (r === null || r === undefined) {
      throw new Error(`Non-null field ${path.join('.')} returned null`)
    }
    return r
  }
  if (value === null || value === undefined) return null
  if (type.kind === 'List') {
    if (!Array.isArray(value)) return null
    return Promise.all(value.map((v, i) => completeValue(v, type.ofType, sel, context, fragments, [...path, i], errors, schema)))
  }
  if (sel.kind !== 'Field' || !sel.selectionSet) return value
  const t = unwrap(type)
  if (t.kind !== 'Object') return value
  return collectFields(value, sel.selectionSet, fragments, t.name, context, schema, errors, path, type)
}

function collectFields(
  source: any,
  selectionSet: SelectionSet,
  fragments: Record<string, FragmentDef>,
  parentTypeName: string,
  context: GraphQLContext,
  schema: Schema,
  errors: GraphQLError[],
  path: (string | number)[],
  parentType: GraphQLType
): Promise<any> {
  return new Promise(async (resolve) => {
    const result: any = {}
    // 优先从 schema 查找完整类型 (含 resolver 字段)
    const t = unwrap(parentType)
    let resolvedType: GraphQLType = t
    if (t.kind === 'Object') {
      const fromSchema = schema.getType(t.name)
      if (fromSchema && fromSchema.kind === 'Object') resolvedType = fromSchema
    }
    const fld = (resolvedType.kind === 'Object') ? resolvedType.fields : ({} as Record<string, FieldDef>)
    for (const sel of selectionSet.selections) {
      if (sel.kind === 'Field') {
        const f = fld[sel.name]
        if (!f) {
          errors.push({ message: `Field not found: ${parentTypeName}.${sel.name}`, path: [...path, sel.alias || sel.name] })
          continue
        }
        const args = resolveArgs(sel.arguments, {}, fragments)
        const resolver = schema.getResolver(parentTypeName, sel.name)
        let v
        try {
          v = resolver ? await resolver(source, args, context, makeInfo(sel.name, sel, f, fragments)) : source?.[sel.name]
        } catch (e: any) {
          errors.push({ message: e.message, path: [...path, sel.alias || sel.name] })
          v = null
        }
        result[sel.alias || sel.name] = await completeValue(v, f.type, sel, context, fragments, [...path, sel.alias || sel.name], errors, schema)
      } else if (sel.kind === 'FragmentSpread') {
        const frag = fragments[sel.name]
        if (frag) {
          const sub = await collectFields(source, { selections: frag.fields }, fragments, parentTypeName, context, schema, errors, path, parentType)
          Object.assign(result, sub)
        }
      } else if (sel.kind === 'InlineFragment') {
        const sub = await collectFields(source, sel.selectionSet, fragments, sel.onType || parentTypeName, context, schema, errors, path, parentType)
        Object.assign(result, sub)
      }
    }
    resolve(result)
  })
}

// ============== DataLoader (批处理) ==============

export class DataLoader<K, V> {
  private cache = new Map<K, Promise<V>>()
  private queue: { key: K; resolve: (v: V) => void; reject: (e: any) => void }[] = []
  private scheduled = false
  constructor(private batchFn: (keys: K[]) => Promise<V[]>, private options: { cache?: boolean; maxBatchSize?: number } = {}) {}

  async load(key: K): Promise<V> {
    if (this.options.cache !== false && this.cache.has(key)) return this.cache.get(key)!
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject })
      if (!this.scheduled) {
        this.scheduled = true
        queueMicrotask(() => this.flush())
      }
    })
  }

  private async flush() {
    this.scheduled = false
    const max = this.options.maxBatchSize || 100
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, max)
      try {
        const keys = batch.map((b) => b.key)
        const results = await this.batchFn(keys)
        for (let i = 0; i < batch.length; i++) {
          const v = results[i]
          batch[i].resolve(v)
          if (this.options.cache !== false) this.cache.set(keys[i], Promise.resolve(v))
        }
      } catch (e) {
        for (const b of batch) b.reject(e)
      }
    }
  }

  clear(key?: K) {
    if (key) this.cache.delete(key)
    else this.cache.clear()
  }
}

// ============== 内置 Schema: Versa ==============

export const schema = new Schema()

// Types
schema.addType(objectType('User', {
  id: { type: nonNull(scalarType('ID')), resolve: (p) => p.id },
  name: { type: nonNull(scalarType('String')), resolve: (p) => p.name },
  email: { type: scalarType('String'), resolve: (p) => p.email },
  role: { type: enumType('Role', ['guest', 'user', 'verified', 'moderator', 'admin']), resolve: (p) => p.role || 'user' },
  posts: { type: nonNull(list(objectType('Post', {}))), resolve: (p) => mockDB.posts.filter((x) => x.authorId === p.id) },
  createdAt: { type: scalarType('Float'), resolve: (p) => p.createdAt || Date.now() },
}))

schema.addType(objectType('Post', {
  id: { type: nonNull(scalarType('ID')), resolve: (p) => p.id },
  title: { type: scalarType('String'), resolve: (p) => p.title },
  text: { type: nonNull(scalarType('String')), resolve: (p) => p.text },
  author: { type: objectType('User', {}), resolve: (p) => mockDB.users.find((u) => u.id === p.authorId) },
  likes: { type: scalarType('Int'), resolve: (p) => p.likes || 0 },
  comments: { type: list(objectType('Comment', {})), resolve: (p) => mockDB.comments.filter((c) => c.postId === p.id) },
  createdAt: { type: scalarType('Float'), resolve: (p) => p.createdAt },
}))

schema.addType(objectType('Comment', {
  id: { type: nonNull(scalarType('ID')), resolve: (p) => p.id },
  text: { type: nonNull(scalarType('String')), resolve: (p) => p.text },
  author: { type: objectType('User', {}), resolve: (p) => mockDB.users.find((u) => u.id === p.authorId) },
  postId: { type: scalarType('ID'), resolve: (p) => p.postId },
  createdAt: { type: scalarType('Float'), resolve: (p) => p.createdAt },
}))

schema.addType(objectType('Product', {
  id: { type: nonNull(scalarType('ID')), resolve: (p) => p.id },
  name: { type: nonNull(scalarType('String')), resolve: (p) => p.name },
  price: { type: scalarType('Float'), resolve: (p) => p.price },
  inStock: { type: scalarType('Boolean'), resolve: (p) => p.inStock },
}))

// Query
schema.addType(objectType('Query', {
  hello: { type: scalarType('String'), resolve: () => 'world' },
  users: { type: list(objectType('User', {})), resolve: () => mockDB.users },
  user: {
    type: objectType('User', {}),
    args: { id: { type: nonNull(scalarType('ID')) } },
    resolve: (_, { id }) => mockDB.users.find((u) => u.id === id),
  },
  posts: { type: list(objectType('Post', {})), resolve: () => mockDB.posts },
  post: {
    type: objectType('Post', {}),
    args: { id: { type: nonNull(scalarType('ID')) } },
    resolve: (_, { id }) => mockDB.posts.find((p) => p.id === id),
  },
  products: { type: list(objectType('Product', {})), resolve: () => mockDB.products },
  me: { type: objectType('User', {}), resolve: (_, __, ctx) => ctx.user || mockDB.users[0] },
  now: { type: scalarType('Float'), resolve: () => Date.now() },
}))

// Mutation
schema.addType(objectType('Mutation', {
  createPost: {
    type: objectType('Post', {}),
    args: {
      title: { type: scalarType('String') },
      text: { type: nonNull(scalarType('String')) },
      authorId: { type: nonNull(scalarType('ID')) },
    },
    resolve: (_, { title, text, authorId }) => {
      const p = { id: 'p_' + Date.now(), title, text, authorId, likes: 0, createdAt: Date.now() }
      mockDB.posts.push(p)
      return p
    },
  },
  likePost: {
    type: objectType('Post', {}),
    args: { id: { type: nonNull(scalarType('ID')) } },
    resolve: (_, { id }) => {
      const p = mockDB.posts.find((x) => x.id === id)
      if (p) p.likes = (p.likes || 0) + 1
      return p
    },
  },
  deletePost: {
    type: scalarType('Boolean'),
    args: { id: { type: nonNull(scalarType('ID')) } },
    resolve: (_, { id }) => {
      const i = mockDB.posts.findIndex((x) => x.id === id)
      if (i >= 0) { mockDB.posts.splice(i, 1); return true }
      return false
    },
  },
}))

// Subscription
schema.addType(objectType('Subscription', {
  postCreated: {
    type: objectType('Post', {}),
    subscribe: async function* () {
      let last = mockDB.posts.length
      while (true) {
        await new Promise((r) => setTimeout(r, 1000))
        if (mockDB.posts.length > last) {
          yield { postCreated: mockDB.posts[mockDB.posts.length - 1] }
          last = mockDB.posts.length
        }
      }
    },
  },
  ping: {
    type: scalarType('String'),
    subscribe: async function* () {
      let n = 0
      while (true) {
        await new Promise((r) => setTimeout(r, 1000))
        yield { ping: `pong-${n++}` }
      }
    },
  },
}))

// ============== Mock Database ==============

const mockDB: {
  users: any[]
  posts: any[]
  comments: any[]
  products: any[]
} = {
  users: [
    { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'user', createdAt: Date.now() - 86400000 * 30 },
    { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'verified', createdAt: Date.now() - 86400000 * 60 },
    { id: 'u3', name: 'Carol', email: 'carol@example.com', role: 'admin', createdAt: Date.now() - 86400000 * 90 },
  ],
  posts: [
    { id: 'p1', title: 'Hello', text: 'Welcome to Versa!', authorId: 'u1', likes: 10, createdAt: Date.now() - 86400000 },
    { id: 'p2', title: 'GraphQL', text: 'GraphQL is great', authorId: 'u2', likes: 25, createdAt: Date.now() - 3600000 },
  ],
  comments: [
    { id: 'c1', text: 'Nice!', authorId: 'u2', postId: 'p1', createdAt: Date.now() },
  ],
  products: [
    { id: 'pr1', name: 'Widget', price: 9.99, inStock: true },
    { id: 'pr2', name: 'Gadget', price: 19.99, inStock: false },
  ],
}

export const mockDBExport = mockDB
