import { Component, useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API || "http://127.0.0.1:8000";
const pct = (x) => (x * 100).toFixed(1) + "%";
const C = { Low: "#4ade80", Medium: "#fbbf24", High: "#fb923c", Critical: "#ff4d6d" };
const lvl = (s) => (s > 75 ? "Critical" : s > 50 ? "High" : s > 25 ? "Medium" : "Low");
const when = (iso) => {
  if (!iso) return "No timestamp";
  const d = new Date(/Z|\+/.test(iso) ? iso : iso + "Z");
  return d.toLocaleDateString() + "  " + d.toLocaleTimeString();
};

async function api(path, token, opts = {}) {
  const res = await fetch(API + path, {
    method: opts.method || (opts.json || opts.body ? "POST" : "GET"),
    headers: { ...(opts.json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: opts.json ? JSON.stringify(opts.json) : opts.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed (" + res.status + ")");
  return data;
}

const Badge = ({ l, children }) => (
  <span className="badge" style={{ background: C[l] + "26", color: C[l] }}>{children || l}</span>
);

function Donut({ parts, total, label }) {
  const sum = parts.reduce((s, p) => s + p[1], 0);
  let a = 0;
  const stops = sum ? parts.map(([, v, c]) => { const s = a; a += (v / sum) * 100; return `${c} ${s}% ${a}%`; }).join(",") : "#1b2550 0% 100%";
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
        <div><b>{total}</b><span>{label}</span></div>
      </div>
      <div>
        {parts.map(([n, v, c]) => (
          <div key={n} className="legend"><i style={{ background: c }} />{n}<b>{v.toLocaleString()}</b></div>
        ))}
      </div>
    </div>
  );
}

function Bars({ entries, empty }) {
  if (!entries.length) return <p className="muted">{empty}</p>;
  const max = Math.max(...entries.map((e) => e[1]), 1);
  return entries.map(([k, v]) => (
    <div key={k} className="bar"><span>{k}</span><div><i style={{ width: (v / max) * 100 + "%" }} /></div><b>{v.toLocaleString()}</b></div>
  ));
}

function Radar({ blips, size = 300 }) {
  return (
    <svg viewBox="-150 -150 300 300" width={size} height={size} className="radar">
      <defs>
        <radialGradient id="rg"><stop offset="0" stopColor="#3de0ff" stopOpacity=".18" /><stop offset="1" stopColor="#3de0ff" stopOpacity="0" /></radialGradient>
        <linearGradient id="sw" x1="0" x2="1"><stop offset="0" stopColor="#3de0ff" stopOpacity="0" /><stop offset="1" stopColor="#3de0ff" stopOpacity=".55" /></linearGradient>
      </defs>
      <circle r="145" fill="url(#rg)" />
      {[145, 108, 72, 36].map((r) => <circle key={r} r={r} fill="none" stroke="#3de0ff" strokeOpacity=".22" />)}
      <line x1="-145" x2="145" stroke="#3de0ff" strokeOpacity=".15" /><line y1="-145" y2="145" stroke="#3de0ff" strokeOpacity=".15" />
      <g className="sweep"><path d="M0 0 L145 0 A145 145 0 0 0 125 -73 Z" fill="url(#sw)" /></g>
      {blips.map((b) => (
        <g key={b.id} transform={`translate(${b.x} ${b.y})`}>
          <circle r="4" fill={C[b.level]} /><circle r="4" fill="none" stroke={C[b.level]} className="ping" />
        </g>
      ))}
    </svg>
  );
}

function NetBg() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    let w = 0, h = 0, raf = 0;
    const N = 55;
    const pts = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0004, vy: (Math.random() - 0.5) * 0.0004 }));
    const resize = () => { w = cv.width = window.innerWidth; h = cv.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (!still) pts.forEach((p) => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1; });
      for (let i = 0; i < N; i++) {
        const a = pts[i];
        for (let j = i + 1; j < N; j++) {
          const b = pts[j], d = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
          if (d < 170) { ctx.strokeStyle = `rgba(61,224,255,${0.16 * (1 - d / 170)})`; ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke(); }
        }
        ctx.fillStyle = i % 9 === 0 ? "rgba(255,77,109,.75)" : "rgba(61,224,255,.55)";
        ctx.beginPath(); ctx.arc(a.x * w, a.y * h, i % 9 === 0 ? 2.8 : 1.8, 0, 6.3); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="netbg" />;
}

/* ---------------- Login ---------------- */
function Login({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setMsg("Enter both email and password.");
    setBusy(true); setMsg("");
    try {
      if (mode === "register") {
        await api("/register", null, { json: { email, password } });
        setMode("login"); setMsg("Account created. Sign in to continue.");
      } else {
        const d = await api("/login", null, { json: { email, password } });
        localStorage.setItem("tr_token", d.access_token); localStorage.setItem("tr_email", d.email); localStorage.setItem("tr_role", d.role);
        onAuth(d.access_token, d.email, d.role);
      }
    } catch (e) { setMsg(e.message === "Failed to fetch" ? "Cannot reach the server. Is the backend running on port 8000?" : e.message); }
    setBusy(false);
  };

  return (
    <div className="login">
      <div className="login-radar"><Radar blips={[]} size={460} /></div>
      <div className="panel login-card">
        <h1>ThreatRadar</h1>
        <p className="muted">Security Operations Center. Sign in to continue.</p>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="At least 8 characters" />
        {msg && <div className="msg">{msg}</div>}
        <button className="btn" disabled={busy} onClick={submit}>{mode === "login" ? "Sign in" : "Create account"}</button>
        <button className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); }}>
          {mode === "login" ? "Create an account" : "I already have an account"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Main app ---------------- */
const INTEL = [
  ["DoS", "Critical", "Floods a service to make it unavailable"], ["Worms", "Critical", "Self-propagating malware"],
  ["Backdoor", "High", "Unauthorized remote access"], ["Shellcode", "High", "Malicious executable payload"],
  ["Exploits", "High", "Abuse of known vulnerabilities"], ["Fuzzers", "Medium", "Malformed input to find bugs"],
  ["Analysis", "Medium", "Port scans and web probing"], ["Reconnaissance", "Low", "Network discovery before an attack"],
  ["Generic", "Low", "Broad protocol and cryptographic attacks"], ["Normal", "Low", "Normal traffic"],
];

function Shell({ token, email, role: initialRole, onLogout }) {
  const [role, setRole] = useState(initialRole);
  const [page, setPage] = useState("Dashboard");
  const [analysis, setAnalysis] = useState(null);
  const [results, setResults] = useState([]);
  const [runs, setRuns] = useState([]);
  const [events, setEvents] = useState([]);
  const [series, setSeries] = useState(Array(30).fill(0));
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [source, setSource] = useState("replay");
  const [cap, setCap] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [ev, setEvalRes] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const counter = useRef(0);

  const fail = (e) => { if (/log in|token/i.test(e.message)) onLogout(); else setError(e.message); };
  const loadRuns = () => api("/runs", token).then(setRuns).catch(fail);
  useEffect(() => { loadRuns(); api("/me", token).then((d) => setRole(d.role)).catch(() => {}); }, []);
  useEffect(() => { api("/live/status", token).then((d) => { setCap(d); if (d.available) setSource("capture"); }).catch(() => {}); }, []);
  const loadIncidents = () => api("/incidents", token).then(setIncidents).catch(fail);
  const loadNotifs = () => api("/notifications", token).then(setNotifs).catch(fail);
  useEffect(() => {
    setError("");
    if (page === "Alerts") {
      loadIncidents(); loadNotifs();
      const t = setInterval(() => { loadIncidents(); loadNotifs(); }, 5000);
      return () => clearInterval(t);
    }
    if (page === "Users") api("/users", token).then(setUsers).catch(fail);
    if (page === "Audit Log") api("/audit", token).then(setAuditRows).catch(fail);
  }, [page]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(async () => {
      try {
        const { events: ev } = await api("/live?n=4&source=" + source, token);
        const tagged = ev.map((e) => ({ ...e, id: ++counter.current, angle: Math.random() * 6.28, r: 30 + Math.random() * 105 }));
        setEvents((p) => [...tagged, ...p].slice(0, 80));
        setSeries((p) => [...p.slice(1), tagged.filter((e) => e.prediction !== "Normal").length]);
      } catch (e) { fail(e); }
    }, 2000);
    return () => clearInterval(t);
  }, [live, token, source]);

  const analyze = async (file) => {
    if (!file) return;
    setLoading(true); setError("");
    const fd = new FormData(); fd.append("file", file);
    try {
      const d = await api("/predict-csv", token, { body: fd });
      setAnalysis(d); setResults(d.results || []); setPage("Dashboard"); loadRuns();
    } catch (e) { fail(e); }
    setLoading(false);
  };

  const viewRun = async (r) => {
    try { const d = await api("/runs/" + r.id, token); setAnalysis(r); setResults(d.results); setPage("Dashboard"); } catch (e) { fail(e); }
  };
  const delRun = async (id) => { try { await api("/runs/" + id, token, { method: "DELETE" }); loadRuns(); } catch (e) { fail(e); } };

  const startLive = async () => {
    setError("");
    if (source === "capture") {
      try { await api("/live/capture/start", token, { method: "POST", json: {} }); } catch (e) { setError(e.message); return; }
    }
    setEvents([]); setLive(true);
  };
  const stopLive = async () => {
    setLive(false);
    if (source === "capture") { try { await api("/live/capture/stop", token, { method: "POST", json: {} }); } catch (e) { /* already stopped */ } }
  };
  const canWrite = role !== "Viewer";
  const menu = ["Dashboard", "Live Monitoring", "Alerts", "Model Evaluation", "Threat Intelligence", ...(role === "Admin" ? ["Users", "Audit Log"] : []), "Settings"];

  const download = async (path, name) => {
    try {
      const res = await fetch(API + path, { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) throw new Error("Download failed (" + res.status + ")");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob()); a.download = name; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { setError(e.message); }
  };
  const setStatus = async (id, status) => { try { await api("/incidents/" + id, token, { method: "PATCH", json: { status } }); loadIncidents(); } catch (e) { fail(e); } };
  const setUserRole = async (id, r) => { try { await api("/users/" + id + "/role", token, { method: "PATCH", json: { role: r } }); setUsers(await api("/users", token)); } catch (e) { fail(e); } };
  const markRead = async () => { try { await api("/notifications/read", token, { method: "POST", json: {} }); loadNotifs(); } catch (e) { fail(e); } };
  const evaluate = async (file) => {
    if (!file) return;
    setEvalLoading(true); setError("");
    const fd = new FormData(); fd.append("file", file);
    try { setEvalRes(await api("/evaluate", token, { body: fd })); } catch (e) { fail(e); }
    setEvalLoading(false);
  };

  // Intrusion forecast: least-squares trend over the last 30 scans, projected 10 scans ahead
  const fc = useMemo(() => {
    const n = series.length, mx = (n - 1) / 2, my = series.reduce((a, b) => a + b, 0) / n;
    const sxx = series.reduce((a, _, i) => a + (i - mx) ** 2, 0);
    const slope = sxx ? series.reduce((a, v, i) => a + (i - mx) * (v - my), 0) / sxx : 0;
    const next = Array.from({ length: 10 }, (_, k) => Math.max(0, my - slope * mx + slope * (n + k)));
    return { next, avg: next.reduce((a, b) => a + b, 0) / 10, label: slope > 0.03 ? "rising" : slope < -0.03 ? "falling" : "stable", color: slope > 0.03 ? C.Critical : slope < -0.03 ? "#4ade80" : C.Medium };
  }, [series]);
  const fpeak = Math.max(1, ...series, ...fc.next);

  const liveThreats = events.filter((e) => e.prediction !== "Normal");
  const blips = liveThreats.slice(0, 14).map((e) => ({ id: e.id, level: e.risk_level, x: Math.cos(e.angle) * e.r, y: Math.sin(e.angle) * e.r }));
  const maxRisk = Math.max(0, ...liveThreats.slice(0, 12).map((e) => e.risk_score));
  const level = lvl(maxRisk);
  const peak = Math.max(1, ...series);
  const A = analysis;
  const normal = A?.threat_distribution?.Normal || 0;
  const threatEntries = A ? Object.entries(A.threat_distribution || {}).sort((a, b) => b[1] - a[1]) : [];
  const risk = A?.risk_distribution || { Low: 0, Medium: 0, High: 0, Critical: 0 };
  const protoCounts = useMemo(() => { const d = {}; events.forEach((e) => (d[e.proto] = (d[e.proto] || 0) + 1)); return Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 8); }, [events]);
  const liveDist = useMemo(() => { const d = {}; liveThreats.forEach((e) => (d[e.prediction] = (d[e.prediction] || 0) + 1)); return Object.entries(d).sort((a, b) => b[1] - a[1]); }, [events]);
  const alerts = [
    ...events.filter((e) => e.risk_level === "High" || e.risk_level === "Critical").map((e) => ({ ...e, origin: "Live" })),
    ...results.filter((e) => e.risk_level === "High" || e.risk_level === "Critical").map((e) => ({ ...e, origin: "CSV" })),
  ];

  const Feed = ({ n }) => (
    <div className="feed">
      {events.length === 0 && <p className="muted">Waiting for the first flows.</p>}
      {events.slice(0, n).map((e) => (
        <div key={e.id} className="row">
          <span className="muted mono">{new Date(e.time).toLocaleTimeString()}</span>
          <span className="mono">{e.src} to {e.dst}</span>
          <span className="tag">{e.proto}</span>
          <span style={{ color: e.prediction === "Normal" ? "#7d8aa8" : "#fff" }}>{e.prediction}{e.anomaly && <span className="anom">anomaly</span>}</span>
          <Badge l={e.risk_level}>{e.risk_score.toFixed(0)} {e.risk_level}</Badge>
        </div>
      ))}
    </div>
  );

  const Kpi = ({ t, v, c, s }) => (<div className="panel kpi"><span>{t}</span><b style={{ color: c }}>{v}</b><small>{s}</small></div>);
  const Trend = ({ cls }) => (
    <svg viewBox="0 0 300 60" className={"spark " + (cls || "")} preserveAspectRatio="none">
      <polyline fill="none" stroke="#3de0ff" strokeWidth="2" points={series.map((v, i) => `${(i / 29) * 300},${56 - (v / peak) * 50}`).join(" ")} />
    </svg>
  );

  const drop = (
    <label className={"drop" + (drag ? " over" : "")}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); analyze(e.dataTransfer.files[0]); }}>
      <input type="file" accept=".csv" hidden disabled={loading} onChange={(e) => { analyze(e.target.files[0]); e.target.value = ""; }} />
      <b>{loading ? "Analyzing traffic..." : "Drop a CSV file here, or click to choose"}</b>
      <span>UNSW-NB15 format. Results appear on this page and are saved to Past runs below.</span>
    </label>
  );

  const pastRuns = (
    <>
    {runs.length > 1 && (
      <section className="panel"><h2>Attack trend across runs <span className="muted small">threat rate per run, oldest to newest</span></h2>
        <div className="trend">{[...runs].reverse().slice(-20).map((r) => {
          const pc = r.total_rows ? (r.threats_detected / r.total_rows) * 100 : 0;
          return (<div key={r.id} className="tcol" title={when(r.created_at) + ": " + pc.toFixed(1) + "%"}><i style={{ height: Math.max(3, pc) + "%", background: C[r.highest_risk] }} /><span>{pc.toFixed(0)}%</span></div>);
        })}</div>
      </section>
    )}
    <section className="panel"><h2>Past runs <span className="muted small">{runs.length} saved, all analysts</span></h2>
      {runs.length === 0 ? <p className="muted">No runs yet. Analyze a CSV and it will appear here with its date, time and analyst.</p> : (
        <div className="scroll tall"><table><thead><tr><th>Date and time</th><th>Run by</th><th>File</th><th>Rows</th><th>Threats</th><th>Critical</th><th>Alerts</th><th>Highest risk</th><th /></tr></thead>
          <tbody>{runs.map((r) => (
            <tr key={r.id}><td className="mono">{when(r.created_at)}</td><td>{r.mine ? <b>You</b> : r.run_by}</td><td>{r.filename}</td><td>{r.total_rows.toLocaleString()}</td><td>{r.threats_detected.toLocaleString()}</td><td>{r.critical_threats}</td><td>{r.active_alerts}</td>
              <td><Badge l={r.highest_risk} /></td>
              <td className="nowrap"><button className="link" onClick={() => viewRun(r)}>View</button><button className="link" onClick={() => download("/runs/" + r.id + "/report", "threatradar_run_" + r.id + ".csv")}>Report</button>{r.can_delete && <button className="link" onClick={() => delRun(r.id)}>Delete</button>}</td></tr>))}</tbody></table></div>
      )}
    </section>
    </>
  );

  const pages = {
    Dashboard: (
      <>
        {A && <section className="panel">
          <div className="between">
            <div><h2>Analyze network traffic</h2><p className="muted">Choose a CSV file with UNSW-NB15 features. The analysis appears below and is saved to Past runs at the bottom of this page.</p></div>
            <div className="row-btns">
              {canWrite && <label className="btn small">{loading ? "Analyzing..." : "Choose CSV file"}
                <input type="file" accept=".csv" hidden disabled={loading} onChange={(e) => { analyze(e.target.files[0]); e.target.value = ""; }} />
              </label>}
              {(A.run_id || A.id) && <button className="btn small ghost" onClick={() => download("/runs/" + (A.run_id || A.id) + "/report", "threatradar_report.csv")}>Download report</button>}
            </div>
          </div>
          {loading && <p className="muted">The AI model is analyzing your traffic. Please wait...</p>}
          {error && <div className="msg">{error}</div>}
        </section>}

        {!A && (
          <>
            <section className="welcome panel">
              <div>
                <h2>Your network, scanned for attacks.</h2>
                <p className="muted">Upload traffic and ThreatRadar's XGBoost model classifies every event into 10 categories, scores its risk and raises alerts for anything High or Critical.</p>
                {canWrite ? drop : <p className="muted">Your role is Viewer, so you can view results but not upload files.</p>}
                {error && <div className="msg">{error}</div>}
              </div>
              <div className="center"><Radar blips={[]} size={300} /></div>
            </section>
            <div className="g4">
              <Kpi t="AI model" v="XGBoost" s="Trained on UNSW-NB15" />
              <Kpi t="Attack classes" v="10" s="Normal plus 9 attack types" />
              <Kpi t="Test accuracy" v="83.63%" s="On held-out data" />
              <Kpi t="Weighted F1" v="0.819" s="Precision and recall combined" />
            </div>
            <section className="panel"><h2>How it works</h2>
              <div className="steps">
                {[["1", "Upload traffic", "Choose a CSV of network flows. Large files are processed in chunks."], ["2", "AI classifies each event", "The model labels every flow as Normal or one of 9 attack types, with a confidence."], ["3", "Risk scored and alerted", "Risk = severity x confidence. High and Critical events become alerts and the run is saved."]].map(([n, t, d]) => (
                  <div key={n} className="step"><span className="num">{n}</span><b>{t}</b><span className="muted">{d}</span></div>
                ))}
              </div>
            </section>
            <section className="panel"><h2>What ThreatRadar detects</h2>
              <div className="chips">
                {INTEL.filter(([n]) => n !== "Normal").map(([n, l, d]) => (
                  <div key={n} className="chip"><div className="between"><b>{n}</b><Badge l={l} /></div><span className="muted small">{d}</span></div>
                ))}
              </div>
            </section>
            {pastRuns}
          </>
        )}
        {A && (
          <>
            <p className="muted">Showing results for <b>{A.filename}</b></p>
            <div className="g5">
              <Kpi t="Total traffic" v={A.total_rows.toLocaleString()} s="Events analyzed" />
              <Kpi t="Threats detected" v={A.threats_detected.toLocaleString()} s="AI detected threats" />
              <Kpi t="Critical threats" v={A.critical_threats.toLocaleString()} c={C.Critical} s="Needs immediate attention" />
              <Kpi t="Active alerts" v={A.active_alerts.toLocaleString()} c={C.High} s="High and Critical events" />
              {A.anomalies !== undefined && <Kpi t="Anomalies" v={A.anomalies.toLocaleString()} c="#a78bfa" s="Isolation Forest outliers" />}
            </div>
            <div className="g2">
              <section className="panel"><h2>Traffic analysis</h2>
                <Donut total={A.total_rows.toLocaleString()} label="events" parts={[["Normal", normal, "#22c55e"], ["Threat", A.threats_detected, "#ef476f"]]} />
              </section>
              <section className="panel"><h2>Risk level distribution</h2>
                <Donut total={A.threats_detected.toLocaleString()} label="threats" parts={["Low", "Medium", "High", "Critical"].map((l) => [l, risk[l] || 0, C[l]])} />
              </section>
            </div>
            <section className="panel"><h2>Threat distribution</h2><Bars entries={threatEntries} empty="No attack categories found." /></section>
            <section className="panel"><h2>Threat detection results <span className="muted small">first {results.length} records</span></h2>
              <div className="scroll"><table><thead><tr><th>#</th><th>Prediction</th><th>Confidence</th><th>Risk score</th><th>Risk level</th></tr></thead>
                <tbody>{results.map((r, i) => (<tr key={i}><td>{i + 1}</td><td><b>{r.prediction}</b></td><td>{(r.confidence * 100).toFixed(1)}%</td><td>{r.risk_score}</td><td><Badge l={r.risk_level} /></td></tr>))}</tbody></table></div>
            </section>
            {pastRuns}
          </>
        )}
      </>
    ),

    "Live Monitoring": (
      <>
        <section className="panel">
          <div className="between">
            <div><h2>Live network monitoring</h2><p className="muted">Press Start to scan traffic. Every flow is classified by the AI model.</p></div>
            <div className="row-btns">
              <button className="btn small" disabled={live} onClick={startLive}>Start</button>
              <button className="btn small stop" disabled={!live} onClick={stopLive}>Stop</button>
            </div>
          </div>
          <div className="row-btns" style={{ marginTop: 14 }}>
            <button className={"pill " + (source === "capture" ? "on" : "")} disabled={live} onClick={() => setSource("capture")}>Real network capture</button>
            <button className={"pill " + (source === "replay" ? "on" : "")} disabled={live} onClick={() => setSource("replay")}>Dataset replay</button>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>
            {source === "capture"
              ? (cap?.available ? "Capturing real packets from this computer (" + (cap.interface || "default interface") + "). Run the backend as Administrator with Npcap installed. Only metadata is kept, never payloads." : "Packet capture is unavailable. Install scapy on the backend: pip install scapy. " + (cap?.error || ""))
              : "Replaying UNSW-NB15 flows through the model."}
          </p>
          {error && <div className="msg">{error}</div>}
        </section>
        {events.length === 0 ? (
          <section className="panel"><p className="muted">{live ? (source === "capture" ? "Listening for network traffic. Flows appear a few seconds after they finish. Browse a website or run a ping to generate some." : "Waiting for the first flows...") : "Monitoring is stopped. Click Start to see live traffic."}</p></section>
        ) : (
          <>
            <section className="hero panel">
              <div>
                <div className="muted">Current threat level {live ? "(live)" : "(stopped)"}</div>
                <div className="level" style={{ color: C[level] }}>{level}</div>
                <div className="muted">Highest recent risk score: <b>{maxRisk.toFixed(1)}</b> / 90</div>
                <div className="kpis">
                  <div><b>{events.length}</b><span>flows scanned</span></div>
                  <div><b>{liveThreats.length}</b><span>threats detected</span></div>
                  <div><b style={{ color: C.Critical }}>{liveThreats.filter((e) => e.risk_level === "Critical").length}</b><span>critical</span></div>
                  <div><b style={{ color: C.High }}>{liveThreats.filter((e) => e.risk_level === "High").length}</b><span>high</span></div>
                  <div><b style={{ color: "#a78bfa" }}>{events.filter((e) => e.anomaly).length}</b><span>anomalies</span></div>
                </div>
                <Trend />
              </div>
              <Radar blips={blips} />
            </section>
            <section className="panel"><h2>Live traffic</h2><Feed n={25} /></section>
            <section className="panel"><h2>Intrusion forecast <span className="muted small">next 10 scans, linear trend</span></h2>
              <svg viewBox="0 0 400 90" className="spark big" preserveAspectRatio="none">
                <polyline fill="none" stroke="#3de0ff" strokeWidth="2" points={series.map((v, i) => `${(i / 39) * 400},${84 - (v / fpeak) * 76}`).join(" ")} />
                <polyline fill="none" stroke="#ff4d6d" strokeWidth="2" strokeDasharray="5 4" points={[series[series.length - 1], ...fc.next].map((v, i) => `${((29 + i) / 39) * 400},${84 - (v / fpeak) * 76}`).join(" ")} />
              </svg>
              <p className="muted">Expected threats per scan: <b>{fc.avg.toFixed(1)}</b>. The intrusion trend is <b style={{ color: fc.color }}>{fc.label}</b>.</p>
            </section>
            <div className="g2">
              <section className="panel"><h2>Protocols</h2><Bars entries={protoCounts} empty="No traffic yet." /></section>
              <section className="panel"><h2>Live attack types</h2><Bars entries={liveDist} empty="No threats seen yet." /></section>
            </div>
          </>
        )}
      </>
    ),

    Alerts: (
      <>
        <div className="g4">
          <Kpi t="Open incidents" v={incidents.filter((i) => i.status !== "Resolved").length} c={C.High} s="New or investigating" />
          <Kpi t="Critical open" v={incidents.filter((i) => i.risk_level === "Critical" && i.status !== "Resolved").length} c={C.Critical} s="Immediate attention" />
          <Kpi t="Investigating" v={incidents.filter((i) => i.status === "Investigating").length} s="Being worked on" />
          <Kpi t="Resolved" v={incidents.filter((i) => i.status === "Resolved").length} c="#4ade80" s="Closed incidents" />
        </div>
        <section className="panel"><h2>Notifications <span className="muted small">{notifs.filter((n) => !n.read).length} unread</span></h2>
          {notifs.length === 0 ? <p className="muted">No notifications yet. Critical detections appear here, and are also sent to Slack or email when those are configured on the server.</p> : (
            <>
              {notifs.slice(0, 6).map((n) => (
                <div key={n.id} className="mini note"><span>{!n.read && <i className="unread" />}<b>{n.title}</b><br /><span className="muted small">{n.body}</span></span><span className="muted mono">{when(n.created_at)}</span></div>
              ))}
              <button className="link" onClick={markRead}>Mark all as read</button>
            </>
          )}
        </section>
        <section className="panel"><h2>Security incidents</h2>
          {incidents.length === 0 ? <p className="muted">No incidents yet. High and Critical detections from CSV runs and live monitoring create incidents here.</p> : (
            <div className="scroll tall"><table><thead><tr><th>Incident</th><th>Time</th><th>Source</th><th>Threat</th><th>Risk</th><th>Confidence</th><th>Level</th><th>Status</th></tr></thead>
              <tbody>{incidents.map((i) => (
                <tr key={i.id}><td className="mono">INC-{String(i.id).padStart(4, "0")}</td><td className="mono">{when(i.created_at)}</td><td>{i.source}</td><td><b>{i.attack}</b></td><td>{i.risk_score}</td><td>{(i.confidence * 100).toFixed(1)}%</td><td><Badge l={i.risk_level} /></td>
                  <td><select value={i.status} disabled={!canWrite} onChange={(e) => setStatus(i.id, e.target.value)}>{["New", "Investigating", "Resolved"].map((x) => <option key={x}>{x}</option>)}</select></td></tr>))}</tbody></table></div>
          )}
        </section>
      </>
    ),

    "Model Evaluation": (
      <>
        <section className="panel">
          <div className="between">
            <div><h2>Model evaluation</h2><p className="muted">Upload a labeled CSV that has the true attack_cat column (for example the UNSW-NB15 testing set). The model's predictions are compared with the true labels. Use data the model was not trained on for honest results.</p></div>
            {canWrite && <label className="btn small">{evalLoading ? "Evaluating..." : "Choose labeled CSV"}<input type="file" accept=".csv" hidden disabled={evalLoading} onChange={(e) => { evaluate(e.target.files[0]); e.target.value = ""; }} /></label>}
          </div>
          {error && <div className="msg">{error}</div>}
        </section>
        {!ev ? <section className="panel"><p className="muted">No evaluation yet. Choose a labeled CSV to see accuracy, precision, recall, F1, false positive rate and the confusion matrix.</p></section> : (
          <>
            <p className="muted">Evaluated <b>{ev.filename}</b> ({ev.rows.toLocaleString()} rows)</p>
            <div className="g5">
              <Kpi t="Accuracy" v={pct(ev.accuracy)} s="All classes" />
              <Kpi t="Precision" v={pct(ev.weighted.precision)} s="Weighted" />
              <Kpi t="Recall" v={pct(ev.weighted.recall)} s="Weighted" />
              <Kpi t="F1-score" v={pct(ev.weighted.f1)} s="Weighted" />
              <Kpi t="False positive rate" v={pct(ev.fpr)} c={C.Medium} s="Normal flagged as attack" />
            </div>
            <div className="g2">
              <Kpi t="Threat detection rate" v={pct(ev.detection_rate)} c="#4ade80" s="Attacks flagged as any threat" />
              <Kpi t="Macro F1" v={pct(ev.macro.f1)} s={"Macro precision " + pct(ev.macro.precision) + ", recall " + pct(ev.macro.recall)} />
            </div>
            <section className="panel"><h2>Per-class results</h2>
              <div className="scroll"><table><thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1-score</th><th>Support</th></tr></thead>
                <tbody>{ev.per_class.map((c) => (<tr key={c.label}><td><b>{c.label}</b></td><td>{pct(c.precision)}</td><td>{pct(c.recall)}</td><td>{pct(c.f1)}</td><td>{c.support.toLocaleString()}</td></tr>))}</tbody></table></div>
            </section>
            <section className="panel"><h2>Confusion matrix <span className="muted small">rows are true labels, columns are predictions</span></h2>
              <div className="scroll"><table className="cm"><thead><tr><th>True vs predicted</th>{ev.labels.map((l) => <th key={l}>{l.slice(0, 5)}</th>)}</tr></thead>
                <tbody>{ev.matrix.map((row, i) => { const mx = Math.max(...row, 1); return (
                  <tr key={i}><td><b>{ev.labels[i]}</b></td>{row.map((v, j) => <td key={j} style={{ textAlign: "center", background: `rgba(${i === j ? "74,222,128" : "255,77,109"},${Math.min(0.75, v / mx)})` }}>{v}</td>)}</tr>); })}</tbody></table></div>
            </section>
          </>
        )}
      </>
    ),

    Users: (
      <section className="panel"><h2>Team management <span className="muted small">Admin only</span></h2>
        <p className="muted">Admin: full access and user management. Analyst: upload, analyze and manage incidents. Viewer: read-only access.</p>
        {error && <div className="msg">{error}</div>}
        <div className="scroll"><table><thead><tr><th>User</th><th>Role</th><th>Runs</th><th>Joined</th></tr></thead>
          <tbody>{users.map((u) => (<tr key={u.id}><td>{u.email}</td><td><select value={u.role} onChange={(e) => setUserRole(u.id, e.target.value)}>{["Admin", "Analyst", "Viewer"].map((r) => <option key={r}>{r}</option>)}</select></td><td>{u.runs}</td><td className="mono">{when(u.created_at)}</td></tr>))}</tbody></table></div>
      </section>
    ),

    "Audit Log": (
      <section className="panel"><h2>Audit log <span className="muted small">last 200 actions, Admin only</span></h2>
        {auditRows.length === 0 ? <p className="muted">No activity recorded yet.</p> : (
          <div className="scroll tall"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>{auditRows.map((a) => (<tr key={a.id}><td className="mono">{when(a.created_at)}</td><td>{a.user}</td><td><b>{a.action}</b></td><td className="muted">{a.detail}</td></tr>))}</tbody></table></div>
        )}
      </section>
    ),

    "Threat Intelligence": (
      <section className="panel"><div className="between"><h2>Threat intelligence</h2><button className="btn small" onClick={() => download("/intel/report", "threatradar_intelligence_report.csv")}>Download report</button></div>
        <p className="muted">Attack categories from the UNSW-NB15 model, with the latest counts from your analysis.</p>
        <div className="scroll"><table><thead><tr><th>Category</th><th>Severity</th><th>Description</th><th>Detected</th></tr></thead>
          <tbody>{INTEL.map(([n, l, d]) => (<tr key={n}><td><b>{n}</b></td><td><Badge l={l} /></td><td>{d}</td><td>{(A?.threat_distribution?.[n] || 0).toLocaleString()}</td></tr>))}</tbody></table></div>
      </section>
    ),

    Settings: (
      <>
        <section className="panel"><h2>Account</h2>
          <div className="kpis"><div><b>{email}</b><span>signed in</span></div><div><b>{role}</b><span>role</span></div></div>
          <button className="btn small" onClick={onLogout}>Sign out</button>
        </section>
        <section className="panel"><h2>Risk scoring</h2>
          <p className="muted">Risk score = attack severity x model confidence.</p>
          <div className="scroll"><table><thead><tr><th>Level</th><th>Score</th><th>Response</th></tr></thead><tbody>
            {[["Low", "0 - 25", "Monitor"], ["Medium", "26 - 50", "Investigate"], ["High", "51 - 75", "Alert"], ["Critical", "76 - 90", "Immediate attention"]].map(([l, s, r]) => (<tr key={l}><td><Badge l={l} /></td><td>{s}</td><td>{r}</td></tr>))}
          </tbody></table></div>
        </section>
        <section className="panel"><h2>Configuration</h2>
          <div className="kpis"><div><b>XGBoost</b><span>model</span></div><div><b>UNSW-NB15</b><span>dataset</span></div><div><b>FastAPI</b><span>backend</span></div><div><b>React + Vite</b><span>frontend</span></div></div>
        </section>
      </>
    ),
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="dot" />ThreatRadar</div>
        <nav>{menu.map((m) => (<button key={m} className={page === m ? "active" : ""} onClick={() => setPage(m)}>{m}</button>))}</nav>
        <div className="side-foot"><span className="muted small">{email}</span></div>
      </aside>
      <main className="main">
        <h1 className="page-title">{page}</h1>
        {pages[page]}
      </main>
    </div>
  );
}

class Boundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 40 }}>
        <h2>Something went wrong</h2>
        <pre style={{ whiteSpace: "pre-wrap", color: "#ffb3c0" }}>{String(this.state.err.stack || this.state.err)}</pre>
        <button className="btn small" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("tr_token"));
  const [email, setEmail] = useState(localStorage.getItem("tr_email") || "");
  const [role, setRole] = useState(localStorage.getItem("tr_role") || "Analyst");
  const logout = () => { localStorage.removeItem("tr_token"); setToken(null); };
  return (
    <>
      <style>{css}</style>
      <Boundary><NetBg />{token ? <Shell token={token} email={email} role={role} onLogout={logout} /> : <Login onAuth={(t, e, r) => { setToken(t); setEmail(e); setRole(r); }} />}</Boundary>
    </>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@400&display=swap');
:root{--ink:#060a1c;--panel:rgba(18,26,58,.62);--line:rgba(120,150,255,.16);--cyan:#3de0ff;--text:#e8edff;--mute:#7d8aa8}
*{box-sizing:border-box}
.netbg{position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.shell,.login{position:relative;z-index:1}
.welcome{display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:center;padding:34px}
.welcome h2{font-size:34px;line-height:1.15;margin:0 0 12px}.center{display:grid;place-items:center}
.drop{display:grid;gap:6px;border:2px dashed #3de0ff66;border-radius:16px;padding:26px;cursor:pointer;margin-top:22px;background:#3de0ff0d;transition:background .2s,border-color .2s}
.drop:hover,.drop.over{background:#3de0ff1f;border-color:var(--cyan)}.drop b{font-size:16px}.drop span{color:var(--mute);font-size:13px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.step{display:grid;gap:8px;align-content:start}
.num{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#5b5bff,#2bb8ff);color:#fff;font-weight:700;font-size:14px}
.g5{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px}
.trend{display:flex;align-items:flex-end;gap:8px;height:150px}.tcol{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%}.tcol i{width:100%;border-radius:6px 6px 0 0;display:block}.tcol span{font-size:11px;color:var(--mute)}
select{background:#0a1130;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font:inherit}select:disabled{opacity:.5}
.anom{margin-left:8px;font-size:10px;padding:1px 7px;border-radius:99px;background:#a78bfa33;color:#c4b5fd}
.mini.note{grid-template-columns:1fr auto}.unread{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--cyan);margin-right:8px}
.cm th,.cm td{padding:7px 9px;font-size:12px}.btn.ghost{background:none;border:1px solid var(--line);color:var(--text)}
.tall{max-height:400px;overflow-y:auto}
.chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.chip{border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:8px;background:#ffffff06}
html,body,#root{margin:0;padding:0;width:100%;max-width:none;min-height:100vh;border:0;text-align:left;display:block}
body{background:radial-gradient(1200px 700px at 80% -10%,#1b2a7a55,transparent),radial-gradient(900px 600px at -10% 110%,#0a6a8a44,transparent),var(--ink);color:var(--text);font-family:Sora,system-ui,sans-serif}
.shell{display:grid;grid-template-columns:230px 1fr;min-height:100vh}
.side{position:sticky;top:0;height:100vh;padding:22px 14px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:20px;background:#070d24cc}
.brand{font-weight:700;font-size:19px;display:flex;align-items:center;gap:10px;padding:0 8px}
.dot{width:12px;height:12px;border-radius:50%;background:var(--cyan);box-shadow:0 0 14px var(--cyan)}
nav{display:grid;gap:4px}nav button{background:none;border:0;color:var(--mute);text-align:left;padding:11px 14px;border-radius:10px;font:inherit;cursor:pointer}
nav button:hover{background:#ffffff0a;color:var(--text)}nav button.active{background:linear-gradient(135deg,#5b5bff33,#2bb8ff22);color:#fff;box-shadow:inset 3px 0 0 var(--cyan)}
.side-foot{margin-top:auto;display:grid;gap:8px;padding:0 8px}
.main{padding:26px 28px 100px;display:grid;gap:18px;align-content:start;min-width:0}
.page-title{margin:0;font-size:26px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px}
h1{margin:0 0 4px}h2{margin:0 0 14px;font-size:16px;font-weight:600}
.muted{color:var(--mute)}.small{font-size:12px}.mono{font-family:'JetBrains Mono',monospace;font-size:12px}.nowrap{white-space:nowrap}
.hero{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}
.level{font-size:64px;font-weight:700;line-height:1.1;margin:4px 0;text-shadow:0 0 30px currentColor}
.kpis{display:flex;gap:28px;flex-wrap:wrap;margin:16px 0}.kpis div{display:grid}.kpis b{font-size:24px}.kpis span{color:var(--mute);font-size:12px}
.spark{width:100%;max-width:440px;height:60px}.spark.big{max-width:none;height:90px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.kpi{display:grid;gap:4px}.kpi span{color:var(--mute);font-size:13px}.kpi b{font-size:28px}.kpi small{color:var(--mute);font-size:12px}
.radar .sweep{animation:spin 4s linear infinite;transform-origin:0 0}.radar .ping{animation:ping 2s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes ping{from{r:4;opacity:1}to{r:14;opacity:0}}
.row{display:grid;grid-template-columns:70px 1fr 50px 110px 120px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
.mini{display:grid;grid-template-columns:1fr 1fr 50px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
.tag{border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:11px;text-align:center;color:var(--mute)}
.badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap;text-align:center}
.bar{display:grid;grid-template-columns:120px 1fr 60px;gap:10px;align-items:center;margin:10px 0;font-size:13px}.bar div{background:#ffffff0d;border-radius:9px;height:8px}.bar i{display:block;height:8px;border-radius:9px;background:linear-gradient(90deg,#5b5bff,var(--cyan));transition:width .5s}.bar b{text-align:right}
.donut-wrap{display:flex;align-items:center;justify-content:center;gap:34px;flex-wrap:wrap;min-height:200px}
.donut{width:180px;height:180px;border-radius:50%;display:grid;place-items:center}.donut>div{width:118px;height:118px;border-radius:50%;background:#0a1230;display:grid;place-content:center;text-align:center}.donut b{font-size:22px}.donut span{font-size:12px;color:var(--mute)}
.legend{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:13px}.legend i{width:12px;height:12px;border-radius:50%}.legend b{margin-left:auto;padding-left:18px}
.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;color:var(--mute);font-weight:400;padding:8px 10px}td{padding:10px;border-top:1px solid var(--line)}
label{display:block;margin:14px 0 6px;font-size:13px;color:var(--mute)}
input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:#0a1130;color:var(--text);font:inherit}input:focus,button:focus-visible{outline:2px solid var(--cyan)}
.between{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}.between h2,.between p{margin:0 0 4px}
.btn{display:inline-block;margin-top:18px;padding:12px 20px;border:0;border-radius:12px;background:linear-gradient(135deg,#5b5bff,#2bb8ff);color:#fff;font:inherit;font-weight:600;cursor:pointer;width:100%;text-align:center}
.btn.small{margin:0;width:auto;padding:10px 18px}.btn:disabled{opacity:.4;cursor:not-allowed}.btn.stop{background:linear-gradient(135deg,#ff4d6d,#c2185b)}.row-btns{display:flex;gap:10px}
.link{background:none;border:0;color:var(--cyan);cursor:pointer;font:inherit;padding:6px 8px}
.pill{border:1px solid var(--line);background:none;color:var(--mute);border-radius:99px;padding:6px 14px;font:inherit;cursor:pointer}.pill.on{color:#4ade80;border-color:#4ade8066}
.msg{background:#ff4d6d1f;color:#ffb3c0;padding:10px 14px;border-radius:10px;font-size:13px;margin-top:12px}
.login{min-height:100vh;display:grid;place-items:center;position:relative;overflow:hidden;padding:20px}.login-radar{position:absolute;opacity:.35}.login-card{width:100%;max-width:380px;position:relative}
@media(max-width:900px){.shell{grid-template-columns:1fr}.side{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center}nav{display:flex;flex-wrap:wrap}.side-foot{margin:0}.g4{grid-template-columns:1fr 1fr}.g2,.hero{grid-template-columns:1fr}.row{grid-template-columns:60px 1fr 110px}.row .tag,.row .mono:nth-child(2){display:none}}
@media(max-width:900px){.welcome,.steps{grid-template-columns:1fr}.welcome{padding:22px}}
@media(prefers-reduced-motion:reduce){.radar .sweep,.radar .ping{animation:none}}
`;