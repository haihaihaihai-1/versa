// Model Registry: model versioning, stage transitions (dev/staging/prod/archived), artifact storage, lineage and metrics.

export type ModelStage = 'dev' | 'staging' | 'production' | 'archived'

export type ArtifactType = 'weights' | 'config' | 'tokenizer' | 'preprocessor' | 'metadata' | (string & {})

export interface ModelArtifact {
  id: string
  type: ArtifactType
  filename: string
  mimeType: string
  size: number
  data: Uint8Array
  checksum: string
  createdAt: number
}

export interface ModelMetrics {
  accuracy?: number
  precision?: number
  recall?: number
  f1?: number
  rmse?: number
  mae?: number
  auc?: number
  latencyP50Ms?: number
  latencyP99Ms?: number
  custom?: Record<string, number>
}

export interface ModelVersion {
  id: string
  modelName: string
  version: number
  stage: ModelStage
  description?: string
  parentVersionId?: string
  featureGroupIds: string[]
  framework?: string
  hyperparameters?: Record<string, unknown>
  metrics: ModelMetrics
  artifacts: ModelArtifact[]
  tags: string[]
  createdAt: number
  updatedAt: number
  createdBy?: string
}

export interface StageTransition {
  fromStage: ModelStage
  toStage: ModelStage
  at: number
  by?: string
  reason?: string
}

export interface ModelLineage {
  modelName: string
  rootVersionId: string
  versions: ModelVersion[]
  transitions: StageTransition[]
  productionVersionId?: string
}

export interface ModelRegistryStats {
  totalModels: number
  totalVersions: number
  byStage: Record<ModelStage, number>
  totalArtifactBytes: number
  productionModels: number
}

const STAGE_ORDER: ModelStage[] = ['dev', 'staging', 'production', 'archived']

const canTransition = (from: ModelStage, to: ModelStage): boolean => {
  if (from === to) return false
  if (from === 'archived') return false
  if (to === 'dev') return false
  if (to === 'archived') return true
  const fromIdx = STAGE_ORDER.indexOf(from)
  const toIdx = STAGE_ORDER.indexOf(to)
  return toIdx - fromIdx === 1
}

let _modelCounter = 0
let _artifactCounter = 0
const newVersionId = (name: string, version: number) => 'mver_' + name + '_v' + version + '_' + (++_modelCounter).toString(36)
const newArtifactId = () => 'art_' + Date.now().toString(36) + '_' + (++_artifactCounter).toString(36).padStart(3, '0')

const simpleChecksum = (bytes: Uint8Array): string => {
  let h = 5381
  for (let i = 0; i < bytes.length; i++) h = ((h * 33) ^ bytes[i]) >>> 0
  return 'ck_' + h.toString(16).padStart(8, '0')
}

const utf8Bytes = (s: string): Uint8Array => new TextEncoder().encode(s)

export class ModelRegistry {
  private models = new Map<string, ModelVersion[]>() // name -> versions, sorted by version desc
  private transitions = new Map<string, StageTransition[]>() // versionId -> transitions
  private productionLock = new Map<string, string>() // name -> production versionId

  // ---- Register a new model version ----
  registerVersion(input: {
    modelName: string
    version?: number
    description?: string
    parentVersionId?: string
    featureGroupIds?: string[]
    framework?: string
    hyperparameters?: Record<string, unknown>
    metrics?: ModelMetrics
    tags?: string[]
    createdBy?: string
  }): ModelVersion {
    const existing = this.models.get(input.modelName) ?? []
    const version = input.version ?? (existing.length === 0 ? 1 : Math.max(...existing.map(v => v.version)) + 1)
    if (existing.some(v => v.version === version)) {
      throw new Error('model ' + input.modelName + ' v' + version + ' already exists')
    }
    const now = Date.now()
    const mv: ModelVersion = {
      id: newVersionId(input.modelName, version),
      modelName: input.modelName,
      version,
      stage: 'dev',
      description: input.description,
      parentVersionId: input.parentVersionId,
      featureGroupIds: [...(input.featureGroupIds ?? [])],
      framework: input.framework,
      hyperparameters: input.hyperparameters ? { ...input.hyperparameters } : undefined,
      metrics: { ...(input.metrics ?? {}) },
      artifacts: [],
      tags: [...(input.tags ?? [])],
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    }
    existing.push(mv)
    existing.sort((a, b) => b.version - a.version)
    this.models.set(input.modelName, existing)
    this.transitions.set(mv.id, [{ fromStage: 'dev', toStage: 'dev', at: now, by: input.createdBy, reason: 'initial registration' }])
    return mv
  }

  getVersion(modelName: string, version: number): ModelVersion | undefined {
    return (this.models.get(modelName) ?? []).find(v => v.version === version)
  }

  getVersionById(id: string): ModelVersion | undefined {
    for (const list of this.models.values()) {
      const v = list.find(x => x.id === id)
      if (v) return v
    }
    return undefined
  }

  listVersions(modelName: string): ModelVersion[] {
    return [...(this.models.get(modelName) ?? [])]
  }

  listModelNames(): string[] {
    return Array.from(this.models.keys())
  }

