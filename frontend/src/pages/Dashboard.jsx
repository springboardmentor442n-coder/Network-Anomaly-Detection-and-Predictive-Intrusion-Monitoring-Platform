import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useStream } from '../lib/useStream'
import {
  AnomalyTrendChart,
  BarChart,
  DonutChart,
  PALETTE,
  StackedSeverityChart,
  severityColors,
} from '../components/charts'
import {
  Button,
  Empty,
  ErrorNotice,
  InfoNotice,
  Panel,
  SeverityBadge,
  Spinner,
  Stat,
  Table,
  fmt,
} from '../components/ui'

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [traffic, setTraffic] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(24)
  const { events, transport } = useStream({ types: ['detection', 'alert'] })

  const load = useCallback(async () => {
    setError(null)
    try {
      const [overviewData, trafficData] = await Promise.all([
        api.overview(hours),
        api.traffic(),
      ])
      setOverview(overviewData)
      setTraffic(trafficData)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [hours])

  useEffect(() => {
    load()
  }, [load])

  // Refresh counters when a new detection arrives over the stream.
  useEffect(() => {
    if (events.length === 0) return
    const timer = setTimeout(load, 1500)
    return () => clearTimeout(timer)
  }, [events.length, load])

  if (loading) return <Spinner label="Loading console" />

  const metrics = overview?.metrics || {}
  const severity = overview?.severity_distribution || {}
  const severityLabels = Object.keys(severity)
  const alertStatus = overview?.alert_status_distribution || {}

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Security operations</p>
          <h1 className="text-xl font-semibold text-slate-100">Threat posture</h1>
          <p className="mt-0.5 text-xs text-muted">
            Operational counters come from this platform&apos;s detections; corpus figures are
            streamed from the local CICIDS2017 CSVs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">
            stream: <span className="text-accent">{transport}</span>
          </span>
          <select
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            className="rounded border border-edge bg-ink px-2 py-1 text-xs text-slate-200"
          >
            <option value={1}>Last 1h</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7d</option>
            <option value={720}>Last 30d</option>
          </select>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {metrics.total_traffic === 0 && (
        <InfoNotice>
          No detections recorded yet. Open{' '}
          <Link to="/monitor" className="underline">
            Live monitor
          </Link>{' '}
          and run a replay scan, or submit a flow from{' '}
          <Link to="/predict" className="underline">
            Detection
          </Link>
          , to populate these panels.
        </InfoNotice>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Flows analyzed" value={fmt.number(metrics.total_traffic)} hint="all time" />
        <Stat
          label="Benign"
          value={fmt.number(metrics.benign_traffic)}
          tone="accent"
          hint="classified benign"
        />
        <Stat
          label="Non-benign"
          value={fmt.number(metrics.total_attacks)}
          tone="warn"
          hint="attack-class predictions"
        />
        <Stat
          label="Anomalous"
          value={fmt.number(metrics.anomalous_traffic)}
          tone="warn"
          hint="Isolation Forest outliers"
        />
        <Stat
          label="High risk"
          value={fmt.number(metrics.high_risk_detections)}
          tone="danger"
          hint="risk score >= 65"
        />
        <Stat
          label="Critical alerts"
          value={fmt.number(metrics.critical_alerts)}
          tone="danger"
        />
        <Stat label="Open incidents" value={fmt.number(metrics.open_incidents)} tone="warn" />
        <Stat
          label={`Detections (${hours}h)`}
          value={fmt.number(metrics.recent_detections)}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          title="Detection volume by severity"
          subtitle={`hourly buckets, last ${hours}h`}
          className="lg:col-span-2"
        >
          <StackedSeverityChart trends={overview?.attack_trends} />
        </Panel>
        <Panel title="Severity distribution" subtitle="all detections">
          <DonutChart
            labels={severityLabels}
            values={severityLabels.map((key) => severity[key])}
            colors={severityColors(severityLabels)}
          />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Anomaly trend" subtitle={`total vs anomalous, last ${hours}h`}>
          <AnomalyTrendChart trends={overview?.attack_trends} />
        </Panel>
        <Panel title="Alerts by status" subtitle="current queue">
          {Object.keys(alertStatus).length === 0 ? (
            <Empty>No alerts raised yet.</Empty>
          ) : (
            <BarChart
              labels={Object.keys(alertStatus).map((key) => key.replace(/_/g, ' '))}
              values={Object.values(alertStatus)}
              color={PALETTE.medium}
              horizontal
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Corpus label distribution"
          subtitle={
            traffic?.status === 'ready'
              ? `${fmt.number(traffic.total_records_sampled)} rows read from ${traffic.file_count} file(s)`
              : 'dataset status'
          }
        >
          {traffic?.status === 'ready' ? (
            <BarChart
              labels={(traffic.attack_distribution || []).map(([label]) => label)}
              values={(traffic.attack_distribution || []).map(([, count]) => count)}
              horizontal
              height={300}
            />
          ) : (
            <Empty>{traffic?.message || 'Dataset not available.'}</Empty>
          )}
        </Panel>
        <Panel title="Corpus protocol mix" subtitle="flow metadata">
          {traffic?.status === 'ready' ? (
            <DonutChart
              labels={(traffic.protocol_distribution || []).map(([label]) => label)}
              values={(traffic.protocol_distribution || []).map(([, count]) => count)}
              height={300}
            />
          ) : (
            <Empty>{traffic?.message || 'Dataset not available.'}</Empty>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Top attack classifications" subtitle="produced by this platform">
          {(overview?.top_attacks || []).length === 0 ? (
            <Empty>No non-benign classifications recorded yet.</Empty>
          ) : (
            <Table
              columns={['Attack type', 'Count']}
              rows={overview.top_attacks}
              renderRow={(row) => (
                <tr key={row.attack_type} className="border-b border-edge/60">
                  <td className="px-3 py-2 text-slate-200">{row.attack_type}</td>
                  <td className="px-3 py-2 text-right text-muted">{fmt.number(row.count)}</td>
                </tr>
              )}
            />
          )}
        </Panel>

        <Panel title="Top source IPs" subtitle="observed in alerts / monitored traffic">
          {(overview?.top_source_ips || []).length === 0 ? (
            <Empty>No IP-bearing events recorded yet.</Empty>
          ) : (
            <Table
              columns={['IP', 'Events', 'Max risk']}
              rows={overview.top_source_ips}
              renderRow={(row) => (
                <tr key={row.ip} className="border-b border-edge/60">
                  <td className="px-3 py-2 font-mono text-xs text-slate-200">{row.ip}</td>
                  <td className="px-3 py-2 text-muted">{fmt.number(row.count)}</td>
                  <td className="px-3 py-2 text-muted">
                    {row.max_risk_score === null ? '-' : fmt.number(row.max_risk_score)}
                  </td>
                </tr>
              )}
            />
          )}
        </Panel>

        <Panel title="Recent detections" subtitle="newest first">
          {(overview?.recent_detections || []).length === 0 ? (
            <Empty>No detections yet.</Empty>
          ) : (
            <Table
              columns={['Prediction', 'Risk', 'Severity', 'Time']}
              rows={overview.recent_detections}
              renderRow={(row) => (
                <tr key={row.id} className="border-b border-edge/60">
                  <td className="px-3 py-2 text-slate-200">{row.prediction}</td>
                  <td className="px-3 py-2 text-muted">{fmt.number(row.risk_score)}</td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={row.severity} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{fmt.time(row.created_at)}</td>
                </tr>
              )}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}
