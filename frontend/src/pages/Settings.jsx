/**
 * Settings page.
 *
 * Read-only by design: every runtime setting is an environment variable on the
 * server, so this page shows what is configured and how to change it rather
 * than pretending the browser can mutate server config.
 */

import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth.jsx'
import { useStream } from '../lib/useStream'
import {
  Button,
  ConfigPill,
  ErrorNotice,
  InfoNotice,
  Panel,
  Spinner,
  Table,
  fmt,
} from '../components/ui'

const ENV_REFERENCE = [
  ['NETSHIELD_JWT_SECRET', 'Signing key for JWTs. Set a unique 32+ character value.'],
  ['NETSHIELD_DATABASE_URL', 'SQLAlchemy URL. Use PostgreSQL in production.'],
  ['NETSHIELD_CORS_ORIGINS', 'Comma-separated allowed origins.'],
  ['NETSHIELD_ALERT_MIN_RISK_SCORE', 'Risk score that triggers an alert.'],
  ['NETSHIELD_NOTIFY_SEVERITIES', 'Severities that dispatch notifications.'],
  ['NETSHIELD_SMTP_HOST / _PORT / _USERNAME / _PASSWORD', 'Email delivery.'],
  ['NETSHIELD_ALERT_EMAIL', 'Recipient for email alerts.'],
  ['NETSHIELD_SLACK_WEBHOOK_URL', 'Slack incoming webhook.'],
  ['NETSHIELD_WEBHOOK_URL', 'Generic outbound webhook.'],
  ['THREAT_INTEL_PROVIDER / _API_KEY / _BASE_URL', 'Threat intelligence provider.'],
  ['NETSHIELD_CAPTURE_ENABLED / _INTERFACE', 'Live packet capture (needs Scapy + Npcap).'],
  ['NETSHIELD_ZEEK_LOG_DIR', 'Directory containing Zeek conn.log.'],
  ['NETSHIELD_RATE_LIMIT_LOGIN / _REGISTER', 'Auth rate limits, e.g. 10/minute.'],
]

export default function Settings() {
  const { user, isAdmin } = useAuth()
  const [sources, setSources] = useState(null)
  const [streamInfo, setStreamInfo] = useState(null)
  const [policy, setPolicy] = useState(null)
  const [threatIntel, setThreatIntel] = useState(null)
  const [predictionStatus, setPredictionStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const { transport } = useStream({ enabled: true })

  const load = useCallback(async () => {
    setError(null)
    try {
      const [sourceData, streamData, policyData, tiData, predData] = await Promise.all([
        api.sources(),
        api.streamStatus(),
        api.riskPolicy(),
        api.threatIntelStatus(),
        api.predictionStatus(),
      ])
      setSources(sourceData)
      setStreamInfo(streamData)
      setPolicy(policyData)
      setThreatIntel(tiData)
      setPredictionStatus(predData)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner label="Loading settings" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Settings</p>
          <h1 className="text-xl font-semibold text-slate-100">Runtime configuration</h1>
          <p className="mt-0.5 text-xs text-muted">
            Configuration lives in server-side environment variables; this page is read-only.
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Your account">
          <dl className="space-y-1.5 text-xs">
            {[
              ['Email', user?.email],
              ['Role', user?.role],
              ['Active', String(user?.is_active)],
              ['Member since', fmt.date(user?.created_at)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-slate-200">{value ?? '-'}</dd>
              </div>
            ))}
          </dl>
          {!isAdmin && (
            <p className="mt-3 text-[11px] text-muted">
              Admin pages are hidden for analyst accounts. Ask an administrator to change your
              role if you need them.
            </p>
          )}
        </Panel>

        <Panel title="Detection pipeline">
          <dl className="space-y-1.5 text-xs">
            {[
              ['Models ready', String(predictionStatus?.ready)],
              ['Alert threshold', predictionStatus?.alert_threshold],
              ['Model version', predictionStatus?.model_info?.model_version || '-'],
              ['Dataset', predictionStatus?.model_info?.dataset || '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-slate-200">{String(value ?? '-')}</dd>
              </div>
            ))}
          </dl>
          {!predictionStatus?.ready && (
            <div className="mt-3">
              <InfoNotice tone="warn">
                No trained model on disk. Run{' '}
                <code className="rounded bg-ink px-1">
                  python -m backend.scripts.train_models
                </code>
                .
              </InfoNotice>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Monitoring sources" subtitle="real availability on this host">
        <Table
          columns={['Source', 'Kind', 'Available', 'Detail']}
          rows={sources?.sources || []}
          renderRow={(source) => (
            <tr key={source.name} className="border-b border-edge/60">
              <td className="px-3 py-2 text-xs text-slate-200">{source.name}</td>
              <td className="px-3 py-2 text-[11px] text-muted">{source.kind}</td>
              <td className="px-3 py-2">
                <ConfigPill configured={source.available} label="status" />
              </td>
              <td className="px-3 py-2 text-[11px] text-muted">
                {source.reason || 'Ready'}
              </td>
            </tr>
          )}
        />
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Real-time transport">
          <dl className="space-y-1.5 text-xs">
            {[
              ['Active transport', transport],
              ['WebSocket endpoint', streamInfo?.websocket?.path],
              ['SSE endpoint', streamInfo?.sse?.path],
              ['Polling endpoint', streamInfo?.polling?.path],
              ['Subscribers', fmt.number(streamInfo?.subscribers)],
              ['Last event id', fmt.number(streamInfo?.last_event_id)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="font-mono text-[11px] text-slate-200">{String(value ?? '-')}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] text-muted">
            The client tries WebSocket, then SSE, then polling. A failure at any level falls
            through to the next rather than breaking the UI.
          </p>
        </Panel>

        <Panel title="Threat intelligence">
          <dl className="space-y-1.5 text-xs">
            {[
              ['Provider', threatIntel?.provider],
              ['Configured', String(threatIntel?.provider_configured)],
              ['Available', (threatIntel?.available_providers || []).join(', ')],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-slate-200">{value || '-'}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-muted">{threatIntel?.message}</p>
        </Panel>
      </div>

      <Panel title="Risk scoring" subtitle="the formula applied to every flow">
        <p className="mb-3 rounded border border-edge bg-ink p-2.5 font-mono text-[11px] text-muted">
          score = anomaly_points + attack_weight x attack_probability + confidence_weight x
          confidence + attack_type_points, clamped to 0-100
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Anomaly points', policy?.anomaly_points],
            ['Attack weight', policy?.attack_probability_weight],
            ['Confidence weight', policy?.confidence_weight],
            ['Unknown type points', policy?.unknown_type_points],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-edge p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
              <p className="mt-1 text-lg tabular-nums text-slate-100">{value ?? '-'}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Environment variables" subtitle="set these on the server, never in the browser">
        <Table
          columns={['Variable', 'Purpose']}
          rows={ENV_REFERENCE}
          renderRow={([name, purpose]) => (
            <tr key={name} className="border-b border-edge/60">
              <td className="px-3 py-2 font-mono text-[11px] text-accent">{name}</td>
              <td className="px-3 py-2 text-xs text-muted">{purpose}</td>
            </tr>
          )}
        />
        <p className="mt-3 text-[11px] text-muted">
          See <code className="rounded bg-ink px-1">.env.example</code> for the full list with
          placeholder values.
        </p>
      </Panel>
    </div>
  )
}
