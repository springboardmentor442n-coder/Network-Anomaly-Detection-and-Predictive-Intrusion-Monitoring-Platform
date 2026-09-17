import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useStream } from '../lib/useStream'
import {
  Button,
  ErrorNotice,
  InfoNotice,
  Panel,
  SeverityBadge,
  Spinner,
  StatusBadge,
  Table,
  Textarea,
  fmt,
} from '../components/ui'

const STATUSES = ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const { events } = useStream({ types: ['alert'] })

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (severityFilter) params.set('severity', severityFilter)
      params.set('limit', '200')
      const data = await api.alerts(`?${params.toString()}`)
      setAlerts(data.alerts || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, severityFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (events.length === 0) return
    const timer = setTimeout(load, 1200)
    return () => clearTimeout(timer)
  }, [events.length, load])

  const act = async (action, alertId) => {
    setBusy(true)
    setError(null)
    try {
      if (action === 'acknowledge') await api.acknowledgeAlert(alertId)
      else if (action === 'resolve') await api.resolveAlert(alertId)
      else if (action === 'false-positive') await api.falsePositive(alertId)
      else if (action === 'investigate')
        await api.updateAlert(alertId, { status: 'INVESTIGATING' })
      await load()
      if (selected?.id === alertId) setSelected(await api.alert(alertId))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const saveNote = async () => {
    if (!selected || !note.trim()) return
    setBusy(true)
    try {
      await api.updateAlert(selected.id, { status: selected.status, notes: note })
      setSelected(await api.alert(selected.id))
      setNote('')
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    let rows = alerts
    if (term) {
      rows = rows.filter((alert) =>
        [alert.source_ip, alert.destination_ip, alert.attack_type, alert.description, String(alert.id)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      )
    }
    const sorted = [...rows]
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    else if (sort === 'oldest')
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    else if (sort === 'risk') sorted.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    else if (sort === 'severity')
      sorted.sort(
        (a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0),
      )
    return sorted
  }, [alerts, search, sort])

  if (loading) return <Spinner label="Loading alerts" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Triage</p>
          <h1 className="text-xl font-semibold text-slate-100">Alerts</h1>
          <p className="mt-0.5 text-xs text-muted">
            {visible.length} shown of {total} total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="search ip, type, id"
            className="w-44 rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200 placeholder:text-muted/60"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            className="rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="">All severities</option>
            {SEVERITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="risk">Highest risk</option>
            <option value="severity">Severity</option>
          </select>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {total === 0 && (
        <InfoNotice>
          No alerts yet. Alerts are created automatically when a detection&apos;s risk score
          reaches the configured threshold.
        </InfoNotice>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Alert queue" className="lg:col-span-2">
          <div className="max-h-[620px] overflow-y-auto">
            <Table
              columns={['ID', 'Severity', 'Status', 'Attack type', 'Risk', 'Source', 'Created', '']}
              rows={visible}
              empty="No alerts match these filters."
              renderRow={(alert) => (
                <tr
                  key={alert.id}
                  className={`border-b border-edge/60 ${
                    selected?.id === alert.id ? 'bg-accent/5' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-xs text-muted">#{alert.id}</td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-200">{alert.attack_type || '-'}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted">
                    {fmt.number(alert.risk_score)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">
                    {alert.source_ip || '-'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{fmt.time(alert.created_at)}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" onClick={() => setSelected(alert)}>
                      Open
                    </Button>
                  </td>
                </tr>
              )}
            />
          </div>
        </Panel>

        <Panel title={selected ? `Alert #${selected.id}` : 'Investigation'}>
          {!selected ? (
            <p className="py-6 text-center text-sm text-muted">
              Select an alert to acknowledge, investigate or resolve it.
            </p>
          ) : (
            <div className="space-y-4">
              <dl className="space-y-2 text-xs">
                {[
                  ['Severity', <SeverityBadge key="s" severity={selected.severity} />],
                  ['Status', <StatusBadge key="st" status={selected.status} />],
                  ['Attack type', selected.attack_type || '-'],
                  ['Risk score', fmt.number(selected.risk_score)],
                  ['Source IP', selected.source_ip || '-'],
                  ['Destination IP', selected.destination_ip || '-'],
                  ['Detection', `#${selected.detection_id}`],
                  ['Created', fmt.date(selected.created_at)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right text-slate-200">{value}</dd>
                  </div>
                ))}
              </dl>

              {selected.description && (
                <p className="rounded border border-edge bg-ink p-2.5 text-[11px] text-muted">
                  {selected.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => act('acknowledge', selected.id)} disabled={busy}>
                  Acknowledge
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => act('investigate', selected.id)}
                  disabled={busy}
                >
                  Investigating
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => act('resolve', selected.id)}
                  disabled={busy}
                >
                  Resolve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => act('false-positive', selected.id)}
                  disabled={busy}
                >
                  False positive
                </Button>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Investigation note
                </p>
                <Textarea
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What did you find?"
                />
                <Button
                  onClick={saveNote}
                  disabled={busy || !note.trim()}
                  className="mt-2"
                  variant="secondary"
                >
                  Save note
                </Button>
                {selected.notes && (
                  <p className="mt-2 rounded border border-edge bg-ink p-2.5 text-[11px] text-muted">
                    {selected.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
