"use strict";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let token = sessionStorage.getItem("token"),
  scanId = null,
  controller = null,
  rows = [],
  lastId = 0,
  running = false,
  role = null,
  generation = 0,
  activeMetadata = null;
function notice(s) {
  $("notice").textContent = s;
  $("notice").hidden = !s;
}
async function api(path, opts = {}) {
  const headers = {
    ...(opts.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    Authorization: "Bearer " + token,
    ...opts.headers,
  };
  const r = await fetch("/api" + path, { cache: "no-store", ...opts, headers });
  if (!r.ok) {
    let b;
    try {
      b = await r.json();
    } catch {
      b = { detail: r.statusText };
    }
    if (r.status === 401) {
      sessionStorage.removeItem("token");
      $("workspace").hidden = true;
      $("auth").hidden = false;
    }
    throw Error(
      typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail),
    );
  }
  return r;
}
async function json(path, opts) {
  return (await api(path, opts)).json();
}
function detail(data) {
  $("detailText").textContent =
    (data.models && data.src_ip
      ? "Consensus: " +
        data.consensus +
        "\nRisk calculation: " +
        data.severity +
        " × " +
        data.confidence +
        " = " +
        data.risk_score +
        "/100 (" +
        data.risk_label +
        ")\nReview reasons: " +
        (data.review_reasons || []).join("; ") +
        "\nIPs: " +
        (data.src_ip.value || "Unavailable") +
        " → " +
        (data.dst_ip.value || "Unavailable") +
        "\n\n"
      : "") + JSON.stringify(data, null, 2);
  $("detail").showModal();
}
$("close").onclick = () => $("detail").close();
$("logout").onclick = async () => {
  if (running) await stop();
  try {
    await json("/logout", { method: "POST" });
  } catch (e) {
    notice("Sign out could not be confirmed: " + e.message);
    return;
  }
  sessionStorage.removeItem("token");
  location.reload();
};
async function boot() {
  try {
    const u = await json("/me");
    role = u.role;
    $("auth").hidden = true;
    $("workspace").hidden = false;
    $("logout").hidden = false;
    $("identity").textContent = "● " + (u.display_name || u.username) + (u.display_name && u.display_name !== u.username ? " · @" + u.username : "") + " is active · " + role;
    $("identity").classList.add("identity-active");
    $("teamNav").hidden = role !== "Admin";
    $("scan").disabled = role === "Viewer";
    $("upload").disabled = role === "Viewer";
    await sources();
    const meta = await json("/models");
    activeMetadata = meta;
    $("scope").textContent = meta.scope;
    $("modelDetails").textContent = JSON.stringify(meta, null, 2);
    $("modelTable").innerHTML =
      "<table><thead><tr><th>MODEL</th><th>MACRO F1</th><th>WEIGHTED F1</th><th>ATTACK RECALL</th><th>FALSE POSITIVE RATE</th><th>P95 BATCH MS</th><th>ROWS / S</th></tr></thead><tbody>" +
      Object.entries(meta.models)
        .map(
          ([n, m]) =>
            `<tr><td>${esc(n)}</td><td>${m.macro_f1.toFixed(3)}</td><td>${m.weighted_f1.toFixed(3)}</td><td>${m.attack_recall.toFixed(3)}</td><td>${m.false_positive_rate?.toFixed(3) ?? "N/A"}</td><td>${m.batch_latency_p95_ms.toFixed(2)}</td><td>${Math.round(m.rows_per_second)}</td></tr>`,
        )
        .join("") +
      "</tbody></table>";
    renderModelDetails(meta);
    notice("");
    return u;
  } catch (e) {
    notice(e.message);
  }
}
function renderModelDetails(meta) {
  renderMatrix();
  const first = Object.values(meta.models)[0];
  $("classTable").innerHTML =
    "<table><thead><tr><th>CLASS</th><th>SUPPORT</th><th>RF F1 / RECALL</th><th>XGB F1 / RECALL</th><th>EXTRA TREES F1 / RECALL</th></tr></thead><tbody>" +
    first.class_order
      .map(
        (label) =>
          "<tr><td>" +
          esc(label) +
          "</td><td>" +
          first.classification_report[label].support +
          "</td>" +
          Object.values(meta.models)
            .map(
              (m) =>
                "<td>" +
                m.classification_report[label]["f1-score"].toFixed(3) +
                " / " +
                m.classification_report[label].recall.toFixed(3) +
                "</td>",
            )
            .join("") +
          "</tr>",
      )
      .join("") +
    "</tbody></table>";
  bars(
    "featureBars",
    Object.fromEntries(
      (meta.global_feature_importances?.random_forest || [])
        .slice(0, 8)
        .map((x) => [x.feature, Number(x.importance.toFixed(4))]),
    ),
  );
}
async function sources() {
  const list = await json("/sources");
  list.sort((a, b) =>
    a.name === "cicids_demo_real_ips.csv"
      ? -1
      : b.name === "cicids_demo_real_ips.csv"
        ? 1
        : a.name.localeCompare(b.name),
  );
  $("source").innerHTML = list
    .map(
      (s) =>
        `<option value="${esc(s.name)}">${esc(s.name)} · ${(s.bytes / 1024).toFixed(1)} KB</option>`,
    )
    .join("");
}
$("upload").onchange = async () => {
  try {
    const f = $("upload").files[0];
    if (!f) return;
    const data = new FormData();
    data.append("file", f);
    notice("Uploading…");
    const b = await json("/upload", { method: "POST", body: data });
    await sources();
    $("source").value = b.source;
    notice("Uploaded " + b.original_filename + ". Ready to scan.");
  } catch (e) {
    notice(e.message);
  }
};
function busy(b) {
  running = b;
  $("scan").disabled = b || role === "Viewer";
  $("stop").disabled = !b;
  if (b) $("state").textContent = "SCANNING";
  else if ($("state").textContent === "SCANNING")
    $("state").textContent = "IDLE";
}
$("scan").onclick = async () => {
  const ownGeneration = ++generation;
  busy(true);
  $("stop").disabled = true;
  try {
    notice("");
    rows = [];
    drawScanVisuals({}, {});
    drawTimeline({}, {});
    $("rate").textContent = "—";
    lastId = 0;
    draw();
    $("summaryPanel").hidden = true;
    ["read", "scored", "alerts"].forEach((id) => ($(id).textContent = "0"));
    const transport = $("transport").value;
    const b = await json("/scans", {
      method: "POST",
      body: JSON.stringify({ source: $("source").value, transport }),
    });
    scanId = b.scan_id;
    busy(true);
    if (transport === "polling") await poll();
    else await stream();
  } catch (e) {
    if (e.name !== "AbortError") notice(e.message + " — No automatic restart.");
    if (running && ownGeneration === generation) {
      try {
        await json("/scans/" + scanId + "/stop", { method: "POST" });
      } catch {}
    }
  } finally {
    if (ownGeneration === generation) busy(false);
  }
};
async function stream() {
  const ownGeneration = generation,
    ownScan = scanId;
  controller = new AbortController();
  const response = await api("/scans/" + ownScan + "/events", {
    signal: controller.signal,
  });
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let at;
    while ((at = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, at);
      buffer = buffer.slice(at + 2);
      const data = block
        .split("\n")
        .filter((x) => x.startsWith("data:"))
        .map((x) => x.slice(5).trimStart())
        .join("\n");
      if (data && ownGeneration === generation) handle(JSON.parse(data));
    }
  }
  if (running && ownGeneration === generation)
    throw Error("Stream ended before completion");
}
async function poll() {
  const ownGeneration = generation,
    ownScan = scanId;
  while (running && ownGeneration === generation) {
    const b = await json("/scans/" + ownScan + "/poll");
    if (ownGeneration !== generation) break;
    b.events.forEach(handle);
    if (b.finished) {
      if (running) {
        const r = await json("/scans/" + ownScan + "/report");
        if (ownGeneration === generation && r.scan.summary)
          handle({ id: lastId + 1, type: "done", summary: r.scan.summary });
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
async function stop() {
  generation++;
  if (scanId)
    try {
      await json("/scans/" + scanId + "/stop", { method: "POST" });
      notice(
        "Stop requested. Current chunk may finish; final report is in Scan history.",
      );
    } catch (e) {
      notice(e.message);
    }
  controller?.abort();
  busy(false);
}
$("stop").onclick = stop;
function bars(target, data) {
  const max = Math.max(1, ...Object.values(data));
  $(target).innerHTML =
    Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([k, v]) =>
          `<div class="barrow"><span>${esc(k)}</span><div class="bar"><i style="width:${(v / max) * 100}%"></i></div><b>${v}</b></div>`,
      )
      .join("") || "No results.";
}
function handle(m) {
  if (m.id <= lastId) return;
  if (lastId && m.id > lastId + 1)
    notice(
      "Display messages dropped; full saved results remain in the export.",
    );
  lastId = m.id;
  if (m.type === "start")
    $("progress").textContent =
      "Scan " +
      m.scan_id.slice(0, 8) +
      " · " +
      m.transport.toUpperCase() +
      " · " +
      m.chunk_size +
      " rows/chunk";
  if (m.type === "error")
    notice((m.recoverable ? "Chunk skipped: " : "Scan failed: ") + m.message);
  if (m.type === "chunk") {
    if (m.rows_per_second) $("rate").textContent = m.rows_per_second;
    bars("topSources", m.top_sources || {});
    bars("protocolBars", m.protocols || {});
    drawTimeline(m.traffic_timeline, m.attack_timeline || {});
    rows = rows.concat(m.rows).slice(-200);
    $("read").textContent = m.processed;
    $("scored").textContent = m.scored;
    $("alerts").textContent = m.alerts;
    drawScanVisuals(m.risk_distribution, m.attack_types);
    bars("riskbars", m.risk_distribution);
    bars("types", m.attack_types);
    draw();
  }
  if (m.type === "done") {
    busy(false);
    $("state").textContent = m.summary.status.toUpperCase();
    $("read").textContent = m.summary.rows_read;
    $("scored").textContent = m.summary.scored;
    $("alerts").textContent = m.summary.alerts;
    $("rate").textContent = m.summary.rows_per_second;
    drawScanVisuals(m.summary.risk_distribution, m.summary.attack_types);
    bars("riskbars", m.summary.risk_distribution);
    bars("types", m.summary.attack_types);
    bars("topSources", m.summary.top_sources || {});
    bars("protocolBars", m.summary.protocols || {});
    drawTimeline(m.summary.traffic_timeline, m.summary.attack_timeline || {});
    $("summary").textContent = JSON.stringify(m.summary, null, 2);
    $("summaryPanel").hidden = false;
    $("progress").textContent =
      m.summary.status +
      " · " +
      m.summary.invalid +
      " invalid rows · " +
      m.summary.skipped_rows +
      " skipped rows.";
  }
}
function draw() {
  const f = $("filter").value;
  const list = rows
    .filter(
      (r) =>
        f === "all" ||
        (f === "review" && r.needs_review) ||
        (f === "attack" && r.status === "scored" && r.consensus !== "BENIGN") ||
        (f === "invalid" && r.status === "invalid"),
    )
    .slice()
    .reverse();
  $("flows").innerHTML =
    list
      .map(
        (r) =>
          `<tr><td><b>#${r.row_number}</b><small>${esc(r.src_ip.value || "Unavailable")} → ${esc(r.dst_ip.value || "Unavailable")}</small><small>IP ${esc(r.src_ip.status)} / ${esc(r.dst_ip.status)} · Protocol ${esc(r.protocol || "Unavailable")}</small>${r.src_ip.status === "valid" ? `<button class="link" data-investigate-ip="${esc(r.src_ip.value)}">Investigate source IP</button>` : ""}</td><td>${
            r.status === "invalid"
              ? esc(r.error)
              : Object.entries(r.models)
                  .map(
                    ([n, m]) =>
                      `<div>${esc(n)}: ${esc(m.predicted_class)}<small>${(m.confidence * 100).toFixed(1)}% confidence · ${m.risk_score}/100 risk</small></div>`,
                  )
                  .join("")
          }</td><td class="${esc((r.risk_label || "").toLowerCase())}">${r.status === "scored" ? `${r.risk_label} · ${r.risk_score}/100` : "Excluded"}<small>${r.needs_review ? "REVIEW REQUIRED" : ""}</small></td><td>${r.status === "scored" ? `<small>${r.models_agree ? "Models agree" : "Models disagree"}<br>${r.anomaly ? "Anomaly flag" : "No anomaly flag"}</small>` : ""}<button class="link" data-row="${r.row_number}">Explain</button></td></tr>`,
      )
      .join("") || '<tr><td colspan="4">No matching recent rows.</td></tr>';
  $("flows")
    .querySelectorAll("[data-row]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          detail(rows.find((r) => r.row_number === +b.dataset.row))),
    );
}
$("filter").onchange = draw;
async function incidents() {
  const list = await json("/incidents");
  $("incidentList").innerHTML =
    list
      .map(
        (r) =>
          `<div class="incident"><b>#${r.id} · ${esc(r.label)} · ${r.risk}/100</b><small> · ${r.occurrences || 1} related review flows · ${esc(r.src_ip || "Unavailable")} → ${esc(r.dst_ip || "Unavailable")} · scan ${esc(r.scan_id.slice(0, 8))}, first row ${r.row_number}</small><div class="controls"><button data-case="${r.id}">Investigate / PDF</button>${r.src_ip && r.src_ip !== "Unavailable" ? `<button data-investigate-ip="${esc(r.src_ip)}">Investigate source IP</button>` : ""}<select id="status${r.id}">${["Open", "Investigating", "Resolved", "False Positive"].map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select><input id="note${r.id}" value="${esc(r.note)}" placeholder="Investigation note" maxlength="2000"><button data-incident="${r.id}" ${role === "Viewer" ? "disabled" : ""}>Save</button></div></div>`,
      )
      .join("") || "<p>No incidents.</p>";
  $("incidentList").querySelectorAll("[data-case]").forEach(b => b.onclick = () => openCase(b.dataset.case).catch(e => notice(e.message)));
  $("incidentList")
    .querySelectorAll("[data-incident]")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            const id = b.dataset.incident;
            await json("/incidents/" + id, {
              method: "PATCH",
              body: JSON.stringify({
                status: $("status" + id).value,
                note: $("note" + id).value,
              }),
            });
            notice("Incident updated.");
          } catch (e) {
            notice(e.message);
          }
        }),
    );
}
async function download(id) {
  try {
    const r = await api("/scans/" + id + "/export"),
      url = URL.createObjectURL(await r.blob()),
      a = document.createElement("a");
    a.href = url;
    a.download = id + ".ndjson";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    notice(e.message);
  }
}
async function history() {
  const list = await json("/scans");
  $("historyList").innerHTML =
    list
      .map(
        (r) =>
          `<div class="incident"><b>${esc(r.source)}</b> · ${esc(r.status)} <small>${esc(r.created)}</small> <button data-report="${esc(r.id)}">Report</button> <button data-export="${esc(r.id)}">Export</button></div>`,
      )
      .join("") || "<p>No scans.</p>";
  $("historyList")
    .querySelectorAll("[data-report]")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            detail(await json("/scans/" + b.dataset.report + "/report"));
          } catch (e) {
            notice(e.message);
          }
        }),
    );
  $("historyList")
    .querySelectorAll("[data-export]")
    .forEach((b) => (b.onclick = () => download(b.dataset.export)));
}
async function team() {
  const list = await json("/team");
  $("teamList").innerHTML = list
    .map(
      (r) =>
        `<div class="incident">${esc(r.username)} <select id="role${r.id}">${["Admin", "Analyst", "Viewer"].map((s) => `<option ${s === r.role ? "selected" : ""}>${s}</option>`).join("")}</select> <button data-user="${esc(r.username)}" data-id="${r.id}">Update role</button></div>`,
    )
    .join("");
  $("teamList")
    .querySelectorAll("[data-user]")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await json("/team/" + encodeURIComponent(b.dataset.user), {
              method: "PATCH",
              body: JSON.stringify({ role: $("role" + b.dataset.id).value }),
            });
            await team();
          } catch (e) {
            notice(e.message);
          }
        }),
    );
}
$("export").onclick = () => download(scanId);
$("report").onclick = async () => {
  try {
    const r = await api("/scans/" + scanId + "/report-html");
    const url = URL.createObjectURL(
      new Blob([await r.text()], { type: "text/html" }),
    );
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    notice(e.message);
  }
};
$("refreshIncidents").onclick = () =>
  incidents().catch((e) => notice(e.message));
