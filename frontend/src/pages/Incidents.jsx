import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth.jsx'
import {
  Button,
  Empty,
  ErrorNotice,
  Field,
  InfoNotice,
  Input,
  Panel,
  Select,
  SeverityBadge,
  Spinner,
  StatusBadge,
  Table,
  Textarea,
  fmt,
} from '../components/ui'

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']

export default function Incidents() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    priority: 5,
  })
  const [note, setNote] = useState('')
  const [linkAlertId, setLinkAlertId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '200')
      const data = await api.incidents(`?${params.toString()}`)
      setIncidents(data.incidents || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const open = async (incidentId) => {
    try {
      setSelected(await api.incident(incidentId))
    } catch (err) {
      setError(err)
    }
  }

  const create = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const created = await api.createIncident({
        ...draft,
        priority: Number(draft.priority),
        assigned_analyst: user?.email,
      })
      setDraft({ title: '', description: '', severity: 'MEDIUM', priority: 5 })
      setShowForm(false)
      await load()
      await open(created.id)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const patch = async (body) => {
    if (!selected) return
    setBusy(true)
    try {
      await api.updateIncident(selected.id, body)
      await load()
      await open(selected.id)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const addNote = async () => {
    if (!selected || !note.trim()) return
    setBusy(true)
    try {
      await api.addIncidentNote(selected.id, note)
      setNote('')
      await open(selected.id)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const linkAlert = async () => {
    if (!selected || !linkAlertId) return
    setBusy(true)
    try {
      await api.linkAlert(selected.id, Number(linkAlertId))
      setLinkAlertId('')
      await open(selected.id)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading incidents" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Case management</p>
          <h1 className="text-xl font-semibold text-slate-100">Incidents</h1>
          <p className="mt-0.5 text-xs text-muted">{total} incident(s) recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-0 w-40 py-1.5 text-xs"
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Button onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Cancel' : 'New incident'}
          </Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {showForm && (
        <Panel title="Create incident">
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Title">
                <Input
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Suspected port scan from 172.16.0.1"
                />
              </Field>
            </div>
            <Field label="Severity">
              <Select
                value={draft.severity}
                onChange={(event) => setDraft({ ...draft, severity: event.target.value })}
              >
                {SEVERITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" hint="1 = highest, 10 = lowest">
              <Input
                type="number"
                min={1}
                max={10}
                value={draft.priority}
                onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Creating...' : 'Create incident'}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {total === 0 && !showForm && (
        <InfoNotice>
          No incidents yet. Create one to group related alerts into a single investigation.
        </InfoNotice>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Incident queue" className="lg:col-span-2">
          <div className="max-h-[560px] overflow-y-auto">
            <Table
              columns={['ID', 'Title', 'Severity', 'Status', 'Priority', 'Assigned', 'Created', '']}
              rows={incidents}
              empty="No incidents match this filter."
              renderRow={(incident) => (
                <tr
                  key={incident.id}
                  className={`border-b border-edge/60 ${
                    selected?.id === incident.id ? 'bg-accent/5' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-xs text-muted">#{incident.id}</td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-xs text-slate-200">
                    {incident.title}
                  </td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">P{incident.priority}</td>
                  <td className="px-3 py-2 text-[11px] text-muted">
                    {incident.assigned_analyst || 'unassigned'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">
                    {fmt.time(incident.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" onClick={() => open(incident.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              )}
            />
          </div>
        </Panel>

        <Panel title={selected ? `Incident #${selected.id}` : 'Detail'}>
          {!selected ? (
            <Empty>Select an incident to view and update it.</Empty>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-100">{selected.title}</p>
                {selected.description && (
                  <p className="mt-1 text-[11px] text-muted">{selected.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Status">
                  <Select
                    value={selected.status}
                    onChange={(event) => patch({ status: event.target.value })}
                    disabled={busy}
                  >
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Severity">
                  <Select
                    value={selected.severity}
                    onChange={(event) => patch({ severity: event.target.value })}
                    disabled={busy}
                  >
                    {SEVERITIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <dl className="space-y-1.5 text-xs">
                {[
                  ['Priority', `P${selected.priority}`],
                  ['Assigned', selected.assigned_analyst || 'unassigned'],
                  ['Created', fmt.date(selected.created_at)],
                  ['Updated', fmt.date(selected.updated_at)],
                  ['Closed', selected.closed_at ? fmt.date(selected.closed_at) : '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-slate-200">{value}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted">Link an alert</p>
                <div className="mt-1 flex gap-2">
                  <Input
                    className="mt-0"
                    value={linkAlertId}
                    onChange={(event) => setLinkAlertId(event.target.value)}
                    placeholder="alert id"
                  />
                  <Button variant="secondary" onClick={linkAlert} disabled={busy || !linkAlertId}>
                    Link
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Notes ({selected.notes?.length || 0})
                </p>
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add an investigation note"
                />
                <Button
                  variant="secondary"
                  onClick={addNote}
                  disabled={busy || !note.trim()}
                  className="mt-2"
                >
                  Add note
                </Button>

                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {(selected.notes || []).map((entry) => (
                    <div key={entry.id} className="rounded border border-edge bg-ink p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>{entry.author}</span>
                        <span>{fmt.date(entry.created_at)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-200">{entry.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
