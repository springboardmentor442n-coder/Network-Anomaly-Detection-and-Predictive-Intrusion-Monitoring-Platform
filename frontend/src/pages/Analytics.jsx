import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import {
  AnomalyTrendChart,
  BarChart,
  DonutChart,
  PALETTE,
  StackedSeverityChart,
  severityColors,
} from '../components/charts'
import { Button, Empty, ErrorNotice, Panel, Spinner, Stat, Table, fmt } from '../components/ui'

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [traffic, setTraffic] = useState(null)
  const [byType, setByType] = useState({})
  const [hours, setHours] = useState(168)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [overviewData, trafficData, typeData] = await Promise.all([
        api.overview(hours),
        api.traffic(),
        api.detectionsByType(),
      ])
      setOverview(overviewData)
      setTraffic(trafficData)
      setByType(typeData?.detection_stats || {})
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [hours])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner label="Loading analytics" />

  const severity = overview?.severity_distribution || {}
  const severityLabels = Object.keys(severity)
  const typeLabels = Object.keys(byType).slice(0, 12)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Security analytics</p>
          <h1 className="text-xl font-semibold text-slate-100">Threat analytics</h1>
          <p className="mt-0.5 text-xs text-muted">
            Corpus figures are streamed from local CSVs; operational figures are SQL aggregates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            className="rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200"
          >
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7d</option>
            <option value={720}>Last 30d</option>
          </select>
          <Button variant="secondary" onClick={load}>Refresh</Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Corpus rows read" value={fmt.number(traffic?.total_records_sampled)} hint={`limit ${fmt.number(traffic?.sample_limit)}`} />
        <Stat label="Corpus benign" value={fmt.number(traffic?.normal_records)} tone="accent" />
        <Stat label="Corpus non-benign" value={fmt.number(traffic?.anomalous_records)} tone="warn" />
        <Stat label="Distinct labels" value={fmt.number(traffic?.distinct_labels)} />
      </div>

      <Panel title="Detection volume by severity" subtitle={`hourly, last ${hours}h`}>
        <StackedSeverityChart trends={overview?.attack_trends} height={320} />
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Anomaly trend" subtitle={`last ${hours}h`}>
          <AnomalyTrendChart trends={overview?.attack_trends} height={280} />
        </Panel>
        <Panel title="Severity distribution" subtitle="all detections">
          <DonutChart
            labels={severityLabels}
            values={severityLabels.map((key) => severity[key])}
            colors={severityColors(severityLabels)}
            height={280}
          />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Corpus attack categories" subtitle="label counts from the dataset">
          {traffic?.status === 'ready' ? (
            <BarChart
              labels={(traffic.attack_distribution || []).map(([l]) => l)}
              values={(traffic.attack_distribution || []).map(([, c]) => c)}
              horizontal
              height={340}
            />
          ) : <Empty>{traffic?.message || 'Dataset not available.'}</Empty>}
        </Panel>
        <Panel title="Detections by predicted class" subtitle="produced by this platform">
          {typeLabels.length === 0 ? (
            <Empty>No detections recorded yet.</Empty>
          ) : (
            <BarChart
              labels={typeLabels}
              values={typeLabels.map((k) => byType[k])}
              color={PALETTE.low}
              horizontal
              height={340}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Corpus protocol mix">
          {traffic?.status === 'ready' ? (
            <DonutChart
              labels={(traffic.protocol_distribution || []).map(([l]) => l)}
              values={(traffic.protocol_distribution || []).map(([, c]) => c)}
            />
          ) : <Empty>Dataset not available.</Empty>}
        </Panel>
        <Panel title="Corpus top sources" subtitle="most frequent source addresses">
          {(traffic?.top_sources || []).length === 0 ? <Empty>No data.</Empty> : (
            <Table
              columns={['IP', 'Flows']}
              rows={traffic.top_sources}
              renderRow={([ip, count]) => (
                <tr key={ip} className="border-b border-edge/60">
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-200">{ip}</td>
                  <td className="px-3 py-2 text-xs text-muted">{fmt.number(count)}</td>
                </tr>
              )}
            />
          )}
        </Panel>
        <Panel title="Corpus top destinations" subtitle="most targeted addresses">
          {(traffic?.top_destinations || []).length === 0 ? <Empty>No data.</Empty> : (
            <Table
              columns={['IP', 'Flows']}
              rows={traffic.top_destinations}
              renderRow={([ip, count]) => (
                <tr key={ip} className="border-b border-edge/60">
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-200">{ip}</td>
                  <td className="px-3 py-2 text-xs text-muted">{fmt.number(count)}</td>
                </tr>
              )}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}
