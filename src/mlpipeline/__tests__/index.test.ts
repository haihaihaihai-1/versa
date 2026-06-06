import { describe, it, expect } from 'vitest'
import {
  mean, variance, stddev, correlation,
  fitStandardScaler, applyScaler, fitMinMaxScaler, fitRobustScaler,
  oneHotEncode, polynomialFeatures, trainTestSplit,
  regressionMetrics, classificationMetrics,
  LinearRegression, LogisticRegression, KNN, NaiveBayes, DecisionTree,
  crossValidate, gridSearch,
  MLPipeline, irisLike, linearLike,
  registerModel, getModel, listModels, clearRegistry,
} from '../index'

describe('Statistics', () => {
  it('mean handles empty', () => { expect(mean([])).toBe(0) })
  it('mean', () => { expect(mean([1, 2, 3, 4, 5])).toBe(3) })
  it('variance', () => { expect(variance([1, 1, 1])).toBe(0) })
  it('stddev', () => { expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 1) })
  it('correlation self = 1', () => { expect(correlation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5) })
  it('correlation unequal length', () => { expect(correlation([1, 2], [1, 2, 3])).toBe(0) })
})

describe('Scalers', () => {
  const X = [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50]]
  it('standard scaler centers to 0', () => {
    const s = fitStandardScaler(X)
    const out = applyScaler(s, X)
    expect(mean(out.map(r => r[0]))).toBeCloseTo(0, 5)
  })
  it('minmax scaler ranges [0, 1]', () => {
    const s = fitMinMaxScaler(X)
    const out = applyScaler(s, X)
    expect(Math.min(...out.map(r => r[0]))).toBeCloseTo(0, 5)
    expect(Math.max(...out.map(r => r[0]))).toBeCloseTo(1, 5)
  })
  it('robust scaler handles outliers', () => {
    const s = fitRobustScaler([[1], [2], [3], [100]])
    const out = applyScaler(s, [[50]])
    expect(out[0][0]).toBeGreaterThan(0)
  })
})

describe('Encoders', () => {
  it('oneHotEncode 3 categories', () => {
    const { encoded, categories } = oneHotEncode(['a', 'b', 'a', 'c'])
    expect(categories).toHaveLength(3)
    expect(encoded).toHaveLength(4)
    expect(encoded[0]).toEqual([1, 0, 0])
    expect(encoded[3]).toEqual([0, 0, 1])
  })
  it('polynomialFeatures degree 2 adds bias', () => {
    const out = polynomialFeatures([[1, 2]], 2)
    expect(out[0][0]).toBe(1)
    expect(out[0]).toHaveLength(1 + 2 + 3)  // bias + degree1 + combinations
  })
})

describe('Train/test split', () => {
  it('splits at correct ratio', () => {
    const X = Array.from({ length: 100 }, (_, i) => [i])
    const y = Array.from({ length: 100 }, (_, i) => i)
    const { XTrain, XTest, yTrain, yTest } = trainTestSplit(X, y, 0.2)
    expect(XTrain).toHaveLength(80)
    expect(XTest).toHaveLength(20)
    expect(yTrain).toHaveLength(80)
  })
  it('deterministic with seed', () => {
    const X = Array.from({ length: 20 }, (_, i) => [i])
    const y = Array.from({ length: 20 }, (_, i) => i)
    const a = trainTestSplit(X, y, 0.5, 7)
    const b = trainTestSplit(X, y, 0.5, 7)
    expect(a.XTrain[0]).toEqual(b.XTrain[0])
  })
})

describe('Metrics', () => {
  it('regressionMetrics perfect prediction', () => {
    const m = regressionMetrics([1, 2, 3], [1, 2, 3])
    expect(m.mse).toBe(0); expect(m.r2).toBe(1)
  })
  it('regressionMetrics with errors', () => {
    const m = regressionMetrics([1, 2, 3], [2, 2, 3])
    expect(m.mse).toBeCloseTo(0.333, 2)
  })
  it('classificationMetrics binary', () => {
    const m = classificationMetrics([1, 1, 0, 0], [1, 0, 0, 0])
    expect(m.accuracy).toBe(0.75)
    expect(m.confusionMatrix).toEqual([[1, 0], [1, 2]])
  })
  it('classificationMetrics empty', () => {
    const m = classificationMetrics([], [])
    expect(m.accuracy).toBe(0)
  })
})

describe('LinearRegression', () => {
  it('fits simple y = 2x + 1', () => {
    const X = [[1], [2], [3], [4], [5]]
    const y = [3, 5, 7, 9, 11]
    const m = LinearRegression.fit(X, y)
    expect(m.predict([6])).toBeCloseTo(13, 0)
  })
  it('predictBatch', () => {
    const m = new LinearRegression([2], 1)
    expect(m.predictBatch([[1], [2]])).toEqual([3, 5])
  })
  it('serialize roundtrip', () => {
    const m = LinearRegression.fit([[1], [2]], [3, 5])
    const s = m.serialize()
    expect(s.type).toBe('linear-regression')
    expect(s.weights).toHaveLength(1)
  })
})

