// v64.0 ML Pipeline — features, models (linear regression, logistic regression,
// k-nearest neighbors, decision tree, Naive Bayes), train/test split, evaluation,
// cross-validation, hyperparameter grid search, pipeline orchestration

export type FeatureValue = number
export type Feature = number[]  // one sample
export type Dataset = { X: Feature[]; y: number[]; featureNames?: string[] }

// ─────────────────────────────────────────────────────────────────────────────
// Statistics helpers

export function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length
}

export function variance(arr: number[]): number {
  if (arr.length === 0) return 0
  const m = mean(arr)
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length
}

export function stddev(arr: number[]): number {
  return Math.sqrt(variance(arr))
}

export function correlation(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  const ma = mean(a), mb = mean(b)
  let num = 0, da = 0, db = 0
  for (let i = 0; i < a.length; i++) {
    const xa = a[i] - ma, xb = b[i] - mb
    num += xa * xb
    da += xa * xa
    db += xb * xb
  }
  const den = Math.sqrt(da * db)
  return den === 0 ? 0 : num / den
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature engineering

export interface FeatureScaler {
  type: 'standard' | 'minmax' | 'robust'
  mean?: number[]
  std?: number[]
  min?: number[]
  max?: number[]
  median?: number[]
  iqr?: number[]
}

export function fitStandardScaler(X: Feature[]): FeatureScaler {
  if (X.length === 0) return { type: 'standard' }
  const cols = X[0].length
  const m: number[] = new Array(cols).fill(0)
  const s: number[] = new Array(cols).fill(0)
  for (const row of X) for (let i = 0; i < cols; i++) m[i] += row[i]
  for (let i = 0; i < cols; i++) m[i] /= X.length
  for (const row of X) for (let i = 0; i < cols; i++) s[i] += (row[i] - m[i]) ** 2
  for (let i = 0; i < cols; i++) s[i] = Math.sqrt(s[i] / X.length)
  return { type: 'standard', mean: m, std: s }
}

export function applyScaler(scaler: FeatureScaler, X: Feature[]): Feature[] {
  return X.map(row => row.map((v, i) => {
    if (scaler.type === 'standard') {
      const sd = scaler.std![i]
      return sd === 0 ? 0 : (v - scaler.mean![i]) / sd
    } else if (scaler.type === 'minmax') {
      const range = scaler.max![i] - scaler.min![i]
      return range === 0 ? 0 : (v - scaler.min![i]) / range
    } else {
      const iqr = scaler.iqr![i]
      return iqr === 0 ? 0 : (v - scaler.median![i]) / iqr
    }
  }))
}

export function fitMinMaxScaler(X: Feature[]): FeatureScaler {
  if (X.length === 0) return { type: 'minmax' }
  const cols = X[0].length
  const min: number[] = new Array(cols).fill(Infinity)
  const max: number[] = new Array(cols).fill(-Infinity)
  for (const row of X) for (let i = 0; i < cols; i++) { if (row[i] < min[i]) min[i] = row[i]; if (row[i] > max[i]) max[i] = row[i] }
  return { type: 'minmax', min, max }
}

export function fitRobustScaler(X: Feature[]): FeatureScaler {
  if (X.length === 0) return { type: 'robust' }
  const cols = X[0].length
  const median: number[] = new Array(cols).fill(0)
  const iqr: number[] = new Array(cols).fill(0)
  for (let i = 0; i < cols; i++) {
    const sorted = X.map(r => r[i]).sort((a, b) => a - b)
    median[i] = sorted[Math.floor(sorted.length / 2)]
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    iqr[i] = q3 - q1
  }
  return { type: 'robust', median, iqr }
}

// One-hot encode categorical
export function oneHotEncode(values: string[]): { encoded: number[][]; categories: string[] } {
  const cats = Array.from(new Set(values))
  const idx: Record<string, number> = {}
  cats.forEach((c, i) => idx[c] = i)
  const encoded = values.map(v => {
    const row = new Array(cats.length).fill(0)
    row[idx[v]] = 1
    return row
  })
  return { encoded, categories: cats }
}

// Polynomial features (degree) — includes all monomials with repetition
export function polynomialFeatures(X: Feature[], degree: number): Feature[] {
  if (X.length === 0 || X[0].length === 0) return X
  const cols = X[0].length
  return X.map(row => {
    const out: number[] = [1] // bias
    for (let d = 1; d <= degree; d++) {
      const terms = combinationsWithRep(row, d)
      for (const t of terms) out.push(t)
    }
    return out
  })
}

function combinationsWithRep(arr: number[], k: number): number[] {
  if (k === 0) return [1]
  const result: number[] = []
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(i)
    const sub = combinationsWithRep(rest, k - 1)
    for (const s of sub) result.push(arr[i] * s)
  }
  return result
}

