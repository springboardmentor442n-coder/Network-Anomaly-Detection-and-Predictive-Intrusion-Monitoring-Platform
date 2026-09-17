import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { BarChart, PALETTE } from '../components/charts'
import {
  Button,
  Empty,
  ErrorNotice,
  InfoNotice,
  Panel,
  Spinner,
  Stat,
  Table,
  fmt,
} from '../components/ui'

export default function ModelInfo() {
  const [metrics, setMetrics] = useState(null)
  const [policy, setPolicy] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMatrix, setShowMatrix] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [metricsData, policyData] = await Promise.all([
        api.modelMetrics(),
        api.riskPolicy(),
      ])
      setMetrics(metricsData)
      setPolicy(policyData)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner label="Loading model information" />

  if (metrics?.status === 'not_trained') {
    return (
      <Panel title="Model">
        <InfoNotice tone="warn">{metrics.message}</InfoNotice>
      </Panel>
    )
  }

  const report = metrics?.classification_report || {}
  const perClass = Object.entries(report)
    .filter(([, value]) => typeof value === 'object' && value && 'f1-score' in value)
    .filter(([key]) => !['macro avg', 'weighted avg'].includes(key))
    .sort((a, b) => (b[1].support || 0) - (a[1].support || 0))

  const classes = metrics?.classes || []
  const matrix = metrics?.confusion_matrix || []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Model management</p>
          <h1 className="text-xl font-semibold text-slate-100">Active model</h1>
          <p className="mt-0.5 text-xs text-muted">
            Metrics are the values recorded by the evaluation run in
            models/metadata.json - they are not restated or rounded up anywhere in this app.
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Version" value={metrics?.model_version || '-'} hint={metrics?.dataset} />
        <Stat label="Accuracy" value={fmt.percent(metrics?.accuracy)} tone="accent" />
        <Stat label="F1 (macro)" value={fmt.percent(metrics?.f1_macro)} />
        <Stat label="F1 (weighted)" value={fmt.percent(metrics?.f1_weighted)} />
        <Stat label="Precision (macro)" value={fmt.percent(metrics?.precision_macro)} />
        <Stat label="Recall (macro)" value={fmt.percent(metrics?.recall_macro)} />
        <Stat label="Training rows" value={fmt.number(metrics?.sample_rows)} />
        <Stat label="Features" value={fmt.number(metrics?.feature_count)} />
      </div>

      <InfoNotice>
        Accuracy is dominated by the benign class. Macro F1 ({fmt.percent(metrics?.f1_macro)})
        is the honest figure for multi-class performance, and several rare classes have zero
        support in the held-out split - see the per-class table below.
      </InfoNotice>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Per-class F1" subtitle="classes with non-zero support">
          {perClass.length === 0 ? (
            <Empty>No classification report stored.</Empty>
          ) : (
            <BarChart
              labels={perClass
                .filter(([, value]) => (value.support || 0) > 0)
                .slice(0, 14)
                .map(([name]) => name)}
              values={perClass
                .filter(([, value]) => (value.support || 0) > 0)
                .slice(0, 14)
                .map(([, value]) => Number((value['f1-score'] * 100).toFixed(2)))}
              color={PALETTE.accent}
              horizontal
              height={380}
            />
          )}
        </Panel>

        <Panel title="Per-class detail" subtitle={`${classes.length} classes`}>
          <div className="max-h-[380px] overflow-y-auto">
            <Table
              columns={['Class', 'Precision', 'Recall', 'F1', 'Support']}
              rows={perClass}
              renderRow={([name, value]) => (
                <tr key={name} className="border-b border-edge/60">
                  <td className="px-3 py-2 text-xs text-slate-200">{name}</td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {fmt.decimal(value.precision)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{fmt.decimal(value.recall)}</td>
                  <td
                    className={`px-3 py-2 text-xs ${
                      value['f1-score'] === 0 ? 'text-critical' : 'text-muted'
                    }`}
                  >
                    {fmt.decimal(value['f1-score'])}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{fmt.number(value.support)}</td>
                </tr>
              )}
            />
          </div>
        </Panel>
      </div>

      <Panel
        title="Confusion matrix"
        subtitle={`${matrix.length} x ${matrix.length} on the held-out split`}
        actions={
          <Button variant="secondary" onClick={() => setShowMatrix((value) => !value)}>
            {showMatrix ? 'Hide' : 'Show'}
          </Button>
        }
      >
        {!showMatrix ? (
          <p className="text-xs text-muted">
            Large matrix - click Show to render it.
          </p>
        ) : matrix.length === 0 ? (
          <Empty>No confusion matrix stored.</Empty>
        ) : (
          <div className="overflow-auto">
            <table className="border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-panel px-2 py-1 text-left text-muted">
                    true \ pred
                  </th>
                  {classes.map((name) => (
                    <th
                      key={name}
                      className="px-1.5 py-1 text-muted"
                      title={name}
                    >
                      {name.slice(0, 6)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th
                      className="sticky left-0 z-10 whitespace-nowrap bg-panel px-2 py-1 text-left font-normal text-muted"
                      title={classes[rowIndex]}
                    >
                      {(classes[rowIndex] || rowIndex).slice(0, 18)}
                    </th>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`px-1.5 py-1 text-center tabular-nums ${
                          cell === 0
                            ? 'text-edge'
                            : rowIndex === cellIndex
                              ? 'bg-accent/15 text-accent'
                              : 'bg-critical/15 text-critical'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Risk scoring policy" subtitle="the exact weights used to score every flow">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">Weights</p>
            <dl className="space-y-1.5 text-xs">
              {[
                ['Anomaly points', policy?.anomaly_points],
                ['Attack probability weight', policy?.attack_probability_weight],
                ['Confidence weight', policy?.confidence_weight],
                ['Unrecognized type points', policy?.unknown_type_points],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="tabular-nums text-slate-200">{value ?? '-'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] uppercase tracking-wider text-muted">
              Severity thresholds
            </p>
            <dl className="mt-1 space-y-1.5 text-xs">
              {Object.entries(policy?.severity_thresholds || {}).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="tabular-nums text-slate-200">&ge; {value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
              Attack family weights
            </p>
            <div className="max-h-64 overflow-y-auto">
              <Table
                columns={['Family', 'Points']}
                rows={Object.entries(policy?.attack_type_weights || {})}
                renderRow={([name, value]) => (
                  <tr key={name} className="border-b border-edge/60">
                    <td className="px-3 py-1.5 text-xs text-slate-200">{name}</td>
                    <td className="px-3 py-1.5 text-xs tabular-nums text-muted">{value}</td>
                  </tr>
                )}
              />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}
