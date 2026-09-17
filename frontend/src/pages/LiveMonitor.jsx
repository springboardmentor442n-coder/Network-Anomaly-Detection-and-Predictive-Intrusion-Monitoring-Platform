/**
 * Live monitoring page.
 *
 * Because the CICIDS2017 corpus is static, the primary mode is CSV replay: each
 * scan advances a cursor through real dataset rows and pushes them through the
 * detection pipeline, producing genuine real-time-like behaviour without
 * fabricating traffic. Live capture and Zeek appear here too, with their real
 * availability state.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useStream } from '../lib/useStream'
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

const KIND_LABEL = {
  dataset: 'Dataset',
  replay: 'Replay',
  live: 'Live capture',
  sensor: 'Sensor',
}

export default function LiveMonitor() {
  const [sources, setSources] = useState(null)
  const [selected, setSelected] = useState('csv_replay')
  const [batch, setBatch] = useState(10)
  const [auto, setAuto] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const { events, transport, clear } = useStream({ types: ['detection', 'alert', 'flow'] })
  const autoTimer = useRef(null)

  const loadSources = useCallback(async () => {
    try {
      const data = await api.sources()
      setSources(data)
      if (data.default_source) setSelected(data.default_source)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSources()
  }, [loadSources])

  const scan = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      setLastScan(await api.scan(selected, batch))
    } catch (err) {
      setError(err)
      setAuto(false)
    } finally {
      setBusy(false)
    }
  }, [selected, batch])

  useEffect(() => {
    if (!auto) {
      if (autoTimer.current) clearInterval(autoTimer.current)
      return undefined
    }
    scan()
    autoTimer.current = setInterval(scan, 6000)
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current)
    }
  }, [auto, scan])

  const resetCursor = async () => {
    try {
      await api.resetReplay()
      await loadSources()
    } catch (err) {
      setError(err)
    }
  }

  if (loading) return <Spinner label="Checking data sources" />

  const current = (sources?.sources || []).find((item) => item.name === selected)
  const detections = events.filter((event) => event.type === 'detection')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-accent">Monitoring</p>
          <h1 className="text-xl font-semibold text-slate-100">Live monitor</h1>
          <p className="mt-0.5 text-xs text-muted">
            Transport: <span className="text-accent">{transport}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200"
          >
            {(sources?.sources || []).map((source) => (
              <option key={source.name} value={source.name} disabled={!source.available}>
                {source.name} {source.available ? '' : '(unavailable)'}
              </option>
            ))}
          </select>
          <select
            value={batch}
            onChange={(event) => setBatch(Number(event.target.value))}
            className="rounded border border-edge bg-ink px-2 py-1.5 text-xs text-slate-200"
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} flows
              </option>
            ))}
          </select>
          <Button onClick={scan} disabled={busy || !current?.available}>
            {busy ? 'Scanning...' : 'Scan now'}
          </Button>
          <Button
            variant={auto ? 'danger' : 'secondary'}
            onClick={() => setAuto((value) => !value)}
            disabled={!current?.available}
          >
            {auto ? 'Stop auto-scan' : 'Start auto-scan'}
          </Button>
        </div>
      </div>

      <ErrorNotice error={error} onDismiss={() => setError(null)} />

      {current && !current.available && (
        <InfoNotice tone="warn">{current.reason}</InfoNotice>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(sources?.sources || []).map((source) => (
          <div
            key={source.name}
            className={`rounded-lg border p-3 ${
              source.available ? 'border-accent/30 bg-accent/5' : 'border-edge bg-panel'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-100">{source.name}</p>
              <span
                className={`h-2 w-2 rounded-full ${
                  source.available ? 'bg-accent' : 'bg-muted'
                }`}
              />
            </div>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
              {KIND_LABEL[source.kind] || source.kind}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-muted">
              {source.available
                ? source.details?.file_count
                  ? `${source.details.file_count} file(s) discovered`
                  : 'Ready'
                : source.reason}
            </p>
          </div>
        ))}
      </div>

      {lastScan && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Flows returned" value={fmt.number(lastScan.returned)} />
          <Stat label="Scored" value={fmt.number(lastScan.scored)} tone="accent" />
          <Stat
            label="Skipped"
            value={fmt.number(lastScan.skipped_incomplete_features)}
            tone="warn"
            hint="incomplete feature set"
          />
          <Stat label="Alerts raised" value={fmt.number(lastScan.alerts_created)} tone="danger" />
          <Stat label="Failed" value={fmt.number(lastScan.failed)} />
        </div>
      )}

      {lastScan?.skipped_incomplete_features > 0 && (
        <InfoNotice tone="warn">
          {lastScan.skipped_incomplete_features} flow(s) were recorded but not scored: this
          source cannot supply every feature the CICIDS2017 model was trained on. Values are
          never invented to fill the gap - use the <strong>csv_replay</strong> source for
          scoring.
        </InfoNotice>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Event stream"
          subtitle={`${detections.length} detection event(s) received`}
          actions={
            <Button variant="ghost" onClick={clear}>
              Clear
            </Button>
          }
        >
          {detections.length === 0 ? (
            <Empty>No events yet. Run a scan to generate live detections.</Empty>
          ) : (
            <div className="max-h-[460px] overflow-y-auto">
              <Table
                columns={['Time', 'Prediction', 'Risk', 'Severity', 'Source', 'Destination']}
                rows={detections}
                renderRow={(event) => (
                  <tr key={event.id} className="border-b border-edge/60">
                    <td className="px-3 py-2 text-[11px] text-muted">
                      {fmt.time(event.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-200">
                      {event.data.prediction}
                      {event.data.is_anomaly && (
                        <span className="ml-1.5 text-[10px] text-medium">anomaly</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums text-muted">
                      {event.data.risk_score}
                    </td>
                    <td className="px-3 py-2">
                      <SeverityBadge severity={event.data.severity} />
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted">
                      {event.data.source_ip || '-'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted">
                      {event.data.destination_ip || '-'}
                    </td>
                  </tr>
                )}
              />
            </div>
          )}
        </Panel>

        <Panel
          title="Last scan detail"
          subtitle={lastScan ? `${lastScan.source} (${lastScan.source_kind})` : 'no scan yet'}
          actions={
            selected === 'csv_replay' ? (
              <Button variant="ghost" onClick={resetCursor}>
                Rewind cursor
              </Button>
            ) : null
          }
        >
          {!lastScan ? (
            <Empty>Run a scan to see per-flow results.</Empty>
          ) : (
            <div className="max-h-[460px] overflow-y-auto">
              <Table
                columns={['Flow', 'Predicted', 'Corpus label', 'Risk']}
                rows={lastScan.results}
                renderRow={(row, index) => (
                  <tr key={index} className="border-b border-edge/60">
                    <td className="px-3 py-2 font-mono text-[11px] text-muted">
                      {row.flow.source_ip || '?'}:{row.flow.source_port ?? '?'} &rarr;{' '}
                      {row.flow.destination_ip || '?'}:{row.flow.destination_port ?? '?'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-200">
                      {row.scored ? row.detection.prediction : <span className="text-muted">not scored</span>}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted">
                      {row.flow.label || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums text-muted">
                      {row.scored ? row.detection.risk_score : '-'}
                    </td>
                  </tr>
                )}
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