// Train/test split
export function trainTestSplit(X: Feature[], y: number[], testSize = 0.2, seed = 42): { XTrain: Feature[]; XTest: Feature[]; yTrain: number[]; yTest: number[] } {
  const n = X.length
  const indices = Array.from({ length: n }, (_, i) => i)
  // deterministic shuffle
  let s = seed
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const splitIdx = Math.floor(n * (1 - testSize))
  const trainIdx = indices.slice(0, splitIdx)
  const testIdx = indices.slice(splitIdx)
  return {
    XTrain: trainIdx.map(i => X[i]),
    XTest: testIdx.map(i => X[i]),
    yTrain: trainIdx.map(i => y[i]),
    yTest: testIdx.map(i => y[i]),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation

export interface RegressionMetrics {
  mse: number; rmse: number; mae: number; r2: number
}

export function regressionMetrics(yTrue: number[], yPred: number[]): RegressionMetrics {
  if (yTrue.length === 0) return { mse: 0, rmse: 0, mae: 0, r2: 0 }
  const n = yTrue.length
  let sse = 0, sae = 0
  for (let i = 0; i < n; i++) {
    const diff = yTrue[i] - yPred[i]
    sse += diff * diff
    sae += Math.abs(diff)
  }
  const mse = sse / n
  const rmse = Math.sqrt(mse)
  const mae = sae / n
  const m = mean(yTrue)
  let sst = 0
  for (let i = 0; i < n; i++) sst += (yTrue[i] - m) ** 2
  const r2 = sst === 0 ? 0 : 1 - sse / sst
  return { mse, rmse, mae, r2 }
}

export interface ClassificationMetrics {
  accuracy: number; precision: number; recall: number; f1: number
  confusionMatrix: number[][]  // [[TP, FP], [FN, TN]]
}

export function classificationMetrics(yTrue: number[], yPred: number[]): ClassificationMetrics {
  if (yTrue.length === 0) return { accuracy: 0, precision: 0, recall: 0, f1: 0, confusionMatrix: [[0, 0], [0, 0]] }
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++
    else if (yTrue[i] === 1 && yPred[i] === 0) fn++
    else tn++
  }
  const accuracy = (tp + tn) / yTrue.length
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn)
  const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall)
  return { accuracy, precision, recall, f1, confusionMatrix: [[tp, fp], [fn, tn]] }
}

// ─────────────────────────────────────────────────────────────────────────────
// Models

export interface MLModel {
  type: string
  predict(X: Feature): number  // single sample
  predictBatch(X: Feature[]): number[]
  serialize(): Record<string, unknown>
}

// Linear regression via normal equation
export class LinearRegression implements MLModel {
  type = 'linear-regression'
  weights: number[]
  bias: number

  constructor(weights: number[] = [], bias = 0) {
    this.weights = weights
    this.bias = bias
  }

  static fit(X: Feature[], y: number[]): LinearRegression {
    if (X.length === 0) return new LinearRegression([], 0)
    const cols = X[0].length
    // Add bias column
    const Xb: number[][] = X.map(r => [1, ...r])
    // Normal equation: (X^T X)^-1 X^T y
    const XtX = matMul(transpose(Xb), Xb)
    const XtY = matVec(transpose(Xb), y)
    const inv = matInverse(XtX)
    if (!inv) {
      // Fallback to simple linear regression y = ax + b (use first feature)
      const a = correlation(X.map(r => r[0] ?? 0), y)
      const ma = mean(X.map(r => r[0] ?? 0))
      const my = mean(y)
      const sd = stddev(X.map(r => r[0] ?? 0))
      const slope = sd === 0 ? 0 : a * (stddev(y) / sd)
      return new LinearRegression([slope], my - slope * ma)
    }
    const w = matVec(inv, XtY)
    return new LinearRegression(w.slice(1), w[0])
  }

