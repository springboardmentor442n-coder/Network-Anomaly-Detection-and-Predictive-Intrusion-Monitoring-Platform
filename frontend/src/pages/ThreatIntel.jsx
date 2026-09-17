import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth.jsx'
import {
  Badge,
  Button,
  Empty,
  ErrorNotice,
  Field,
  InfoNotice,
  Input,
  Panel,
  Select,
  Spinner,
  Table,
  Textarea,
  fmt,
} from '../components/ui'

const LEVELS = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const TYPES = ['IP', 'DOMAIN', 'HASH', 'URL']

const STATUS_COPY = {
  known: 'Matched a threat intelligence record.',
  unknown: 'No record found. No verdict is asserted.',
  not_configured: 'No external provider is configured.',
  error: 'The provider returned an error.',
}

export default function ThreatIntel() {
  const { isAdmin } = useAuth()
  const [status, setStatus] = useState(null)
  const [indicators, setIndicators] = useState([])
  const [ip, setIp] = useState('')
  const [lookup, setLookup] = useState(null)
  const [draft, setDraft] = useState({
    indicator_type: 'IP',
    indicator_value: '',
    threat_level: 'MEDIUM',
    description: '',
    source: '',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [statusData, indicatorData] = await Promise.all([
        api.threatIntelStatus(),
        api.indicators('?limit=200'),
      ])
      setStatus(statusData)
      setIndicators(indicatorData.indicators || [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runLookup = async (event) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    setLookup(null)
    try {
      setLookup(await api.lookupIp(ip.trim()))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const addIndicator = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.createIndicator(draft)
      setDraft({ ...draft, indicator_value: '', description: '' })
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (indicatorId) => {
    setBusy(true)
    try {
      await api.deleteIndicator(indicatorId)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading threat intelligence" />

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-accent">Enrichment</p>
        <h1 className="text-xl font-semibold text-slate-100">Threat intelligence</h1>
        <p className="mt-0.5 text-xs text-muted">
          Provider: <span className="text-slate-200">{status?.provider}</span>
        </p>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {!status?.provider_configured ? (
        <InfoNotice tone="warn">
          <strong>Provider not configured.</strong> {status?.message} Lookups fall back to the
          local indicator table below; no reputation data is invented.
        </InfoNotice>
      ) : (
        <InfoNotice tone="ok">{status?.message}</InfoNotice>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="IP reputation lookup" subtitle="checks the configured provider">
          <form onSubmit={runLookup} className="flex gap-2">
            <Input
              className="mt-0"
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              placeholder="e.g. 172.16.0.1"
              required
            />
            <Button type="submit" disabled={busy}>
              {busy ? 'Checking...' : 'Look up'}
            </Button>
          </form>

          {lookup && (
            <div className="mt-4 space-y-2 rounded border border-edge bg-ink p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-slate-100">{lookup.indicator}</p>
                <Badge
                  className={
                    lookup.is_malicious === true
                      ? 'border-critical/40 bg-critical/10 text-critical'
                      : lookup.is_malicious === false
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-muted/30 bg-muted/10 text-muted'
                  }
                >
                  {lookup.is_malicious === true
                    ? 'malicious'
                    : lookup.is_malicious === false
                      ? 'not flagged'
                      : 'no verdict'}
                </Badge>
              </div>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Status</dt>
                  <dd className="text-slate-200">{lookup.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Threat level</dt>
                  <dd className="text-slate-200">{lookup.threat_level || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Provider</dt>
                  <dd className="text-slate-200">{lookup.provider}</dd>
                </div>
              </dl>
              <p className="text-[11px] text-muted">{STATUS_COPY[lookup.status]}</p>
              {lookup.details?.classification && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(lookup.details.classification)
                    .filter(([, value]) => value === true)
                    .map(([key]) => (
                      <Badge key={key} className="border-edge bg-panel text-muted">
                        {key.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                </div>
              )}
              {lookup.details?.note && (
                <p className="text-[11px] text-medium">{lookup.details.note}</p>
              )}
            </div>
          )}
        </Panel>

        {isAdmin ? (
          <Panel title="Add local indicator" subtitle="admin only">
            <form onSubmit={addIndicator} className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <Select
                  value={draft.indicator_type}
                  onChange={(event) =>
                    setDraft({ ...draft, indicator_type: event.target.value })
                  }
                >
                  {TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Threat level">
                <Select
                  value={draft.threat_level}
                  onChange={(event) => setDraft({ ...draft, threat_level: event.target.value })}
                >
                  {LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Value">
                  <Input
                    required
                    value={draft.indicator_value}
                    onChange={(event) =>
                      setDraft({ ...draft, indicator_value: event.target.value })
                    }
                    placeholder="172.16.0.1"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <Textarea
                    rows={2}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  />
                </Field>
              </div>
              <Field label="Source">
                <Input
                  value={draft.source}
                  onChange={(event) => setDraft({ ...draft, source: event.target.value })}
                  placeholder="manual"
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>
                  Save indicator
                </Button>
              </div>
            </form>
          </Panel>
        ) : (
          <Panel title="Local indicators" subtitle="read-only for analysts">
            <InfoNotice>
              Adding or removing indicators requires the admin role.
            </InfoNotice>
          </Panel>
        )}
      </div>

      <Panel title="Indicators of compromise" subtitle={`${indicators.length} record(s)`}>
        {indicators.length === 0 ? (
          <Empty>
            No local indicators yet. Add known-bad IPs or domains so lookups can return a
            verdict without an external provider.
          </Empty>
        ) : (
          <Table
            columns={['Type', 'Value', 'Level', 'Source', 'Last seen', '']}
            rows={indicators}
            renderRow={(indicator) => (
              <tr key={indicator.id} className="border-b border-edge/60">
                <td className="px-3 py-2 text-xs text-muted">{indicator.indicator_type}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-200">
                  {indicator.indicator_value}
                </td>
                <td className="px-3 py-2 text-xs text-slate-200">
                  {indicator.threat_level || '-'}
                </td>
                <td className="px-3 py-2 text-[11px] text-muted">{indicator.source || '-'}</td>
                <td className="px-3 py-2 text-[11px] text-muted">
                  {fmt.date(indicator.last_seen)}
                </td>
                <td className="px-3 py-2">
                  {isAdmin && (
                    <Button variant="danger" onClick={() => remove(indicator.id)} disabled={busy}>
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            )}
          />
        )}
      </Panel>
    </div>
  )
}