$("refreshHistory").onclick = () => history().catch((e) => notice(e.message));
document.querySelectorAll("[data-page]").forEach(
  (b) =>
    (b.onclick = async () => {
      if (!token) return;
      document
        .querySelectorAll(".page")
        .forEach((p) => (p.hidden = p.id !== b.dataset.page));
      document
        .querySelectorAll("[data-page]")
        .forEach((n) => n.classList.toggle("selected", n === b));
      try {
        if (b.dataset.page === "overview") await loadOverview();
        if (b.dataset.page === "incidents") await incidents();
        if (b.dataset.page === "history") await history();
        if (b.dataset.page === "team") await team();
      } catch (e) {
        notice(e.message);
      }
    }),
);
window.addEventListener("pagehide", () => {
  controller?.abort();
  if (running && scanId)
    fetch("/api/scans/" + scanId + "/stop", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      keepalive: true,
    }).catch(() => {});
});
if (token) boot();

function renderMatrix() {
  if (!activeMetadata) return;
  const m = activeMetadata.models[$("matrixModel").value],
    max = Math.max(1, ...m.confusion_matrix.flat());
  $("matrix").innerHTML =
    "<table><thead><tr><th>TRUE / PREDICTED</th>" +
    m.class_order
      .map((x) => '<th title="' + esc(x) + '">' + esc(x) + "</th>")
      .join("") +
    "</tr></thead><tbody>" +
    m.confusion_matrix
      .map(
        (row, i) =>
          "<tr><th>" +
          esc(m.class_order[i]) +
          "</th>" +
          row
            .map(
              (v, j) =>
                '<td style="background:rgba(' +
                (i === j ? "64,220,199" : "255,109,133") +
                "," +
                (v ? Math.max(0.12, Math.log1p(v) / Math.log1p(max)) : 0.02) +
                ')">' +
                v +
                "</td>",
            )
            .join("") +
          "</tr>",
      )
      .join("") +
    "</tbody></table>";
}
$("matrixModel").onchange = renderMatrix;