  predict(x: Feature): number {
    let s = this.bias
    for (let i = 0; i < this.weights.length; i++) s += this.weights[i] * (x[i] ?? 0)
    return s
  }

  predictBatch(X: Feature[]): number[] { return X.map(x => this.predict(x)) }

  serialize() { return { type: this.type, weights: this.weights, bias: this.bias } }
}

// Logistic regression with gradient descent
export class LogisticRegression implements MLModel {
  type = 'logistic-regression'
  weights: number[]
  bias: number
  lr: number
  iterations: number

  constructor(weights: number[] = [], bias = 0, lr = 0.1, iterations = 1000) {
    this.weights = weights
    this.bias = bias
    this.lr = lr
    this.iterations = iterations
  }

  static sigmoid(z: number): number { return 1 / (1 + Math.exp(-z)) }

  static fit(X: Feature[], y: number[], lr = 0.1, iterations = 1000): LogisticRegression {
    if (X.length === 0) return new LogisticRegression([], 0, lr, iterations)
    const cols = X[0].length
    const w = new Array(cols).fill(0)
    let b = 0
    for (let iter = 0; iter < iterations; iter++) {
      const gradW = new Array(cols).fill(0)
      let gradB = 0
      for (let i = 0; i < X.length; i++) {
        const z = b + X[i].reduce((s, v, j) => s + v * w[j], 0)
        const p = LogisticRegression.sigmoid(z)
        const err = p - y[i]
        for (let j = 0; j < cols; j++) gradW[j] += err * X[i][j]
        gradB += err
      }
      for (let j = 0; j < cols; j++) w[j] -= (lr / X.length) * gradW[j]
      b -= (lr / X.length) * gradB
    }
    return new LogisticRegression(w, b, lr, iterations)
  }

  predict(x: Feature): number {
    const z = this.bias + this.weights.reduce((s, v, i) => s + v * (x[i] ?? 0), 0)
    return LogisticRegression.sigmoid(z) >= 0.5 ? 1 : 0
  }

  predictProba(x: Feature): number {
    const z = this.bias + this.weights.reduce((s, v, i) => s + v * (x[i] ?? 0), 0)
    return LogisticRegression.sigmoid(z)
  }

  predictBatch(X: Feature[]): number[] { return X.map(x => this.predict(x)) }

  serialize() { return { type: this.type, weights: this.weights, bias: this.bias, lr: this.lr, iterations: this.iterations } }
}

// k-Nearest Neighbors
export class KNN implements MLModel {
  type = 'knn'
  trainX: Feature[]
  trainY: number[]
  k: number

  constructor(trainX: Feature[] = [], trainY: number[] = [], k = 3) {
    this.trainX = trainX
    this.trainY = trainY
    this.k = k
  }

  static fit(X: Feature[], y: number[], k = 3): KNN {
    return new KNN(X.slice(), y.slice(), k)
  }

  private distance(a: Feature, b: Feature): number {
    let s = 0
    for (let i = 0; i < a.length; i++) s += (a[i] - (b[i] ?? 0)) ** 2
    return Math.sqrt(s)
  }

  predict(x: Feature): number {
    if (this.trainX.length === 0) return 0
    const dists = this.trainX.map((tx, i) => ({ d: this.distance(tx, x), y: this.trainY[i] }))
    dists.sort((a, b) => a.d - b.d)
    const k = Math.min(this.k, dists.length)
    // Mean for regression, mode for classification
    const isClassification = dists.some(d => d.y === 0 || d.y === 1) && dists.every(d => d.y === 0 || d.y === 1)
    if (isClassification) {
      let pos = 0, neg = 0
      for (let i = 0; i < k; i++) { if (dists[i].y === 1) pos++; else neg++ }
      return pos >= neg ? 1 : 0
    }
    let s = 0
    for (let i = 0; i < k; i++) s += dists[i].y
    return s / k
  }

  predictBatch(X: Feature[]): number[] { return X.map(x => this.predict(x)) }

  serialize() { return { type: this.type, k: this.k, trainSize: this.trainX.length } }
}

