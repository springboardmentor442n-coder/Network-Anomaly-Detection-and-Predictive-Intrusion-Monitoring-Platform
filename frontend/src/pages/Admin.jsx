import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth.jsx'
import {
  Badge,
  Button,
  ConfigPill,
  Empty,
  ErrorNotice,
  InfoNotice,
  Panel,
  Spinner,
  Stat,
  Table,
  fmt,
} from '../components/ui'

export default function Admin() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [config, setConfig] = useState(null)
  const [models, setModels] = useState(null)
  const [activity, setActivity] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [userData, statsData, configData, modelData] = await Promise.all([
        api.users(),
        api.adminStats(),
        api.systemConfig(),
        api.models(),
      ])
      setUsers(userData)
      setStats(statsData)
      setConfig(configData)
      setModels(modelData)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (action, userId) => {
    setBusy(true)
    setError(null)
    try {
      if (action === 'activate') await api.activateUser(userId)
      else if (action === 'deactivate') await api.deactivateUser(userId)
      else if (action === 'promote') await api.promoteUser(userId)
      else if (action === 'demote') await api.demoteUser(userId)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const viewActivity = async (userId) => {
    try {
      setActivity(await api.userActivity(userId))
    } catch (err) {
      setError(err)
    }
  }

  const syncModels = async () => {
    setBusy(true)
    try {
      await api.syncModels()
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((item) => {
      if (term && !item.email.toLowerCase().includes(term)) return false
      if (roleFilter && item.role !== roleFilter) return false
      if (statusFilter === 'active' && !item.is_active) return false
      if (statusFilter === 'inactive' && item.is_active) return false
      return true
    })
  }, [users, search, roleFilter, statusFilter])

  if (loading) return <Spinner label="Loading admin console" />

  const app = config?.application || {}
  const notifications = config?.notifications || {}
  const threatIntel = config?.threat_intelligence || {}
  const model = config?.model || {}

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Administration</p>
          <h1 className="text-xl font-semibold text-slate-100">Admin console</h1>
          <p className="mt-0.5 text-xs text-muted">
            User management, configuration status and model registry.
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {(config?.warnings || []).length > 0 && (
        <div className="space-y-2">
          {config.warnings.map((warning) => (
            <InfoNotice key={warning} tone="warn">
              {warning}
            </InfoNotice>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={fmt.number(stats?.total_users)} />
        <Stat label="Active" value={fmt.number(stats?.active_users)} tone="accent" />
        <Stat label="Admins" value={fmt.number(stats?.admin_count)} />
        <Stat label="Analysts" value={fmt.number(stats?.analyst_count)} />
      </div>

      <Panel
        title="Users"
        subtitle={`${visible.length} of ${users.length} shown`}
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="search email"
              className="w-40 rounded border border-edge bg-ink px-2 py-1 text-xs text-slate-200 placeholder:text-muted/60"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded border border-edge bg-ink px-2 py-1 text-xs text-slate-200"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded border border-edge bg-ink px-2 py-1 text-xs text-slate-200"
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </div>
        }
      >
        <Table
          columns={['ID', 'Email', 'Role', 'Status', 'Created', 'Actions']}
          rows={visible}
          empty="No users match these filters."
          renderRow={(item) => {
            const isSelf = item.email === currentUser?.email
            return (
              <tr key={item.id} className="border-b border-edge/60">
                <td className="px-3 py-2 text-xs text-muted">#{item.id}</td>
                <td className="px-3 py-2 text-xs text-slate-200">
                  {item.email}
                  {isSelf && <span className="ml-1.5 text-[10px] text-accent">(you)</span>}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      item.role === 'admin'
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-edge bg-panel text-muted'
                    }
                  >
                    {item.role}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      item.is_active
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-critical/40 bg-critical/10 text-critical'
                    }
                  >
                    {item.is_active ? 'active' : 'deactivated'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-[11px] text-muted">{fmt.date(item.created_at)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {item.role === 'analyst' ? (
                      <Button
                        variant="secondary"
                        onClick={() => act('promote', item.id)}
                        disabled={busy}
                      >
                        Make admin
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => act('demote', item.id)}
                        disabled={busy || isSelf}
                        title={isSelf ? 'You cannot demote your own account' : undefined}
                      >
                        Make analyst
                      </Button>
                    )}
                    {item.is_active ? (
                      <Button
                        variant="danger"
                        onClick={() => act('deactivate', item.id)}
                        disabled={busy || isSelf}
                        title={isSelf ? 'You cannot deactivate your own account' : undefined}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button onClick={() => act('activate', item.id)} disabled={busy}>
                        Activate
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => viewActivity(item.id)}>
                      Activity
                    </Button>
                  </div>
                </td>
              </tr>
            )
          }}
        />
      </Panel>

      {activity && (
        <Panel
          title={`Activity: ${activity.user?.email}`}
          subtitle={`${activity.activity?.length || 0} recent audit entries`}
          actions={
            <Button variant="ghost" onClick={() => setActivity(null)}>
              Close
            </Button>
          }
        >
          {(activity.activity || []).length === 0 ? (
            <Empty>No recorded activity for this user.</Empty>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <Table
                columns={['Action', 'Details', 'When']}
                rows={activity.activity}
                renderRow={(row) => (
                  <tr key={row.id} className="border-b border-edge/60">
                    <td className="px-3 py-2 text-xs text-slate-200">{row.action}</td>
                    <td className="max-w-[420px] truncate px-3 py-2 font-mono text-[10px] text-muted">
                      {row.details || '-'}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted">{fmt.date(row.created_at)}</td>
                  </tr>
                )}
              />
            </div>
          )}
        </Panel>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Configuration status" subtitle="no secret values are returned by this API">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <ConfigPill configured={app.jwt_secret_configured} label="JWT secret" />
              <ConfigPill configured={app.cors_restricted} label="CORS restricted" />
              <ConfigPill configured={app.rate_limiting} label="Rate limiting" />
              <ConfigPill configured={app.email_configured} label="Email" />
              <ConfigPill configured={app.slack_configured} label="Slack" />
              <ConfigPill configured={app.webhook_configured} label="Webhook" />
              <ConfigPill configured={app.threat_intel_configured} label="Threat intel" />
              <ConfigPill configured={app.packet_capture_enabled} label="Packet capture" />
              <ConfigPill configured={app.zeek_configured} label="Zeek" />
            </div>
            <dl className="space-y-1.5 text-xs">
              {[
                ['Environment', app.environment],
                ['Database', app.database],
                ['Threat intel provider', app.threat_intel_provider],
                ['Alert threshold', app.alert_min_risk_score],
                ['Notify severities', (app.notify_severities || []).join(', ') || 'none'],
                ['Rate limit (login)', config?.rate_limiting?.limits?.login],
                ['Rate limit (register)', config?.rate_limiting?.limits?.register],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-slate-200">{String(value ?? '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        <Panel title="Notification channels" subtitle="severity-routed dispatch">
          <Table
            columns={['Channel', 'Status', 'Recipient']}
            rows={Object.entries(notifications)}
            renderRow={([channel, info]) => (
              <tr key={channel} className="border-b border-edge/60">
                <td className="px-3 py-2 text-xs text-slate-200">{channel}</td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      info.configured
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-muted/30 bg-muted/10 text-muted'
                    }
                  >
                    {info.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-[11px] text-muted">{info.recipient}</td>
              </tr>
            )}
          />
          <p className="mt-3 text-[11px] text-muted">
            Unconfigured channels record notifications as SKIPPED. Nothing is sent and nothing
            fails.
          </p>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Threat intelligence" subtitle={threatIntel.provider}>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Provider configured</dt>
              <dd className="text-slate-200">{String(threatIntel.provider_configured)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Available providers</dt>
              <dd className="text-slate-200">
                {(threatIntel.available_providers || []).join(', ')}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-muted">{threatIntel.message}</p>
        </Panel>

        <Panel
          title="Model registry"
          subtitle="the on-disk model is the source of truth"
          actions={
            <Button variant="secondary" onClick={syncModels} disabled={busy}>
              Register on-disk model
            </Button>
          }
        >
          <dl className="space-y-1.5 text-xs">
            {[
              ['Ready', String(model.ready)],
              ['Version', model.model_version || '-'],
              ['Dataset', model.dataset || '-'],
              ['Trained at', fmt.date(model.trained_at)],
              ['Training rows', fmt.number(model.sample_rows)],
              ['Classes', fmt.number(model.class_count)],
              ['Accuracy', fmt.percent(model.accuracy)],
              ['F1 (macro)', fmt.percent(model.f1_macro)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-[11px] uppercase tracking-wider text-muted">
            Registered versions
          </p>
          {(models?.registered_versions || []).length === 0 ? (
            <p className="mt-1 text-[11px] text-muted">
              None registered. Use the button above to record the current on-disk model.
            </p>
          ) : (
            <div className="mt-1 max-h-40 overflow-y-auto">
              <Table
                columns={['Type', 'Version', 'Accuracy', 'Trained']}
                rows={models.registered_versions}
                renderRow={(row) => (
                  <tr key={row.id} className="border-b border-edge/60">
                    <td className="px-3 py-1.5 text-[11px] text-slate-200">{row.model_type}</td>
                    <td className="px-3 py-1.5 text-[11px] text-muted">{row.version}</td>
                    <td className="px-3 py-1.5 text-[11px] text-muted">
                      {fmt.percent(row.accuracy)}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-muted">
                      {fmt.date(row.trained_at)}
                    </td>
                  </tr>
                )}
              />
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Retraining is not exposed over the API by design - it runs on the host with
            <code className="mx-1 rounded bg-ink px-1">python -m backend.scripts.train_models</code>
            so no API caller can trigger model training.
          </p>
        </Panel>
      </div>
    </div>
  )
}