// Investigation add-ons reuse the existing theme classes and authenticated API.
let selectedCase = null;
function simpleTable(headers, entries) {
  return "<table><thead><tr>" + headers.map(x=>"<th>"+esc(x)+"</th>").join("") +
    "</tr></thead><tbody>" + entries.map(row=>"<tr>"+row.map(x=>"<td>"+esc(x)+"</td>").join("")+"</tr>").join("") + "</tbody></table>";
}
async function saveAddon(path, filename) {
  const response = await api(path), blob = await response.blob();
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function loadOverview() {
  const data=await json("/overview");
  const t=data.totals;
  $("overviewData").innerHTML="<p>"+esc(data.scope)+"</p><div class='stats'>"+
    [["Scans",t.scans],["Flows scored",t.scored],["Review flow alerts",t.review_flows],["Open / investigating groups",t.open_incidents],["Critical groups · all statuses",t.critical_groups],["Rows read",t.rows_read]].map(([k,v])=>"<article><small>"+esc(k)+"</small><strong>"+esc(v)+"</strong></article>").join("")+"</div><div class='panel'><h3>Predicted types across saved summaries</h3>"+simpleTable(["Class","Records"],Object.entries(data.traffic_types))+"</div><div class='twocol'><div class='panel'><h3>Historical risk distribution</h3><small>SAVED SCAN SUMMARIES · SCORED FLOWS</small>"+riskDonut(data.risk_distribution||{})+"</div><div class='panel'><h3>Historical predicted attacks</h3><small>SAVED SCAN SUMMARIES · BENIGN EXCLUDED</small>"+attackChart(data.traffic_types||{})+"</div></div>";
}
async function openCase(id) {
  const data=await json("/incidents/"+id+"/case"); selectedCase=id;
  document.querySelectorAll(".page").forEach(p=>p.hidden=p.id!=="caseConsole");
  document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("selected",b.dataset.page==="incidents"));
  const i=data.incident;
  $("caseScope").textContent=data.coverage;
  $("caseSummary").innerHTML=simpleTable(["Field","Value"],[["Case",i.id],["Prediction",i.label],["Priority",i.risk+"/100"],["Status",i.status],["Source",i.src_ip],["Destination",i.dst_ip],["Occurrences",i.occurrences],["Notes",i.note]]);
  $("baselineScope").textContent=data.baseline_scope;
  $("baselineTable").innerHTML=simpleTable(["Feature","Observed","Earlier mean","Samples","Deviation"],data.baseline.map(r=>[r.feature,r.observed??"—",r.reference_mean??"—",r.samples,r.status!=="available"?"Insufficient history":r.z_score===null?(r.constant_reference_deviation?"Changed from constant reference":"Constant reference"):r.z_score.toFixed(3)+" standard deviations"]));
  $("localExplanation").textContent="Not calculated. TreeSHAP explains XGBoost only; it does not explain consensus priority.";
  $("caseFlows").innerHTML=simpleTable(["Row","Capture time","Class","Priority","Review reasons"],data.flows.map(r=>[r.row_number,r.timestamp,r.consensus,r.risk_score,r.review_reasons.join("; ")]));
  $("caseSteps").innerHTML="<ol>"+data.next_steps.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ol>";
}
$("refreshOverview").onclick=()=>loadOverview().catch(e=>notice(e.message));
$("exportIncidents").onclick=()=>saveAddon("/incidents-export.xlsx","tracevigil-incidents-latest-10000.xlsx").catch(e=>notice(e.message));
$("showReportHistory").onclick=()=>document.querySelector('[data-page="history"]').click();
$("casePdf").onclick=()=>selectedCase&&saveAddon("/incidents/"+selectedCase+"/case.pdf","tracevigil-case-"+selectedCase+".pdf").catch(e=>notice(e.message));
$("caseExplain").onclick=async()=>{
  if(!selectedCase)return;
  const requested=selectedCase;$("caseExplain").disabled=true;
  $("caseExplain").classList.add("is-loading");$("caseExplain").setAttribute("aria-busy","true");
  $("localExplanation").textContent="Calculating XGBoost TreeSHAP contributions…";
  $("localExplanation").scrollIntoView({block:"nearest",behavior:"auto"});
  try {
    const data=await json("/incidents/"+requested+"/explanation");if(selectedCase!==requested)return;
    $("localExplanation").innerHTML="<p>"+esc(data.scope)+"</p><p>Class: "+esc(data.class)+" · Units: "+esc(data.units)+"</p><p>Base margin "+esc(data.base_value)+" + contributions = "+esc(data.margin)+" · additive check: "+esc(data.sum_check)+"</p>"+simpleTable(["Feature","Observed","Signed contribution"],data.features.map(r=>[r.feature,r.observed,r.contribution.toFixed(5)]));
  }catch(e){$("localExplanation").textContent="Explanation unavailable: "+e.message;notice(e.message);}
  finally{$("caseExplain").disabled=false;$("caseExplain").classList.remove("is-loading");$("caseExplain").removeAttribute("aria-busy");}
};