  search(query: { name?: string; tag?: string; stage?: ModelStage; framework?: string }): ModelVersion[] {
    const out: ModelVersion[] = []
    for (const list of this.models.values()) {
      for (const v of list) {
        if (query.name && !v.modelName.includes(query.name)) continue
        if (query.tag && !v.tags.includes(query.tag)) continue
        if (query.stage && v.stage !== query.stage) continue
        if (query.framework && v.framework !== query.framework) continue
        out.push(v)
      }
    }
    return out
  }

  // ---- Stage transitions ----
  transitionStage(modelName: string, version: number, toStage: ModelStage, opts: { by?: string; reason?: string; force?: boolean } = {}): ModelVersion {
    const v = this.getVersion(modelName, version)
    if (!v) throw new Error('model version not found')
    if (v.stage === toStage) return v
    if (!opts.force && !canTransition(v.stage, toStage)) {
      throw new Error('invalid transition from ' + v.stage + ' to ' + toStage)
    }
    const from = v.stage
    v.stage = toStage
    v.updatedAt = Date.now()
    const tx: StageTransition = { fromStage: from, toStage, at: v.updatedAt, by: opts.by, reason: opts.reason }
    const list = this.transitions.get(v.id) ?? []
    list.push(tx)
    this.transitions.set(v.id, list)
    if (toStage === 'production') {
      this.productionLock.set(modelName, v.id)
    } else if (from === 'production') {
      const cur = this.productionLock.get(modelName)
      if (cur === v.id) this.productionLock.delete(modelName)
    }
    return v
  }

  getTransitions(versionId: string): StageTransition[] {
    return [...(this.transitions.get(versionId) ?? [])]
  }

  getProductionVersion(modelName: string): ModelVersion | undefined {
    const id = this.productionLock.get(modelName)
    if (!id) return undefined
    return this.getVersionById(id)
  }

  promoteToProduction(modelName: string, version: number, by?: string): ModelVersion {
    return this.transitionStage(modelName, version, 'production', { by, reason: 'promote' })
  }

  archive(modelName: string, version: number, by?: string): ModelVersion {
    return this.transitionStage(modelName, version, 'archived', { by, reason: 'archive' })
  }

  // ---- Artifacts ----
  addArtifact(modelName: string, version: number, input: { type: ArtifactType; filename: string; mimeType?: string; data: Uint8Array }): ModelArtifact {
    const v = this.getVersion(modelName, version)
    if (!v) throw new Error('model version not found')
    const data = input.data instanceof Uint8Array ? input.data : utf8Bytes(String(input.data))
    const artifact: ModelArtifact = {
      id: newArtifactId(),
      type: input.type,
      filename: input.filename,
      mimeType: input.mimeType ?? 'application/octet-stream',
      size: data.length,
      data,
      checksum: simpleChecksum(data),
      createdAt: Date.now(),
    }
    v.artifacts.push(artifact)
    v.updatedAt = Date.now()
    return artifact
  }

  addTextArtifact(modelName: string, version: number, type: ArtifactType, filename: string, text: string): ModelArtifact {
    return this.addArtifact(modelName, version, { type, filename, data: utf8Bytes(text), mimeType: 'text/plain' })
  }

  getArtifact(versionId: string, artifactId: string): ModelArtifact | undefined {
    const v = this.getVersionById(versionId)
    return v?.artifacts.find(a => a.id === artifactId)
  }

  removeArtifact(versionId: string, artifactId: string): boolean {
    const v = this.getVersionById(versionId)
    if (!v) return false
    const idx = v.artifacts.findIndex(a => a.id === artifactId)
    if (idx < 0) return false
    v.artifacts.splice(idx, 1)
    v.updatedAt = Date.now()
    return true
  }

  // ---- Lineage ----
  getLineage(modelName: string): ModelLineage {
    const versions = this.listVersions(modelName)
    if (versions.length === 0) throw new Error('model not found: ' + modelName)
    const root = versions[versions.length - 1]
    const allTransitions: StageTransition[] = []
    for (const v of versions) allTransitions.push(...this.getTransitions(v.id))
    allTransitions.sort((a, b) => a.at - b.at)
    return {
      modelName,
      rootVersionId: root.id,
      versions,
      transitions: allTransitions,
      productionVersionId: this.productionLock.get(modelName),
    }
  }

  // ---- Stats ----
  stats(): ModelRegistryStats {
    const byStage: Record<ModelStage, number> = { dev: 0, staging: 0, production: 0, archived: 0 }
    let totalVersions = 0
    let totalArtifactBytes = 0
    for (const list of this.models.values()) {
      for (const v of list) {
        byStage[v.stage] += 1
        totalVersions += 1
        for (const a of v.artifacts) totalArtifactBytes += a.size
      }
    }
    return {
      totalModels: this.models.size,
      totalVersions,
      byStage,
      totalArtifactBytes,
      productionModels: byStage.production,
    }
  }

  clear(): void {
    this.models.clear()
    this.transitions.clear()
    this.productionLock.clear()
  }
}

let _registrySingleton: ModelRegistry | null = null
export function getModelRegistry(): ModelRegistry {
  if (!_registrySingleton) _registrySingleton = new ModelRegistry()
  return _registrySingleton
}
export function resetModelRegistry(): void {
  if (_registrySingleton) _registrySingleton.clear()
  _registrySingleton = null
}