// Naive Bayes (Gaussian)
export class NaiveBayes implements MLModel {
  type = 'naive-bayes'
  classStats: Map<number, { count: number; mean: number[]; variance: number[] }> = new Map()
  classPriors: Map<number, number> = new Map()

  static fit(X: Feature[], y: number[]): NaiveBayes {
    const model = new NaiveBayes()
    if (X.length === 0) return model
    const cols = X[0].length
    const byClass: Map<number, Feature[]> = new Map()
    for (let i = 0; i < X.length; i++) {
      if (!byClass.has(y[i])) byClass.set(y[i], [])
      byClass.get(y[i])!.push(X[i])
    }
    for (const [cls, samples] of byClass) {
      const m: number[] = new Array(cols).fill(0)
      for (const s of samples) for (let j = 0; j < cols; j++) m[j] += s[j]
      for (let j = 0; j < cols; j++) m[j] /= samples.length
      const v: number[] = new Array(cols).fill(0)
      for (const s of samples) for (let j = 0; j < cols; j++) v[j] += (s[j] - m[j]) ** 2
      for (let j = 0; j < cols; j++) v[j] = v[j] / samples.length + 1e-9  // smoothing
      model.classStats.set(cls, { count: samples.length, mean: m, variance: v })
      model.classPriors.set(cls, samples.length / X.length)
    }
    return model
  }

  private gaussianPdf(x: number, m: number, v: number): number {
    return Math.exp(-((x - m) ** 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v)
  }

  predict(x: Feature): number {
    if (this.classStats.size === 0) return 0
    let bestCls = 0
    let bestScore = -Infinity
    for (const [cls, stats] of this.classStats) {
      let logP = Math.log(this.classPriors.get(cls) ?? 0.5)
      for (let j = 0; j < x.length; j++) {
        logP += Math.log(this.gaussianPdf(x[j], stats.mean[j], stats.variance[j]) + 1e-12)
      }
      if (logP > bestScore) { bestScore = logP; bestCls = cls }
    }
    return bestCls
  }

  predictBatch(X: Feature[]): number[] { return X.map(x => this.predict(x)) }

  serialize() { return { type: this.type, classes: Array.from(this.classStats.keys()) } }
}

// Decision Tree (ID3-style, simple, depth-limited)
export class DecisionTree implements MLModel {
  type = 'decision-tree'
  root: TreeNode | null = null
  maxDepth: number

  constructor(maxDepth = 5) { this.maxDepth = maxDepth }

  static fit(X: Feature[], y: number[], maxDepth = 5): DecisionTree {
    const tree = new DecisionTree(maxDepth)
    tree.root = tree.buildTree(X, y, 0)
    return tree
  }

  private entropy(y: number[]): number {
    const counts: Record<number, number> = {}
    for (const v of y) counts[v] = (counts[v] ?? 0) + 1
    const total = y.length
    let h = 0
    for (const c of Object.values(counts)) {
      const p = c / total
      if (p > 0) h -= p * Math.log2(p)
    }
    return h
  }

