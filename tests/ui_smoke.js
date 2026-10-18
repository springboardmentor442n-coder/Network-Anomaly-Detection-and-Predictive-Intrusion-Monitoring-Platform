// Smoke test for static/js/app.js in a fake browser: every page, logged out and logged in.
// Run:  node tests/ui_smoke.js      (set TZ=Asia/Kolkata to see times converted to that zone)
const vm = require("vm"), fs = require("fs"), path = require("path");
const code = fs.readFileSync(path.join(__dirname, "..", "static", "js", "app.js"), "utf8");
const errors = [];
process.on("unhandledRejection", e => errors.push("unhandledRejection: " + (e && e.stack || e)));
const T = "2026-10-04T10:00:00", FULL = "2026-10-04 10:00:00";
const alertRow = {id: 1, ts: T, prediction: "DoS", confidence: .9, risk_score: 72, risk_label: "High", ack: 0};
const histRow = {id: 1, ts: T, prediction: "DoS", confidence: .9, risk_score: 72, risk_label: "High", anomaly_score: 10, model: "XGBoost", source: "network", source_name: null, proto: "tcp", service: "-", sbytes: 5, dbytes: 6};
const inc = {id: 1, rows: [{id: 1, alert_id: 5, title: "DoS", severity: "High", status: "open", assignee: null, created_by: "bob", created_at: T, updated_at: T}]};
const ev = {model: "XGBoost", rows: 100, accuracy: .97, macro_f1: .9, detection_rate: .98, false_positive_rate: .02, precision_attack: .99, tp: 50, fn: 1, fp: 1, tn: 48, ms_per_1000: 12.3, classes: [{name: "DoS", precision: .9, recall: .8, f1: .85, support: 10}]};
const report = {days: 7, kpis: {total: 10, attacks: 4, critical: 1, high: 1, avg_risk: 20.5, suspicious: 2, open_alerts: 2, open_incidents: 1}, top_ips: [{ip: "203.0.113.9", flows: 5, attacks: 3, max_risk: 80, blocklist: true}], protocols: [{name: "tcp", total: 8, attacks: 3}], services: [], daily: [{d: "2026-10-04", total: 10, attacks: 4}], types: [{name: "DoS", n: 4, avg_risk: 60, max_risk: 80}], top: [{ts: FULL, prediction: "DoS", risk_score: 80, risk_label: "Critical", model: "XGBoost", source: "live", proto: "tcp", service: "-"}], models: []};
const fixture = u => u.startsWith("/api/interfaces") ? {available: true, interfaces: [{name: "Wi-Fi", description: "Intel", ip: "192.168.1.5", default: true}]}
  : u.startsWith("/api/forecast") ? {labels: ["10-06 08"], attacks: [3], high: [1], forecast: [2, 3], forecast_high: [1, 1], band: 1.5, forecast_labels: ["10-06 09", "10-06 10"], outlook: "stable"}
  : u.startsWith("/api/performance") ? {perf: {api_ms: {avg: 12.3, p95: 20}, alert_latency_ms: {avg: 30, p95: 45}, batch_ms: {avg: 25}, flows_per_sec: 400, uptime_s: 600}, dashboards_connected: 2, model: "XGBoost"}
  : u.startsWith("/api/metrics/evaluate") ? ev
  : u.startsWith("/api/threatintel/") ? {ip: "203.0.113.66", private: false, blocklist: true, abuseipdb: null, verdict: "malicious"}
  : u.startsWith("/api/me") ? {username: "bob", role: "analyst", team: null}
  : u.startsWith("/api/users") ? {users: ["bob", "amy"]}
  : u.includes("/notes") ? {rows: [{username: "bob", ts: T, note: "checked"}]}
  : u.startsWith("/api/incidents") ? inc
  : u.startsWith("/api/report") ? report
  : u.startsWith("/api/admin/users") ? {users: [{username: "bob", role: "admin", team_id: 1, team: "SOC"}], teams: [{id: 1, name: "SOC"}]}
  : u.startsWith("/api/admin/") ? {rows: [{ts: T, username: "bob", action: "login", detail: "", ip: "1.2.3.4", channel: "webhook", target: "x", subject: "s", status: "sent"}]}
  : u.startsWith("/api/models") ? {active: "XGBoost", anomaly: false, models: [{name: "XGBoost", available: true, loaded: true, error: null, metrics: {accuracy: .9, precision: .8, recall: .8, macro_f1: .8, weighted_f1: .9}}]}
  : u.startsWith("/api/live/history") ? {rows: [{started_at: T, stopped_at: null, started_by: "bob", source: "network", iface: "Wi-Fi", status: "running", flows: 5, attacks: 2, alerts: 1, max_risk: 70}]}
  : u.startsWith("/api/live/status") ? {running: false}
  : u.startsWith("/api/alerts/count") ? {open: 3}
  : u.startsWith("/api/alerts") ? {rows: [alertRow]}
  : u.startsWith("/api/risk/score") ? {risk_score: 50, risk_label: "Medium"}
  : u.startsWith("/api/risk") ? {severity: {Normal: 0, DoS: 80}, cutoffs: [[25, "Low"], [50, "Medium"], [75, "High"], [100, "Critical"]], by_class: [{prediction: "DoS", n: 2, av: 70, mx: 80}]}
  : u.startsWith("/api/history") ? {total: 1, rows: [histRow]}
  : u.startsWith("/api/stats") ? {total: 0, normal: 0, score_sum: 0, levels: {}, classes: {}, rows: [{time: FULL, prediction: "DoS", risk_score: 70, risk_label: "High"}], hourly: []}
  : {};
