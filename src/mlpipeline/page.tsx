import { useState } from 'react'
import {
  MLPipeline, mean, stddev, correlation,
  fitStandardScaler, applyScaler, oneHotEncode, polynomialFeatures, trainTestSplit,
  LinearRegression, LogisticRegression, KNN, NaiveBayes, DecisionTree,
  crossValidate, gridSearch,
  irisLike, linearLike, registerModel, listModels, clearRegistry,
} from './index'

const TABS = ['Pipeline', 'Models', 'Features', 'CV', 'GridSearch', 'Sample Data'] as const
type Tab = typeof TABS[number]

const MODELS = ['linear', 'logistic', 'knn', 'naive-bayes', 'decision-tree'] as const
type ModelName = typeof MODELS[number]
const SCALERS = ['none', 'standard', 'minmax', 'robust'] as const
type ScalerName = typeof SCALERS[number]

export default function MLPipelinePage() {
  const [tab, setTab] = useState<Tab>('Pipeline')
  const [model, setModel] = useState<ModelName>('logistic')
  const [scaler, setScaler] = useState<ScalerName>('standard')
  const [testSize, setTestSize] = useState('0.2')
  const [seed, setSeed] = useState('42')
  const [dataset, setDataset] = useState<'iris' | 'linear'>('iris')
  const [out, setOut] = useState('')

  const runPipeline = () => {
    const data = dataset === 'iris' ? irisLike() : linearLike()
    const r = MLPipeline.run(data, {
      scaler, model, testSize: Number(testSize), seed: Number(seed),
    })
    let text = `Dataset: ${dataset}, model: ${model}, scaler: ${scaler}\n`
    text += `Train: ${r.trainSize}, Test: ${r.testSize}, Type: ${r.isClassification ? 'classification' : 'regression'}\n`
      text += `Model serialized: ${JSON.stringify(r.model.serialize(), (k, v) => Array.isArray(v) && v.length > 20 ? `[${v.length} items]` : v)}\n`
    if (r.isClassification) {
      const m = r.metrics as ReturnType<typeof import('./index').classificationMetrics>
      text += `Accuracy: ${(m.accuracy * 100).toFixed(2)}%\n`
      text += `Precision: ${m.precision.toFixed(3)}, Recall: ${m.recall.toFixed(3)}, F1: ${m.f1.toFixed(3)}\n`
      text += `Confusion Matrix: ${JSON.stringify(m.confusionMatrix)}\n`
    } else {
      const m = r.metrics as ReturnType<typeof import('./index').regressionMetrics>
      text += `MSE: ${m.mse.toFixed(3)}, RMSE: ${m.rmse.toFixed(3)}, MAE: ${m.mae.toFixed(3)}\n`
      text += `R²: ${m.r2.toFixed(4)}\n`
    }
    setOut(text)
  }

  const runCV = () => {
    const data = dataset === 'iris' ? irisLike() : linearLike()
    const result = crossValidate(data.X, data.y,
      (xt, yt) => KNN.fit(xt, yt, 5),
      (m, x) => m.predictBatch(x),
      5,
    )
    setOut(`5-Fold CV (KNN k=5)\nFolds: ${result.scores.map(s => s.toFixed(3)).join(', ')}\nMean: ${result.mean.toFixed(4)} ± ${result.std.toFixed(4)}`)
  }

  const runGridSearch = () => {
    const data = dataset === 'iris' ? irisLike() : linearLike()
    const result = gridSearch(
      { k: [1, 3, 5, 7, 9] },
      data.X, data.y,
      (xt, yt, p) => KNN.fit(xt, yt, (p as { k: number[] }).k[0]),
      (m, x) => m.predictBatch(x),
    )
    const lines = result.results.map(r => `  k=${(r.params as { k: number[] }).k[0]}: ${(r.score * 100).toFixed(2)}%`)
    setOut(`Grid search (KNN)\n${lines.join('\n')}\nBest: k=${(result.bestParams as { k: number[] }).k[0]} @ ${(result.bestScore * 100).toFixed(2)}%`)
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v64.0 ML Pipeline</h1>
      <p className="text-sm text-slate-400">特征缩放 · 5 种模型 · 训练/测试划分 · 评估指标 · 交叉验证 · 网格搜索</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {(tab === 'Pipeline' || tab === 'CV' || tab === 'GridSearch') && (
        <div className="flex gap-2 flex-wrap items-end">
          <select value={dataset} onChange={e => setDataset(e.target.value as 'iris' | 'linear')} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
            <option value="iris">Iris-like (3-class)</option>
            <option value="linear">Linear (regression)</option>
          </select>
          <select value={scaler} onChange={e => setScaler(e.target.value as ScalerName)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
            {SCALERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={model} onChange={e => setModel(e.target.value as ModelName)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={testSize} onChange={e => setTestSize(e.target.value)} placeholder="test size" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-20" />
          <input value={seed} onChange={e => setSeed(e.target.value)} placeholder="seed" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-20" />
          {tab === 'Pipeline' && <button onClick={runPipeline} className="px-4 py-2 bg-blue-700 rounded text-xs">Run Pipeline</button>}
          {tab === 'CV' && <button onClick={runCV} className="px-4 py-2 bg-blue-700 rounded text-xs">Run 5-Fold CV</button>}
          {tab === 'GridSearch' && <button onClick={runGridSearch} className="px-4 py-2 bg-blue-700 rounded text-xs">Run Grid Search</button>}
        </div>
      )}

      {tab === 'Models' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              clearRegistry()
              const X = [[0], [1], [2], [3]]
              const y = [0, 0, 1, 1]
              registerModel('lr1', LinearRegression.fit(X, y))
              registerModel('log1', LogisticRegression.fit(X, y, 0.5, 500))
              registerModel('knn1', KNN.fit(X, y, 3))
              registerModel('nb1', NaiveBayes.fit(X, y))
              registerModel('dt1', DecisionTree.fit(X, y, 5))
              setOut('Registered: ' + listModels().join(', '))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">register all 5</button>
            <button onClick={() => setOut('Models: ' + (listModels().length ? listModels().join(', ') : '(empty)'))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list</button>
            <button onClick={() => { clearRegistry(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear</button>
          </div>
          <p className="text-xs text-slate-500">Available: LinearRegression, LogisticRegression, KNN, NaiveBayes, DecisionTree</p>
        </div>
      )}

      {tab === 'Features' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const X = [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50]]
              const s = fitStandardScaler(X)
              const out2 = applyScaler(s, X)
              setOut('Original:\n' + JSON.stringify(X) + '\n\nStandard scaled (first row mean≈0):\n' + JSON.stringify(out2))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">standard scale</button>
            <button onClick={() => {
              const { encoded, categories } = oneHotEncode(['red', 'green', 'red', 'blue'])
              setOut('Categories: ' + categories.join(',') + '\nEncoded:\n' + JSON.stringify(encoded))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">one-hot encode</button>
            <button onClick={() => {
              const out = polynomialFeatures([[1, 2], [3, 4]], 2)
              setOut('Poly deg=2 (bias + deg1 + deg2):\n' + JSON.stringify(out))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">polynomial features</button>
            <button onClick={() => {
              const X = Array.from({ length: 20 }, (_, i) => [i])
              const y = Array.from({ length: 20 }, (_, i) => i)
              const { XTrain, XTest, yTrain, yTest } = trainTestSplit(X, y, 0.25, 7)
              setOut(`Train: ${XTrain.length}, Test: ${XTest.length}\nyTrain: ${JSON.stringify(yTrain)}\nyTest: ${JSON.stringify(yTest)}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">train/test split</button>
            <button onClick={() => {
              setOut(`mean([1,2,3,4,5]) = ${mean([1, 2, 3, 4, 5])}\nstddev([2,4,4,4,5,5,7,9]) = ${stddev([2, 4, 4, 4, 5, 5, 7, 9]).toFixed(3)}\ncorrelation([1,2,3],[2,4,6]) = ${correlation([1, 2, 3], [2, 4, 6]).toFixed(3)}`)
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">stats utils</button>
          </div>
        </div>
      )}

      {tab === 'Sample Data' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const d = irisLike()
              setOut(`Iris-like: ${d.X.length} samples, ${d.X[0]?.length ?? 0} features, classes: ${Array.from(new Set(d.y)).join(',')}\nFirst 3 samples:\n` + d.X.slice(0, 3).map((x, i) => `  X=${JSON.stringify(x)} y=${d.y[i]}`).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">irisLike()</button>
            <button onClick={() => {
              const d = linearLike()
              setOut(`Linear: ${d.X.length} samples, ${d.X[0]?.length ?? 0} features\nFirst 5:\n` + d.X.slice(0, 5).map((x, i) => `  X=${JSON.stringify(x)} y=${d.y[i].toFixed(2)}`).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">linearLike()</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// select a tab and run'}</pre>
    </div>
  )
}
