import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Button, ErrorNotice, Panel, Spinner, Table, fmt } from '../components/ui'

const PAGE_SIZE = 100

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [actions, setActions] = useState([])
  const [actionFilter, setActionFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (emailFilter.trim()) params.set('user_email', emailFilter.trim())
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      const [logData, actionData] = await Promise.all([
        api.auditLogs(`?${params.toString()}`),
        api.auditActions(),
      ])
      setLogs(logData.logs || [])
      setTotal(logData.total || 0)
      setActions(actionData.actions || [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [actionFilter, emailFilter, page])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner label="Loading audit trail" />

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Compliance</p>
          <h1 className="text-xl font-semibold text-slate-100">Audit logs</h1>
          <p className="mt-0.5 text-xs text-muted">
            {total} entries. Passwords, tokens and API keys are never recorded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={emailFilter}
            onChange={(event) => {
              setEmailFilter(event.target.value)
              setPage(0)
            }}
            placeholder="filter by user email"
            className="w-48 rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200 placeholder:text-muted/60"
          />
          <select
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value)
              setPage(0)
            }}
            className="rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="">All actions</option>
            {actions.map((item) => (
              <option key={item.action} value={item.action}>
                {item.action} ({item.count})
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      <Panel
        title="Audit trail"
        subtitle={`page ${page + 1} of ${pages}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((value) => value + 1)}
              disabled={page + 1 >= pages}
            >
              Next
            </Button>
          </div>
        }
      >
        <Table
          columns={['ID', 'User', 'Action', 'Details', 'When']}
          rows={logs}
          empty="No audit entries match these filters."
          renderRow={(row) => (
            <tr key={row.id} className="border-b border-edge/60">
              <td className="px-3 py-2 text-xs text-muted">#{row.id}</td>
              <td className="px-3 py-2 text-xs text-slate-200">{row.user_email}</td>
              <td className="px-3 py-2 text-xs text-accent">{row.action}</td>
              <td className="max-w-[520px] break-all px-3 py-2 font-mono text-[10px] text-muted">
                {row.details || '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-[11px] text-muted">
                {fmt.date(row.created_at)}
              </td>
            </tr>
          )}
        />
      </Panel>
    </div>
  )
}
