"use strict";
(() => {
  let before = 0, nextBefore = null, eventRows = [], loading = false;
  let eventGeneration = 0, ipGeneration = 0, selected = null, currentUser = null;
  let refreshRunning = false, refreshQueued = false;
  let selectedScope = "", currentNoteVersion = 0;
  const value = id => $(id).value.trim();
  const utc = text => {
    if (!text) return "Unknown";
    const d = new Date(text);
    return Number.isNaN(d.getTime()) ? String(text) : d.toISOString().replace("T", " ").replace(".000Z", "Z");
  };
  const cards = entries => entries.map(([label, count]) =>
    "<article><small>" + esc(label) + "</small><strong>" + esc(count ?? "—") + "</strong></article>").join("");
  const ipButton = ip => "<button class='security-ip-button' data-investigate-ip='" + esc(ip) + "'>" + esc(ip) + "</button>";
  function params() {
    const p = new URLSearchParams();
    for (const [key, id] of [["q", "securitySearch"], ["action", "securityAction"],
      ["outcome", "securityOutcome"], ["severity", "securitySeverity"]]) {
      if (value(id)) p.set(key, value(id));
    }
    for (const [key, id] of [["since", "securitySince"], ["until", "securityUntil"]]) {
      if (value(id)) p.set(key, new Date(value(id)).toISOString());
    }
    if (p.has("since") && p.has("until") && p.get("since") > p.get("until"))
      throw Error("The start time must be before the end time.");
    return p;
  }
  function eventsTable(items, includeDetails = true) {
    if (!items.length) return '<tr><td colspan="7">No recorded events in this scope and filter.</td></tr>';
    return items.map((r, i) => "<tr><td>" + esc(utc(r.created)) + "</td><td>" + esc(r.actor) +
      "</td><td>" + esc(r.action) + "<small>" + esc(r.category) + "</small></td><td>" + esc(r.resource || "—") +
      "</td><td>" + (r.client_ip ? ipButton(r.client_ip) : "Unknown / background event") +
      "</td><td><span class='security-badge " + esc(r.outcome.toLowerCase()) + "'>" + esc(r.outcome) +
      "</span><small>" + esc(r.severity) + (r.http_status ? " · HTTP " + esc(r.http_status) : "") +
      "</small></td><td>" + (includeDetails ? "<button data-security-detail='" + i + "'>Details</button>" : esc(r.request_id || "Unknown")) + "</td></tr>").join("");
  }
  async function loadEvents() {
    const generation = ++eventGeneration, pageCursor = before;
    loading = true;
    try {
      const query = params();
      if (pageCursor) query.set("before", pageCursor);
      const data = await json("/security/events?" + query);
      if (generation !== eventGeneration) return;
      eventRows = data.items;
      nextBefore = data.next_before;
      $("securityScope").textContent = data.scope;
      $("securityTimeBasis").textContent = data.timestamp_basis;
      $("securityStats").innerHTML = cards([["Matching events", data.totals.total],
        ["Denied / failed", data.totals.rejected], ["Authentication", data.totals.authentication], ["Warnings", data.totals.warnings]]);
      const chosen = value("securityAction");
      $("securityAction").innerHTML = '<option value="">All actions</option>' +
        data.actions.map(action => "<option value='" + esc(action) + "'>" + esc(action) + "</option>").join("");
      $("securityAction").value = chosen;
      $("securityEvents").innerHTML = eventsTable(eventRows);
      $("securityOlder").disabled = !nextBefore;
      $("securityNewest").disabled = !pageCursor;
      $("securityUpdated").textContent = "Loaded " + data.items.length + " events · " +
        (pageCursor ? "Older page; automatic refresh paused" : "Newest page") + " · updated " + new Date(data.generated_at).toLocaleString();
    } finally {
      if (generation === eventGeneration) loading = false;
    }
  }
  async function refreshEvents() {
    if (refreshRunning) { refreshQueued = true; return; }
    refreshRunning = true;
    try {
      do {
        refreshQueued = false;
        await visibleRefresh("refreshSecurity", loadEvents);
      } while (refreshQueued);
    } finally { refreshRunning = false; }
  }
  async function openSecurity() {
    currentUser = await json("/me");
    const scans = await json("/scans");
    const previous = value("ipScanScope");
    $("ipScanScope").innerHTML = '<option value="">All permitted scans</option>' + scans.map(s =>
      "<option value='" + esc(s.id) + "'>" + esc(s.source) + " · " + esc(s.id.slice(0, 8)) + "</option>").join("");
    if (scans.some(s => s.id === previous)) $("ipScanScope").value = previous;
    $("ipNoteSave").disabled = role === "Viewer";
    $("ipNote").disabled = role === "Viewer";
    $("ipNoteStatus").disabled = role === "Viewer";
    await refreshEvents();
  }
  function renderIP(data) {
    selected = data;
    $("ipInvestigationResult").hidden = false;
    $("ipInvestigationTitle").textContent = data.address.ip + " · IPv" + data.address.version + " · " + data.address.kind;
    const coverage = data.coverage, t = data.totals;
    $("ipCoverage").textContent = coverage.scope + ". Inspected " + coverage.inspected_flows + " of " +
      coverage.matching_saved_flows + " matching saved flows" + (coverage.truncated ? " — WINDOW TRUNCATED." : ".") +
      " " + coverage.basis;
    $("ipSummary").innerHTML = cards([["Scored flows", t.scored], ["Predicted attack flows", t.predicted_attacks],
      ["Review flags", t.review_flows], ["Maximum priority / 100", t.max_risk], ["Distinct peers", t.peers], ["Scans in window", t.scans]]);
    $("ipFacts").innerHTML = simpleTable(["Evidence", "Value"], [
      ["External reputation", data.reputation.status + ". " + data.reputation.reason],
      ["Address interpretation", data.address.interpretation], ["Generated UTC", utc(data.generated_at)],
      ["First capture time in window", data.capture_time.first || "Unavailable"],
      ["Last capture time in window", data.capture_time.last || "Unavailable"],
      ["Latest recorded flow UTC", utc(data.capture_time.latest_recorded_at_utc)],
      ["Time meaning", data.capture_time.basis], ["Rows without usable capture time", data.capture_time.unavailable_rows],
      ["Source / destination role flows", t.source_role_flows + " / " + t.destination_role_flows + " (a self-flow counts in both roles)"],
      ["Invalid feature rows", t.invalid], ["Mean priority / 100", t.mean_risk ?? "Unavailable"],
      ["Model disagreement / anomaly flags", t.disagreements + " / " + t.anomalies],
      ["Distinct outbound destination ports", t.outgoing_destination_ports]]);
    $("ipFindings").innerHTML = "<ul>" + data.findings.map(f => "<li>" + esc(f) + "</li>").join("") +
      "</ul><ol>" + data.next_steps.map(f => "<li>" + esc(f) + "</li>").join("") + "</ol>";
    $("ipClasses").innerHTML = attackChart(data.classes) + simpleTable(["Class", "Flows"], Object.entries(data.classes));
    $("ipRisks").innerHTML = riskDonut(data.risks);
    $("ipPeers").innerHTML = "<table><thead><tr><th>Peer address</th><th>Flows</th></tr></thead><tbody>" +
      data.peers.map(([ip, count]) => "<tr><td>" + ipButton(ip) + "</td><td>" + esc(count) + "</td></tr>").join("") + "</tbody></table>";
    $("ipPorts").innerHTML = simpleTable(["Remote port", "Flows"], data.remote_ports);
    $("ipProtocols").innerHTML = simpleTable(["Protocol", "Flows"], Object.entries(data.protocols));
    $("ipCaptureHours").innerHTML = simpleTable(["CSV capture hour", "Flows"], Object.entries(data.capture_hours));
    $("ipFlows").innerHTML = "<table><thead><tr><th>Scan / row</th><th>Capture time</th><th>Recorded UTC</th><th>Endpoints</th><th>Prediction / priority</th><th>Review evidence</th></tr></thead><tbody>" +
      data.flows.map(r => "<tr><td>" + esc(r.scan_id.slice(0, 8)) + " / #" + esc(r.row_number) +
        "</td><td>" + esc(r.timestamp || "Unavailable") + "</td><td>" + esc(utc(r.recorded_at)) +
        "</td><td>" + esc(r.src_ip.value || "Unavailable") + ":" + esc(r.src_port || "?") + " → " +
        esc(r.dst_ip.value || "Unavailable") + ":" + esc(r.dst_port || "?") +
        "</td><td>" + esc(r.consensus || "Invalid features") + "<small>" + esc(r.risk_score ?? "—") +
        "/100</small></td><td>" + esc((r.review_reasons || []).join("; ") || "No review flag") + "</td></tr>").join("") + "</tbody></table>";
    $("ipIncidents").innerHTML = data.incidents.map(i => "<div class='incident'><b>#" + esc(i.id) + " · " +
      esc(i.label) + " · " + esc(i.status) + "</b> · " + esc(i.risk) + "/100 · " + esc(i.occurrences) +
      " review flows <button data-security-case='" + esc(i.id) + "'>Open incident / TreeSHAP / PDF</button></div>").join("") || "<p>No visible incident groups for this IP.</p>";
    if (coverage.incident_list_truncated) $("ipIncidents").insertAdjacentHTML("beforeend", "<p>Only the latest 200 groups are shown.</p>");
    $("ipApplicationEvents").innerHTML = "<table><thead><tr><th>Recorded UTC</th><th>Actor</th><th>Action</th><th>Resource</th><th>Request peer IP</th><th>Outcome</th><th>Request ID</th></tr></thead><tbody>" + eventsTable(data.application_events, false) + "</tbody></table>";
    const own = data.cases.find(c => c.owner === currentUser?.username);
    currentNoteVersion = own?.version || 0;
    $("ipNoteStatus").value = own?.status || "Open";
    $("ipNote").value = own?.note || "";
    $("ipNoteSaved").textContent = role === "Viewer" ? "Read-only role" : own ? "Saved " + utc(own.updated) : "No note saved for your account.";
    $("ipCaseHistory").innerHTML = simpleTable(["Analyst", "Disposition", "Note", "Updated UTC"], data.cases.map(c => [c.owner, c.status, c.note, utc(c.updated)]));
  }
  async function investigate() {
    const generation = ++ipGeneration;
    notice("");
    const ip = value("investigateIp"), scope = value("ipScanScope");
    $("ipInvestigationResult").hidden = true;
    selected = null;
    const p = new URLSearchParams({ ip });
    if (scope) p.set("scan_id", scope);
    const data = await json("/security/ip?" + p);
    if (generation !== ipGeneration) return;
    selectedScope = scope;
    renderIP(data);
    $("ipInvestigationTitle").scrollIntoView({ block: "start", behavior: "smooth" });
  }
  $("ipInvestigationForm").onsubmit = e => {
    e.preventDefault();
    actionBusy($("investigateIpButton"), investigate, "Investigating…").catch(e => notice(e.message));
  };
  window.traceInvestigateIP = async ip => {
    document.querySelector('[data-page="securityOps"]').click();
    if (!currentUser) currentUser = await json("/me");
    $("investigateIp").value = ip;
    $("ipScanScope").value = "";
    while ($("investigateIpButton").disabled) await new Promise(resolve => setTimeout(resolve, 40));
    await actionBusy($("investigateIpButton"), investigate, "Investigating…");
  };
  document.addEventListener("click", e => {
    const ip = e.target.closest("[data-investigate-ip]");
    if (ip) window.traceInvestigateIP(ip.dataset.investigateIp).catch(e => notice(e.message));
    const event = e.target.closest("[data-security-detail]");
    if (event) detail(eventRows[Number(event.dataset.securityDetail)]);
    const incident = e.target.closest("[data-security-case]");
    if (incident) openCase(incident.dataset.securityCase).catch(e => notice(e.message));
  });
  document.querySelector('[data-page="securityOps"]').addEventListener("click", () => {
    if (token) openSecurity().catch(e => notice(e.message));
  });
  $("securityFilterForm").onsubmit = e => {
    e.preventDefault(); before = 0;
    refreshEvents();
  };
  $("securityClear").onclick = () => {
    $("securityFilterForm").reset(); before = 0;
    refreshEvents();
  };
  $("refreshSecurity").onclick = () => refreshEvents();
  $("securityNewest").onclick = () => { before = 0; refreshEvents(); };
  $("securityOlder").onclick = () => { if (nextBefore) { before = nextBefore; refreshEvents(); } };
  $("securityExport").onclick = () => actionBusy($("securityExport"), async () => {
    const r = await api("/security/events/export?" + params());
    saveBlob(await r.blob(), "tracevigil-security-events.ndjson");
    notice("Exported " + r.headers.get("X-Export-Rows") + " of " + r.headers.get("X-Export-Total") +
      " matching events. SHA-256: " + r.headers.get("X-Content-SHA256"));
  }, "Exporting…").catch(e => notice(e.message));
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  $("ipExport").onclick = () => {
    if (!selected) return;
    const p = new URLSearchParams({ ip: selected.address.ip });
    if (selectedScope) p.set("scan_id", selectedScope);
    actionBusy($("ipExport"), async () => {
      const r = await api("/security/ip/export?" + p);
      saveBlob(await r.blob(), "tracevigil-ip-evidence.json");
      notice("IP evidence exported. SHA-256: " + r.headers.get("X-Content-SHA256"));
    }, "Exporting…").catch(e => notice(e.message));
  };
  $("ipPrint").onclick = () => {
    if (!selected) return;
    const details = [...$("ipInvestigationResult").querySelectorAll("details")];
    const states = details.map(element => element.open);
    details.forEach(element => { element.open = true; });
    document.body.classList.add("security-print");
    try { window.print(); } finally {
      document.body.classList.remove("security-print");
      details.forEach((element, index) => { element.open = states[index]; });
    }
  };
  $("ipNoteForm").onsubmit = e => {
    e.preventDefault(); if (!selected) return;
    const ip = selected.address.ip, profile = selected, version = currentNoteVersion;
    actionBusy($("ipNoteSave"), async () => {
      const note = await json("/security/ip/case", { method: "PUT", body: JSON.stringify({
        ip, status: value("ipNoteStatus"), note: $("ipNote").value, version }) });
      if (selected !== profile) return;
      currentNoteVersion = note.version;
      selected.cases = selected.cases.filter(c => c.owner !== note.owner).concat(note);
      $("ipNoteSaved").textContent = "Saved " + utc(note.updated);
      $("ipCaseHistory").innerHTML = simpleTable(["Analyst", "Disposition", "Note", "Updated UTC"], selected.cases.map(c => [c.owner, c.status, c.note, utc(c.updated)]));
    }, "Saving…").catch(e => notice(e.message));
  };
  const timer = setInterval(() => {
    if (!document.hidden && token && !$("workspace").hidden && !$("securityOps").hidden &&
        $("securityAuto").checked && !before && !loading && !refreshRunning) {
      refreshEvents();
    }
  }, 10000);
  window.addEventListener("pagehide", () => clearInterval(timer));
})();