// Dependency-free charts: SVG is responsive, legends include exact counts.
function riskDonut(distribution) {
  const bands=[['Low','#72ff9a'],['Medium','#ffe082'],['High','#ffad66'],['Critical','#ff718d']];
  const values=bands.map(([label])=>Math.max(0,Number(distribution[label])||0));
  const total=values.reduce((a,b)=>a+b,0);
  if(!total)return '<p class="chart-empty">No scored flows yet. No risk proportions to display.</p>';
  let offset=0;
  const segments=bands.map(([label,color],i)=>{
    const percent=values[i]/total*100;
    const arc=percent?'<circle cx="70" cy="70" r="52" fill="none" stroke="'+color+'" stroke-width="18" pathLength="100" stroke-dasharray="'+percent+' '+(100-percent)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 70 70)"/>':'';
    offset+=percent;return arc;
  }).join('');
  return '<div class="risk-chart"><svg viewBox="0 0 140 140" role="img" aria-label="Risk proportions; exact counts follow in the legend"><circle cx="70" cy="70" r="52" fill="none" stroke="#17291e" stroke-width="18"/>'+segments+'<text x="70" y="68" text-anchor="middle" fill="#e5f5eb" font-size="15">'+esc(total.toLocaleString())+'</text><text x="70" y="85" text-anchor="middle" fill="#a0b6a8" font-size="9">SCORED FLOWS</text></svg><ul class="risk-legend">'+bands.map(([label,color],i)=>'<li><span class="chart-dot" style="background:'+color+'"></span><span>'+label+'</span><b>'+values[i].toLocaleString()+'</b><small>'+((values[i]/total)*100).toFixed(1)+'%</small></li>').join('')+'</ul></div>';
}
function attackChart(distribution) {
  const sorted=Object.entries(distribution).filter(([k,v])=>k!=='BENIGN'&&Number(v)>0).sort((a,b)=>b[1]-a[1]);
  if(!sorted.length)return '<p class="chart-empty">No non-BENIGN predictions in this scope.</p>';
  const shown=sorted.slice(0,6).map(([k,v])=>[k,Number(v)]),other=sorted.slice(6).reduce((s,[k,v])=>s+Number(v),0);
  if(other)shown.push(['Other attack classes',other]);
  const max=Math.max(...shown.map(x=>x[1]));
  return '<div class="attack-chart">'+shown.map(([label,value])=>'<div class="attack-chart-row"><span>'+esc(label)+'</span><div class="bar"><i style="width:'+value/max*100+'%"></i></div><b>'+value.toLocaleString()+'</b></div>').join('')+'</div>';
}
function drawScanVisuals(risks,types) {
  $("scanRiskDonut").innerHTML=riskDonut(risks||{});
  $("scanAttackChart").innerHTML=attackChart(types||{});
}
drawScanVisuals({},{});