  private bestSplit(X: Feature[], y: number[]): { feature: number; threshold: number; gain: number } {
    const baseEntropy = this.entropy(y)
    let bestGain = 0, bestFeature = 0, bestThreshold = 0
    if (X.length === 0) return { feature: 0, threshold: 0, gain: 0 }
    const cols = X[0].length
    for (let f = 0; f < cols; f++) {
      const values = Array.from(new Set(X.map(r => r[f]))).sort((a, b) => a - b)
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2
        const leftY = y.filter((_, j) => X[j][f] <= threshold)
        const rightY = y.filter((_, j) => X[j][f] > threshold)
        if (leftY.length === 0 || rightY.length === 0) continue
        const gain = baseEntropy - (leftY.length / y.length) * this.entropy(leftY) - (rightY.length / y.length) * this.entropy(rightY)
        if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = threshold }
      }
    }
    return { feature: bestFeature, threshold: bestThreshold, gain: bestGain }
  }

  private majorityClass(y: number[]): number {
    const counts: Record<number, number> = {}
    for (const v of y) counts[v] = (counts[v] ?? 0) + 1
    return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)
  }

  private buildTree(X: Feature[], y: number[], depth: number): TreeNode {
    if (depth >= this.maxDepth || new Set(y).size === 1) {
      return { leaf: true, value: this.majorityClass(y) }
    }
    const split = this.bestSplit(X, y)
    if (split.gain === 0) {
      return { leaf: true, value: this.majorityClass(y) }
    }
    const leftX: Feature[] = [], leftY: number[] = [], rightX: Feature[] = [], rightY: number[] = []
    for (let i = 0; i < X.length; i++) {
      if (X[i][split.feature] <= split.threshold) { leftX.push(X[i]); leftY.push(y[i]) }
      else { rightX.push(X[i]); rightY.push(y[i]) }
    }
    return {
      leaf: false,
      feature: split.feature,
      threshold: split.threshold,
      left: leftX.length > 0 ? this.buildTree(leftX, leftY, depth + 1) : { leaf: true, value: this.majorityClass(y) },
      right: rightX.length > 0 ? this.buildTree(rightX, rightY, depth + 1) : { leaf: true, value: this.majorityClass(y) },
    }
  }

  private traverse(node: TreeNode, x: Feature): number {
    if (node.leaf) return node.value!
    return x[node.feature!]! <= node.threshold! ? this.traverse(node.left!, x) : this.traverse(node.right!, x)
  }

  predict(x: Feature): number { return this.root ? this.traverse(this.root, x) : 0 }
  predictBatch(X: Feature[]): number[] { return X.map(x => this.predict(x)) }

  serialize() { return { type: this.type, maxDepth: this.maxDepth, root: this.root } }
}

interface TreeNode {
  leaf: boolean
  value?: number
  feature?: number
  threshold?: number
  left?: TreeNode
  right?: TreeNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix utilities

function transpose(M: number[][]): number[][] {
  if (M.length === 0) return []
  return M[0].map((_, i) => M.map(r => r[i]))
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0))
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++) C[i][j] += A[i][k] * B[k][j]
  return C
}

function matVec(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, x, i) => s + x * (v[i] ?? 0), 0))
}

function matInverse(M: number[][]): number[][] | null {
  const n = M.length
  if (n === 0 || M[0].length !== n) return null
  const A: number[][] = M.map(r => [...r])
  const I: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0))
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k
    ;[A[i], A[maxRow]] = [A[maxRow], A[i]]
    ;[I[i], I[maxRow]] = [I[maxRow], I[i]]
    const pivot = A[i][i]
    if (Math.abs(pivot) < 1e-12) return null
    for (let k = 0; k < n; k++) { A[i][k] /= pivot; I[i][k] /= pivot }
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const f = A[k][i]
        for (let j = 0; j < n; j++) { A[k][j] -= f * A[i][j]; I[k][j] -= f * I[i][j] }
      }
    }
  }
  return I
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-validation

