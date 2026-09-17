/**
 * Detection / prediction interface.
 *
 * The trained model needs ~85 features, which is far too many to hand-type, so
 * this page is built around loading a real example row and then editing it:
 *
 *   1. "Load example flow" pulls an actual row from the local corpus.
 *   2. Features are grouped by the backend into labelled sections.
 *   3. Missing/invalid values are validated before submit.
 *   4. The result shows classification, confidence, anomaly status, risk score,
 *      severity and a component-by-component explanation of the score.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import {
  Button,
  Empty,
  ErrorNotice,
  Field,
  InfoNotice,
  Input,
  Panel,
  SeverityBadge,
  Spinner,
  Stat,
  Table,
  fmt,
} from '../components/ui'
import { BarChart, PALETTE } from '../components/charts'

const HINTS = {
  Protocol: 'IANA protocol number (6 = TCP, 17 = UDP, 1 = ICMP)',
  'Src Port': 'Source port, 0-65535',
  'Dst Port': 'Destination port, 0-65535',
  'Flow Duration': 'Total flow duration in microseconds',
  'Total Fwd Packet': 'Packets sent in the forward direction',
  'Total Bwd packets': 'Packets sent in the backward direction',
  'Flow Bytes/s': 'Bytes per second across the flow',
  'Flow Packets/s': 'Packets per second across the flow',
  'SYN Flag Count': 'Number of packets with the SYN flag set',
  'FIN Flag Count': 'Number of packets with the FIN flag set',
  'RST Flag Count': 'Number of packets with the RST flag set',
}

export default function Predict() {
  const [status, setStatus] = useState(null)
  const [schema, setSchema] = useState(null)
  const [values, setValues] = useState({})
  const [context, setContext] = useState({ source_ip: '', destination_ip: '' })
  const [groundTruth, setGroundTruth] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [openGroups, setOpenGroups] = useState({})
  const [filter, setFilter] = useState('')

  const boot = useCallback(async () => {
    setError(null)
    try {
      const statusData = await api.predictionStatus()
      setStatus(statusData)
      if (statusData.ready) {
        const schemaData = await api.expectedFeatures()
        setSchema(schemaData)
        const firstGroup = Object.keys(schemaData.groups || {})[0]
        setOpenGroups(firstGroup ? { [firstGroup]: true } : {})
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    boot()
  }, [boot])

  const loadExample = async () => {
    setError(null)
    setBusy(true)
    try {
      const sample = await api.sampleFlow('csv_replay')
      setValues(
        Object.fromEntries(
          Object.entries(sample.features).map(([key, value]) => [
            key,
            value === null || value === undefined ? '' : String(value),
          ]),
        ),
      )
      setContext({
        source_ip: sample.source_ip || '',
        destination_ip: sample.destination_ip || '',
      })
      setGroundTruth(sample.ground_truth_label)
      setResult(null)
      setFieldErrors({})
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    setValues({})
    setContext({ source_ip: '', destination_ip: '' })
    setGroundTruth(null)
    setResult(null)
    setFieldErrors({})
  }

  const validate = () => {
    const problems = {}
    const required = schema?.features || []
    for (const name of required) {
      const raw = values[name]
      if (raw === undefined || raw === '') {
        problems[name] = 'Required'
        continue
      }
      if (Number.isNaN(Number(raw)) && !/^[A-Za-z]/.test(String(raw))) {
        problems[name] = 'Must be numeric'
      }
    }
    setFieldErrors(problems)
    return problems
  }

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setResult(null)

    const problems = validate()
    const missing = Object.keys(problems)
    if (missing.length > 0) {
      const firstGroup = Object.entries(schema?.groups || {}).find(([, names]) =>
        names.some((name) => problems[name]),
      )
      if (firstGroup) setOpenGroups((prev) => ({ ...prev, [firstGroup[0]]: true }))
      setError({
        message: `${missing.length} feature(s) need a value before this flow can be scored.`,
        code: 'CLIENT_VALIDATION',
        details: { problems: missing.slice(0, 8) },
      })
      return
    }

    setBusy(true)
    try {
      const features = Object.fromEntries(
        Object.entries(values).map(([key, value]) => {
          const numeric = Number(value)
          return [key, value !== '' && !Number.isNaN(numeric) ? numeric : value]
        }),
      )
      const payload = { features }
      if (context.source_ip) payload.source_ip = context.source_ip
      if (context.destination_ip) payload.destination_ip = context.destination_ip
      setResult(await api.predict(payload))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const filled = useMemo(
    () => Object.values(values).filter((value) => value !== '' && value !== undefined).length,
    [values],
  )

  const topClasses = useMemo(() => {
    if (!result?.class_probabilities) return []
    return Object.entries(result.class_probabilities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [result])

  if (loading) return <Spinner label="Checking model status" />

  if (status && !status.ready) {
    return (
      <Panel title="Detection unavailable">
        <InfoNotice tone="warn">
          No trained model is present. Run{' '}
          <code className="rounded bg-ink px-1">python -m backend.scripts.train_models</code>{' '}
          on the host, then reload this page.
        </InfoNotice>
      </Panel>
    )
  }

  const groups = schema?.groups || {}
  const visibleGroups = Object.entries(groups)
    .map(([name, names]) => [
      name,
      filter
        ? names.filter((field) => field.toLowerCase().includes(filter.toLowerCase()))
        : names,
    ])
    .filter(([, names]) => names.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Detection</p>
          <h1 className="text-xl font-semibold text-slate-100">Analyze a flow</h1>
          <p className="mt-0.5 text-xs text-muted">
            {filled} of {schema?.feature_count ?? 0} features provided. Alerts are raised at
            risk score &ge; {status?.alert_threshold}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={loadExample} disabled={busy}>
            Load example flow
          </Button>
          <Button variant="ghost" onClick={clearAll} disabled={busy}>
            Clear
          </Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {groundTruth && (
        <InfoNotice>
          Example loaded from the local corpus. Its recorded label is{' '}
          <strong>{groundTruth}</strong> - useful for sanity-checking the prediction, and not
          sent to the model.
        </InfoNotice>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <form onSubmit={submit} className="space-y-3 lg:col-span-3">
          <Panel
            title="Flow context"
            subtitle="optional - used to enrich the alert, not for scoring"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Source IP" hint="e.g. 192.168.10.50">
                <Input
                  value={context.source_ip}
                  onChange={(event) =>
                    setContext((prev) => ({ ...prev, source_ip: event.target.value }))
                  }
                  placeholder="optional"
                />
              </Field>
              <Field label="Destination IP">
                <Input
                  value={context.destination_ip}
                  onChange={(event) =>
                    setContext((prev) => ({ ...prev, destination_ip: event.target.value }))
                  }
                  placeholder="optional"
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Model features"
            subtitle="all fields are required by the trained classifier"
            actions={
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="filter features"
                className="mt-0 w-44 py-1 text-xs"
              />
            }
          >
            {visibleGroups.length === 0 ? (
              <Empty>No features match that filter.</Empty>
            ) : (
              <div className="space-y-2">
                {visibleGroups.map(([group, names]) => {
                  const open = Boolean(openGroups[group]) || Boolean(filter)
                  const groupErrors = names.filter((name) => fieldErrors[name]).length
                  return (
                    <div key={group} className="rounded border border-edge">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }))
                        }
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-slate-200"
                      >
                        <span>
                          {group}{' '}
                          <span className="text-muted">({names.length})</span>
                          {groupErrors > 0 && (
                            <span className="ml-2 text-critical">{groupErrors} missing</span>
                          )}
                        </span>
                        <span className="text-muted">{open ? '-' : '+'}</span>
                      </button>
                      {open && (
                        <div className="grid gap-3 border-t border-edge p-3 sm:grid-cols-2 xl:grid-cols-3">
                          {names.map((name) => (
                            <Field
                              key={name}
                              label={name}
                              hint={HINTS[name]}
                              error={fieldErrors[name]}
                            >
                              <Input
                                value={values[name] ?? ''}
                                onChange={(event) => {
                                  setValues((prev) => ({ ...prev, [name]: event.target.value }))
                                  setFieldErrors((prev) => {
                                    if (!prev[name]) return prev
                                    const next = { ...prev }
                                    delete next[name]
                                    return next
                                  })
                                }}
                                className={fieldErrors[name] ? 'border-critical/60' : ''}
                                placeholder="0"
                              />
                            </Field>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy} className="px-5 py-2">
              {busy ? 'Analyzing...' : 'Run detection'}
            </Button>
            <span className="text-[11px] text-muted">
              Submits to the trained Random Forest + Isolation Forest pipeline.
            </span>
          </div>
        </form>

        <div className="space-y-3 lg:col-span-2">
          {!result ? (
            <Panel title="Result">
              <Empty>
                Load an example flow or fill in the feature set, then run detection.
              </Empty>
            </Panel>
          ) : (
            <>
              <Panel
                title="Classification"
                subtitle={`model ${result.model_version} - detection #${result.detection_id}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted">
                        Predicted class
                      </p>
                      <p className="text-lg font-semibold text-slate-100">
                        {result.prediction}
                      </p>
                    </div>
                    <SeverityBadge severity={result.severity} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Risk score" value={`${result.risk_score}/100`} tone="danger" />
                    <Stat label="Confidence" value={fmt.percent(result.confidence)} />
                    <Stat
                      label="Attack probability"
                      value={fmt.percent(result.attack_probability)}
                      tone="warn"
                    />
                    <Stat
                      label="Anomaly"
                      value={result.is_anomaly ? 'Yes' : 'No'}
                      tone={result.is_anomaly ? 'warn' : 'accent'}
                      hint="Isolation Forest"
                    />
                  </div>

                  {groundTruth && (
                    <p className="text-[11px] text-muted">
                      Corpus label was <strong>{groundTruth}</strong>;{' '}
                      {String(groundTruth) === String(result.prediction)
                        ? 'the prediction matches.'
                        : 'the prediction differs.'}
                    </p>
                  )}

                  {result.alert_id ? (
                    <InfoNotice tone="warn">
                      Alert #{result.alert_id} was raised because the risk score reached the
                      configured threshold.
                    </InfoNotice>
                  ) : (
                    <p className="text-[11px] text-muted">
                      No alert raised - score is below the threshold of{' '}
                      {status?.alert_threshold}.
                    </p>
                  )}
                </div>
              </Panel>

              <Panel title="Why this risk level" subtitle={result.explanation?.formula}>
                <div className="space-y-2">
                  {(result.explanation?.components || []).map((component) => (
                    <div key={component.name} className="rounded border border-edge p-2.5">
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs font-medium text-slate-200">{component.name}</p>
                        <p className="text-xs tabular-nums text-accent">
                          +{fmt.decimal(component.points, 2)}
                          <span className="text-muted"> / {component.max_points}</span>
                        </p>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded bg-edge">
                        <div
                          className="h-full bg-accent"
                          style={{
                            width: `${Math.min(
                              100,
                              (component.points / Math.max(component.max_points, 1)) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted">{component.reason}</p>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted">
                    Thresholds - CRITICAL &ge; {result.explanation?.thresholds?.CRITICAL}, HIGH
                    &ge; {result.explanation?.thresholds?.HIGH}, MEDIUM &ge;{' '}
                    {result.explanation?.thresholds?.MEDIUM}.
                  </p>
                </div>
              </Panel>

              {topClasses.length > 0 && (
                <Panel title="Class probabilities" subtitle="top classes">
                  <BarChart
                    labels={topClasses.map(([label]) => label)}
                    values={topClasses.map(([, probability]) => Number((probability * 100).toFixed(2)))}
                    color={PALETTE.low}
                    horizontal
                    height={200}
                  />
                </Panel>
              )}

              {result.notifications?.length > 0 && (
                <Panel title="Notifications" subtitle="severity-routed dispatch">
                  <Table
                    columns={['Channel', 'Status', 'Detail']}
                    rows={result.notifications}
                    renderRow={(row) => (
                      <tr key={row.channel} className="border-b border-edge/60">
                        <td className="px-3 py-2 text-slate-200">{row.channel}</td>
                        <td className="px-3 py-2 text-muted">{row.status}</td>
                        <td className="px-3 py-2 text-[11px] text-muted">{row.error || '-'}</td>
                      </tr>
                    )}
                  />
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
