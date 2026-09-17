import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { BarChart, PALETTE } from '../components/charts'
import {
  Button,
  Empty,
  ErrorNotice,
  Field,
  InfoNotice,
  Input,
  Panel,
  Select,
  Spinner,
  Stat,
  Table,
  fmt,
} from '../components/ui'

export default function Reports() {
  const [formats, setFormats] = useState(null)
  const [reports, setReports] = useState([])
  const [preview, setPreview] = useState(null)
  const [days, setDays] = useState(7)
  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [formatData, reportData, previewData] = await Promise.all([
        api.reportFormats(),
        api.reports(),
        api.previewReport(days),
      ])
      setFormats(formatData)
      setReports(reportData.reports || [])
      setPreview(previewData)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const generate = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.createReport({
        days: Number(days),
        title: title || undefined,
        report_type: 'SECURITY',
      })
      setTitle('')
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading reports" />

  const traffic = preview?.traffic_statistics || {}
  const risk = preview?.risk_statistics || {}
  const model = preview?.model_performance || {}
  const threats = preview?.attack_statistics?.top_threats || []
  const periodLabel = preview?.period
    ? `${String(preview.period.start).slice(0, 10)} to ${String(preview.period.end).slice(0, 10)}`
    : 'selected period'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Reporting</p>
          <h1 className="text-xl font-semibold text-slate-100">Security reports</h1>
          <p className="mt-0.5 text-xs text-muted">
            Built only from recorded detections, alerts and incidents.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Period">
            <Select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="mt-0 w-32 py-1.5 text-xs"
            >
              <option value={1}>Last 1 day</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </Select>
          </Field>
          <Field label="Title (optional)">
            <Input
              className="mt-0 w-48 py-1.5 text-xs"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Weekly SOC report"
            />
          </Field>
          <Button onClick={generate} disabled={busy}>
            {busy ? 'Generating...' : 'Generate & store'}
          </Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {formats && !formats.pdf?.available && (
        <InfoNotice tone="warn">PDF export is unavailable: {formats.pdf?.reason}</InfoNotice>
      )}

      <Panel title="Preview" subtitle={periodLabel}>
        <p className="mb-4 text-xs text-muted">{preview?.summary}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Flows analyzed" value={fmt.number(traffic.total_analyzed_flows)} />
          <Stat label="Benign" value={fmt.number(traffic.benign_flows)} tone="accent" />
          <Stat label="Non-benign" value={fmt.number(traffic.non_benign_flows)} tone="warn" />
          <Stat label="Anomalous" value={fmt.number(traffic.anomalous_flows)} tone="warn" />
          <Stat label="High risk" value={fmt.number(risk.high_risk_detections)} tone="danger" />
          <Stat label="Critical" value={fmt.number(risk.critical_detections)} tone="danger" />
          <Stat label="Alerts" value={fmt.number(preview?.alerts?.total)} />
          <Stat label="Incidents" value={fmt.number(preview?.incidents?.total)} />
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Top threats in period">
          {threats.length === 0 ? (
            <Empty>No non-benign classifications in this period.</Empty>
          ) : (
            <BarChart
              labels={threats.map((item) => item.attack_type)}
              values={threats.map((item) => item.count)}
              color={PALETTE.high}
              horizontal
              height={280}
            />
          )}
        </Panel>
        <Panel title="Recommendations" subtitle="derived from observed counts only">
          {(preview?.recommendations || []).length === 0 ? (
            <Empty>No recommendations: nothing was detected in this period.</Empty>
          ) : (
            <ul className="space-y-2">
              {preview.recommendations.map((item) => (
                <li key={item} className="flex gap-2 text-xs text-slate-200">
                  <span className="text-accent">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Model performance in report" subtitle="read from models/metadata.json">
        {model.status !== 'trained' ? (
          <Empty>Model status: {model.status || 'unknown'}</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Accuracy" value={fmt.percent(model.accuracy)} />
            <Stat label="Precision (macro)" value={fmt.percent(model.precision_macro)} />
            <Stat label="Recall (macro)" value={fmt.percent(model.recall_macro)} />
            <Stat label="F1 (macro)" value={fmt.percent(model.f1_macro)} />
            <Stat label="F1 (weighted)" value={fmt.percent(model.f1_weighted)} />
          </div>
        )}
      </Panel>

      <Panel title="Stored reports" subtitle={`${reports.length} report(s)`}>
        {reports.length === 0 ? (
          <Empty>No stored reports yet.</Empty>
        ) : (
          <Table
            columns={['ID', 'Title', 'Period', 'Flows', 'Attacks', 'Critical', 'By', 'Export']}
            rows={reports}
            renderRow={(report) => (
              <tr key={report.id} className="border-b border-edge/60">
                <td className="px-3 py-2 text-xs text-muted">#{report.id}</td>
                <td className="max-w-[220px] truncate px-3 py-2 text-xs text-slate-200">
                  {report.title}
                </td>
                <td className="px-3 py-2 text-[11px] text-muted">
                  {String(report.period_start).slice(0, 10)} to{' '}
                  {String(report.period_end).slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {fmt.number(report.total_traffic)}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {fmt.number(report.total_attacks)}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {fmt.number(report.critical_count)}
                </td>
                <td className="px-3 py-2 text-[11px] text-muted">{report.generated_by}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    <a
                      href={api.reportUrl(report.id, 'json')}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-edge px-2 py-1 text-[10px] text-muted hover:text-accent"
                    >
                      JSON
                    </a>
                    <a
                      href={api.reportUrl(report.id, 'csv')}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-edge px-2 py-1 text-[10px] text-muted hover:text-accent"
                    >
                      CSV
                    </a>
                    {formats?.pdf?.available && (
                      <a
                        href={api.reportUrl(report.id, 'pdf')}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-edge px-2 py-1 text-[10px] text-muted hover:text-accent"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
        )}
        <p className="mt-3 text-[11px] text-muted">
          Export links open in a new tab without an Authorization header, so they are intended
          for use behind an authenticated session or with a manually supplied token. The
          preview above is the in-app view.
        </p>
      </Panel>
    </div>
  )
}