function run(page, token) {
  const els = {}, mkEl = () => ({style: {}, dataset: {}, classList: {toggle() {}, add() {}, remove() {}}, files: [], value: "50", hidden: false, disabled: false,
    textContent: "", innerHTML: "", append() {}, replaceChildren() {}, focus() {}, click() {}, set autocomplete(v) {}});
  const store = token ? {ns_token: token, ns_user: "bob"} : {}, sources = [];
  class ES { constructor(u) { this.url = u; this.l = {}; sources.push(this); } addEventListener(n, f) { this.l[n] = f; } close() {} }
  const sb = {
    setInterval: () => 0, matchMedia: () => ({matches: false}), performance: {now: () => 0}, requestAnimationFrame: () => 0,
    console, setTimeout, JSON, Object, Math, Date, String, Number, Array, Promise, encodeURIComponent, Proxy, prompt: () => "Test incident",
    document: {addEventListener() {}, body: {dataset: {}, classList: {add() {}, remove() {}, toggle() {}, contains() { return false; }}}, getElementById: id => els[id] || (els[id] = mkEl()), createElement: () => mkEl(), querySelectorAll: () => []},
    localStorage: {getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = v, removeItem: k => delete store[k]},
    location: {pathname: page, href: ""}, alert: m => errors.push("alert: " + m),
    Chart: Object.assign(function () { return {data: {labels: [], datasets: [{data: []}, {data: []}]}, update() {}}; }, {defaults: {}}),
    EventSource: ES, fetch: async u => ({ok: true, status: 200, json: async () => fixture(u)}),
  };
  sb.window = sb;
  try { vm.runInNewContext(code, sb); } catch (e) { errors.push(`LOAD ${page} token=${!!token}: ${e.stack.split("\n").slice(0, 3).join(" | ")}`); return Promise.resolve(); }
  return new Promise(res => setTimeout(async () => {
    try {
      if (token) {
        await els["start2"].onclick();
        const live = sources.find(s => s.url.startsWith("/api/live?"));
        if (!live) errors.push(`${page}: no EventSource after Start live`);
        else live.l.batch({data: JSON.stringify({id: 1, type: "batch", n: 2, classes: {Normal: 1, DoS: 1}, levels: {Low: 1, High: 1}, score_sum: 70, rows: [{time: FULL, prediction: "DoS", risk_score: 70, risk_label: "High"}]})});
        await els["stop2"].onclick(); await els["pfRefresh"].onclick(); await els["pfEval"].onclick(); await els["tiBtn"].onclick();
        if (page === "/history") console.log("history time shown:", (/<td>(\d{4}-[^<]*)<\/td>/.exec(els["hrows"].innerHTML) || [])[1]);
        if (page === "/live") console.log("live feed time shown:", (/<td>([^<]*)<\/td>/.exec(els["lrows"].innerHTML) || [])[1]);
      }
    } catch (e) { errors.push(`RUN ${page}: ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
    res();
  }, 30));
}
(async () => {
  const pages = ["/", "/live", "/alerts", "/risk", "/history", "/detection", "/login", "/register", "/models", "/incidents", "/reports", "/admin", "/performance"];
  for (const p of pages) for (const t of ["", "tok"]) await run(p, t);
  console.log(errors.length ? errors.join("\n") : `NO ERRORS in ${pages.length * 2} runs`);
  process.exit(errors.length ? 1 : 0);
})();