describe('LogisticRegression', () => {
  it('fits AND-like', () => {
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]]
    const y = [0, 0, 0, 1]
    const m = LogisticRegression.fit(X, y, 0.5, 2000)
    expect(m.predict([1, 1])).toBe(1)
    expect(m.predict([0, 0])).toBe(0)
  })
  it('predictProba in [0, 1]', () => {
    const m = LogisticRegression.fit([[1], [2]], [0, 1], 0.1, 100)
    expect(m.predictProba([1.5])).toBeGreaterThanOrEqual(0)
    expect(m.predictProba([1.5])).toBeLessThanOrEqual(1)
  })
  it('serialize', () => {
    const m = LogisticRegression.fit([[1], [2]], [0, 1])
    expect(m.serialize().type).toBe('logistic-regression')
  })
})

describe('KNN', () => {
  it('predicts nearest neighbor', () => {
    const X = [[0], [1], [10], [11]]
    const y = [0, 0, 1, 1]
    const m = KNN.fit(X, y, 1)
    expect(m.predict([0.5])).toBe(0)
    expect(m.predict([10.5])).toBe(1)
  })
  it('k=3 majority vote', () => {
    const X = [[0], [1], [2], [10]]
    const y = [0, 0, 1, 1]
    const m = KNN.fit(X, y, 3)
    // predict [0]: 0 is closest to 0 (y=0); k=3 → [0,0,1] → majority 0
    // predict [1]: closest to 1 (y=0); k=3 → [0,0,1] → majority 0
    // predict [2]: closest to 2 (y=1); k=3 → [1,0,0] → majority 0
    expect(m.predict([0])).toBe(0)
    expect(m.predict([1])).toBe(0)
    expect(m.predict([2])).toBe(0)
  })
  it('empty training returns 0', () => {
    const m = KNN.fit([], [])
    expect(m.predict([1])).toBe(0)
  })
})

describe('NaiveBayes', () => {
  it('classifies gaussian blobs', () => {
    const X: number[][] = []
    const y: number[] = []
    for (let i = 0; i < 20; i++) { X.push([i, i + 0.1]); y.push(0) }
    for (let i = 0; i < 20; i++) { X.push([i + 100, i + 100]); y.push(1) }
    const m = NaiveBayes.fit(X, y)
    expect(m.predict([0, 0])).toBe(0)
    expect(m.predict([100, 100])).toBe(1)
  })
  it('empty training returns 0', () => {
    expect(NaiveBayes.fit([], []).predict([1, 2])).toBe(0)
  })
})

describe('DecisionTree', () => {
  it('splits binary AND', () => {
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]]
    const y = [0, 0, 0, 1]
    const m = DecisionTree.fit(X, y, 5)
    expect(m.predict([1, 1])).toBe(1)
  })
  it('serialize', () => {
    const m = DecisionTree.fit([[1], [2]], [0, 1])
    expect(m.serialize().type).toBe('decision-tree')
  })
  it('all-same class', () => {
    const m = DecisionTree.fit([[1], [2], [3]], [1, 1, 1])
    expect(m.predict([5])).toBe(1)
  })
})

describe('Cross-validation', () => {
  it('5-fold splits into 5 scores', () => {
    const X = Array.from({ length: 50 }, (_, i) => [i])
    const y = Array.from({ length: 50 }, (_, i) => i < 25 ? 0 : 1)
    const result = crossValidate(X, y,
      (xt, yt) => KNN.fit(xt, yt, 5),
      (m, x) => m.predictBatch(x),
      5,
    )
    expect(result.scores).toHaveLength(5)
    expect(result.mean).toBeGreaterThan(0.5)
  })
})

describe('Grid search', () => {
  it('finds best k for KNN', () => {
    const X: number[][] = []
    const y: number[] = []
    for (let i = 0; i < 20; i++) { X.push([i]); y.push(0) }
    for (let i = 0; i < 20; i++) { X.push([i + 100]); y.push(1) }
    const result = gridSearch(
      { k: [1, 3, 5, 7] },
      X, y,
      (xt, yt, p) => KNN.fit(xt, yt, p.k as number),
      (m, x) => m.predictBatch(x),
    )
    expect(result.results).toHaveLength(4)
    expect(result.bestParams.k).toBeDefined()
    expect(result.bestScore).toBeGreaterThan(0.5)
  })
})

describe('MLPipeline', () => {
  it('runs classification end-to-end', () => {
    const data = irisLike()
    const r = MLPipeline.run(data, { scaler: 'standard', model: 'logistic', testSize: 0.3, seed: 1, logregLr: 0.5, logregIter: 200 })
    expect(r.trainSize).toBe(21)
    expect(r.testSize).toBe(9)
    expect(r.isClassification).toBe(true)
  })
  it('runs regression end-to-end', () => {
    const data = linearLike()
    const r = MLPipeline.run(data, { scaler: 'standard', model: 'linear', testSize: 0.2, seed: 1 })
    expect(r.isClassification).toBe(false)
    const m = r.metrics as ReturnType<typeof regressionMetrics>
    expect(m.r2).toBeGreaterThan(0.9)
  })
})

describe('Model registry', () => {
  it('register / get / list / clear', () => {
    clearRegistry()
    const m = LinearRegression.fit([[1], [2]], [3, 5])
    registerModel('lr1', m)
    expect(getModel('lr1')).toBe(m)
    expect(listModels()).toContain('lr1')
    clearRegistry()
    expect(listModels()).toHaveLength(0)
  })
})