export function crossValidate(
  X: Feature[], y: number[],
  modelFn: (X: Feature[], y: number[]) => MLModel,
  predictFn: (model: MLModel, X: Feature[]) => number[],
  k = 5,
  seed = 42,
): { scores: number[]; mean: number; std: number } {
  const n = X.length
  const indices = Array.from({ length: n }, (_, i) => i)
  let s = seed
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const foldSize = Math.floor(n / k)
  const scores: number[] = []
  for (let fold = 0; fold < k; fold++) {
    const testIdx = indices.slice(fold * foldSize, (fold + 1) * foldSize)
    const trainIdx = indices.filter(i => !testIdx.includes(i))
    const Xt = trainIdx.map(i => X[i])
    const yt = trainIdx.map(i => y[i])
    const Xv = testIdx.map(i => X[i])
    const yv = testIdx.map(i => y[i])
    const model = modelFn(Xt, yt)
    const yp = predictFn(model, Xv)
    let correct = 0
    for (let i = 0; i < yv.length; i++) if (yv[i] === yp[i]) correct++
    scores.push(correct / yv.length)
  }
  const m = mean(scores)
  return { scores, mean: m, std: stddev(scores) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid search

export interface GridSearchResult<T> {
  bestParams: T
  bestScore: number
  results: Array<{ params: T; score: number }>
}

export function gridSearch<T extends Record<string, unknown>>(
  paramGrid: T,
  X: Feature[], y: number[],
  modelFn: (X: Feature[], y: number[], p: T) => MLModel,
  predictFn: (model: MLModel, X: Feature[]) => number[],
): GridSearchResult<T> {
  const keys = Object.keys(paramGrid) as (keyof T)[]
  const values = keys.map(k => paramGrid[k] as unknown[])
  const results: Array<{ params: T; score: number }> = []
  let bestScore = -Infinity
  let bestParams: T = {} as T

  const combos: T[] = []
  function gen(prefix: T, depth: number) {
    if (depth === keys.length) { combos.push({ ...prefix }); return }
    for (const v of values[depth]) {
      ;(prefix as Record<string, unknown>)[keys[depth] as string] = v
      gen(prefix, depth + 1)
    }
  }
  gen({} as T, 0)

  for (const params of combos) {
    const model = modelFn(X, y, params)
    const yp = predictFn(model, X)
    let correct = 0
    for (let i = 0; i < y.length; i++) if (y[i] === yp[i]) correct++
    const score = correct / y.length
    results.push({ params, score })
    if (score > bestScore) { bestScore = score; bestParams = params }
  }
  return { bestParams, bestScore, results }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline — orchestrates scaling → model training → evaluation

export interface PipelineConfig {
  scaler: 'standard' | 'minmax' | 'robust' | 'none'
  model: 'linear' | 'logistic' | 'knn' | 'naive-bayes' | 'decision-tree'
  testSize: number
  seed: number
  knnK?: number
  treeDepth?: number
  logregLr?: number
  logregIter?: number
}

export interface PipelineResult {
  model: MLModel
  metrics: RegressionMetrics | ClassificationMetrics
  trainSize: number
  testSize: number
  isClassification: boolean
}

export class MLPipeline {
  static run(data: Dataset, config: PipelineConfig): PipelineResult {
    let X = data.X
    if (config.scaler === 'standard') X = applyScaler(fitStandardScaler(X), X)
    else if (config.scaler === 'minmax') X = applyScaler(fitMinMaxScaler(X), X)
    else if (config.scaler === 'robust') X = applyScaler(fitRobustScaler(X), X)

    const { XTrain, XTest, yTrain, yTest } = trainTestSplit(X, data.y, config.testSize, config.seed)

    const isClassification = config.model !== 'linear'
    let model: MLModel
    if (config.model === 'linear') model = LinearRegression.fit(XTrain, yTrain)
    else if (config.model === 'logistic') model = LogisticRegression.fit(XTrain, yTrain, config.logregLr ?? 0.1, config.logregIter ?? 1000)
    else if (config.model === 'knn') model = KNN.fit(XTrain, yTrain, config.knnK ?? 3)
    else if (config.model === 'naive-bayes') model = NaiveBayes.fit(XTrain, yTrain)
    else model = DecisionTree.fit(XTrain, yTrain, config.treeDepth ?? 5)

    const yPred = model.predictBatch(XTest)
    const metrics = isClassification
      ? classificationMetrics(yTest, yPred)
      : regressionMetrics(yTest, yPred)

    return { model, metrics, trainSize: XTrain.length, testSize: XTest.length, isClassification }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Model registry

const registry = new Map<string, MLModel>()
export function registerModel(name: string, model: MLModel): void { registry.set(name, model) }
export function getModel(name: string): MLModel | undefined { return registry.get(name) }
export function listModels(): string[] { return Array.from(registry.keys()) }
export function clearRegistry(): void { registry.clear() }

// ─────────────────────────────────────────────────────────────────────────────
// Sample datasets

export function irisLike(): Dataset {
  // 4 features, 3 classes (0/1/2), 30 samples
  const X: Feature[] = []
  const y: number[] = []
  for (let i = 0; i < 30; i++) {
    const cls = i < 10 ? 0 : i < 20 ? 1 : 2
    const base = cls * 2
    X.push([base + Math.random() * 0.5, base + Math.random() * 0.5, base + Math.random() * 0.5, base + Math.random() * 0.5])
    y.push(cls)
  }
  return { X, y, featureNames: ['f1', 'f2', 'f3', 'f4'] }
}

export function linearLike(): Dataset {
  // y = 3x + 1 + noise
  const X: Feature[] = []
  const y: number[] = []
  for (let i = 0; i < 50; i++) {
    const x = i
    X.push([x, x * 0.5])
    y.push(3 * x + 1 + (Math.random() - 0.5) * 5)
  }
  return { X, y, featureNames: ['x1', 'x2'] }
}
