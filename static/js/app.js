let TOKEN=localStorage.getItem("ns_token")||"",USER=localStorage.getItem("ns_user")||"",ROLE=localStorage.getItem("ns_role")||"";
const COL={Low:"#22c55e",Medium:"#facc15",High:"#f97316",Critical:"#ef4444"}, LV=Object.keys(COL);
const $=id=>document.getElementById(id)||document.createElement("div"), fmt=n=>n.toLocaleString();
let es=null, S;
const reset=()=>S={total:0,normal:0,atk:0,sum:0,levels:{Low:0,Medium:0,High:0,Critical:0},classes:{},rows:[]};
Chart.defaults.color="#8ea0c4";Chart.defaults.borderColor="#14264d";Chart.defaults.animation=false;
const opt={responsive:true,maintainAspectRatio:false};const mk=(id,cfg)=>document.getElementById(id)?new Chart(document.getElementById(id),cfg):{data:cfg.data,update(){}};
const traffic=mk("cTraffic",{type:"line",data:{labels:[],datasets:[
 {label:"Normal",data:[],borderColor:"#22c55e",backgroundColor:"#22c55e22",fill:true,tension:.4,pointRadius:2},
 {label:"Attacks",data:[],borderColor:"#ef4444",backgroundColor:"#ef444422",fill:true,tension:.4,pointRadius:2}]},options:opt});
const donut=mk("cDonut",{type:"doughnut",data:{labels:LV,datasets:[{data:[0,0,0,0],backgroundColor:Object.values(COL),borderWidth:0}]},options:{...opt,cutout:"72%",plugins:{legend:{display:false}}}});
const bar=mk("cBar",{type:"bar",data:{labels:[],datasets:[{data:[],backgroundColor:"#3b82f6"}]},options:{...opt,plugins:{legend:{display:false}}}});
function draw(){
 $("kTotal").textContent=fmt(S.total);$("kNormal").textContent=fmt(S.normal);$("kAtk").textContent=fmt(S.atk);
 $("kCrit").textContent=fmt(S.levels.Critical);$("kAvg").textContent=S.total?(S.sum/S.total).toFixed(2):"0";$("dTot").textContent=fmt(S.total);
 donut.data.datasets[0].data=LV.map(l=>S.levels[l]);donut.update();
 $("legend").innerHTML=LV.map(l=>`<i class="dot" style="background:${COL[l]}"></i><span>${l}</span><span>${fmt(S.levels[l])}</span><span style="color:var(--mut)">${S.total?(S.levels[l]/S.total*100).toFixed(1):"0.0"}%</span>`).join("");
 const c=Object.entries(S.classes).sort((a,b)=>b[1]-a[1]);bar.data.labels=c.map(x=>x[0]);bar.data.datasets[0].data=c.map(x=>x[1]);bar.update();
 traffic.update();
 $("rows").innerHTML=S.rows.slice(0,200).map(r=>{const a=r.prediction!=="Normal";
  return `<tr><td>${tm(r.time)}</td><td style="color:${a?"#ef4444":"#22c55e"}">${a?"Attack":"Normal"}</td><td>${r.prediction}</td><td><span class="pill ${r.risk_label}">${r.risk_label}</span></td><td>${a?"Detected":"Normal"}</td></tr>`}).join("");
}
function onBatch(m){
 let nrm=m.classes.Normal||0;S.total+=m.n;S.normal+=nrm;S.atk+=m.n-nrm;S.sum+=m.score_sum;
 for(const [k,v] of Object.entries(m.levels))S.levels[k]+=v;
 for(const [k,v] of Object.entries(m.classes))if(k!=="Normal")S.classes[k]=(S.classes[k]||0)+v;else S.classes.Normal=(S.classes.Normal||0)+v;
 S.rows=[...m.rows,...S.rows].slice(0,200);   // the screen is a window, not a log
 const hr=pad(new Date().getHours())+":00",L=traffic.data.labels,D=traffic.data.datasets;
 if(L[L.length-1]!==hr){L.push(hr);D.forEach(d=>d.data.push(0));if(L.length>24){L.shift();D.forEach(d=>d.data.shift())}}
 D[0].data[L.length-1]+=nrm;D[1].data[L.length-1]+=m.n-nrm;
 draw();
}
let src=null,mode=null,reg=false;
async function api(p,b){const r=await fetch(p,{method:b?"POST":"GET",headers:{"Content-Type":"application/json",Authorization:"Bearer "+TOKEN},body:b&&JSON.stringify(b)});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(typeof j.detail==="string"?j.detail:"Check your input"),{status:r.status});return j}
function setBtns(){const l=mode==="live",c=mode==="scan",t=l?"● Live tracking on":c?"● Scanning file":"○ Stopped";
 for(const s of["","2"]){$("start"+s).disabled=l||c;$("stop"+s).disabled=!l;$("lstat"+s).textContent=t;$("lstat"+s).style.color=l||c?"var(--green)":""}
 $("btn").textContent=c?"Stop scan":"Scan file";$("btn").className=c?"stop":"alt";$("btn").disabled=l}
function stopSrc(){if(src){src.close();src=null}mode=null;setBtns()}
function openSrc(m){if(!TOKEN)return showModal();stopSrc();mode=m;
 src=new EventSource("/api/"+m+"?token="+encodeURIComponent(TOKEN));
 src.addEventListener("batch",e=>onBatch(JSON.parse(e.data)));
 src.addEventListener("done",stopSrc);
 src.addEventListener("scan_error",e=>{alert(JSON.parse(e.data).message);stopSrc()});
 src.onerror=()=>{if(mode==="scan"||src.readyState===2)stopSrc()};   // a scan never silently restarts
 setBtns()}
function renderAuth(){const a=$("auth"),b=document.createElement("button");a.replaceChildren();
 if(TOKEN){const s=document.createElement("b");s.textContent=USER;b.textContent="Logout";b.className="alt";b.onclick=logout;a.append(s,b)}
 else{b.textContent="Login";b.onclick=showModal;a.append(b)}}
function setReg(r){reg=r;$("mTitle").textContent=$("mGo").textContent=r?"Register":"Login";$("mSwitch").textContent=r?"Have an account? Login":"No account? Register";$("p").autocomplete=r?"new-password":"current-password"}
function showModal(){setReg(false);$("mErr").textContent="";$("modal").hidden=false;$("u").focus()}
$("mSwitch").onclick=()=>setReg(!reg);$("mClose").onclick=()=>$("modal").hidden=true;
$("mForm").onsubmit=async e=>{e.preventDefault();try{const j=await api(reg?"/api/register":"/api/login",{username:$("u").value,password:$("p").value});
 TOKEN=j.token;USER=j.user;setRole(j.role||"viewer");localStorage.setItem("ns_token",TOKEN);localStorage.setItem("ns_user",USER);$("modal").hidden=true;$("p").value="";renderAuth();if(page==="login"||page==="register")return location.href="/";init()}catch(x){$("mErr").textContent=x.message}};
function logout(){stopSrc();TOKEN=USER="";localStorage.removeItem("ns_token");localStorage.removeItem("ns_user");
 reset();traffic.data.labels=[];traffic.data.datasets.forEach(d=>d.data=[]);draw();renderAuth()}
async function refresh(){const j=await api("/api/stats?tz="+TZ);reset();S.total=j.total;S.normal=j.normal;S.atk=j.total-j.normal;S.sum=j.score_sum;
 Object.assign(S.levels,j.levels);S.classes=j.classes;S.rows=j.rows;traffic.data.labels=j.hourly.map(x=>x.h);
 traffic.data.datasets[0].data=j.hourly.map(x=>x.n);traffic.data.datasets[1].data=j.hourly.map(x=>x.a);draw()}
async function init(){if(!TOKEN)return;try{await refresh()}catch(e){return e.status===401?logout():0}}
async function startScan(){if(!TOKEN)return showModal();try{await refresh()}catch(e){return e.status===401?logout():0}openSrc("scan")}
$("start").onclick=()=>openSrc("live");$("stop").onclick=stopSrc;$("btn").onclick=()=>mode==="scan"?stopSrc():startScan();
$("up").onclick=()=>TOKEN?$("file").click():showModal();
$("file").onchange=async()=>{const f=$("file").files[0];if(!f)return;$("fstat").textContent="Analyzing "+f.name+"…";
 try{const r=await fetch("/api/upload?name="+encodeURIComponent(f.name),{method:"POST",headers:{Authorization:"Bearer "+TOKEN},body:f});
  const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401)logout();throw new Error(typeof j.detail==="string"?j.detail:"Upload failed")}
  await refresh();$("fstat").textContent=f.name+": "+j.rows.toLocaleString()+" rows, "+j.attacks.toLocaleString()+" attacks"}
 catch(e){$("fstat").textContent=e.message}$("file").value=""};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>"&#"+c.charCodeAt(0)+";"),pages=["home","live","alerts","risk","hist","models","inc","rep","admin","perf"],ts=t=>{const d=new Date(String(t).replace(" ","T").slice(0,19)+"Z");return isNaN(d)?String(t):d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds())},tm=t=>{const s=ts(t);return s.length>8?s.slice(11):s},pill=l=>`<span class="pill ${l}">${l}</span>`;
let page="home",badgeN=0,LV2,liveRows,RK=null,hPg=1,hInit=false;
const PATHS={"/":"home","/live":"live","/alerts":"alerts","/risk":"risk","/history":"hist","/detection":"detect","/models":"models","/incidents":"inc","/reports":"rep","/admin":"admin","/performance":"perf","/login":"login","/register":"register"};
function route(){page=PATHS[location.pathname]||"home";
 pages.forEach(p=>{const e=document.getElementById("p-"+p);if(e)e.hidden=p!==page});
 document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("on",a.getAttribute("href")===location.pathname));
 if((page==="login"||page==="register")&&TOKEN)return location.href="/";
 if(page==="register"&&!TOKEN){showModal();return setReg(true)}
 if(page!=="home"&&!TOKEN)return showModal();
 ({live:()=>{drawLive();loadLiveHist();loadIfaces()},alerts:loadAlerts,risk:loadRisk,hist:()=>{hPg=1;loadHist()},models:loadModels,inc:loadInc,rep:loadReport,admin:loadAdmin,perf:loadPerf})[page]?.()}
window.onhashchange=route;
// live page
function liveReset(){LV2={n:0,a:0,m:0,s:0};liveRows=[];drawLive()}
function drawLive(){$("lN").textContent=fmt(LV2.n);$("lA").textContent=fmt(LV2.a);$("lM").textContent=LV2.m;$("lV").textContent=LV2.n?(LV2.s/LV2.n).toFixed(1):"0";
 $("lrows").innerHTML=liveRows.map(r=>`<tr><td>${tm(r.time)}</td><td>${r.prediction}</td><td>${r.risk_score}</td><td>${pill(r.risk_label)}</td></tr>`).join("")}
const ob=onBatch;
onBatch=m=>{ob(m);if(mode!=="live")return;LV2.n+=m.n;LV2.a+=m.n-(m.classes.Normal||0);LV2.s+=m.score_sum;
 m.rows.forEach(r=>LV2.m=Math.max(LV2.m,r.risk_score));liveRows=[...m.rows,...liveRows].slice(0,100);if(page==="live")drawLive();
 const h=(m.levels.High||0)+(m.levels.Critical||0);if(h)setBadge(badgeN+h)};
["start","start2"].forEach(i=>$(i).onclick=async()=>{if(!TOKEN)return showModal();liveReset();
 try{await api("/api/live/start",liveBody())}catch(e){if(e.status===401)return logout();return alert(e.message)}openSrc("live");loadLiveHist()});
["stop","stop2"].forEach(i=>$(i).onclick=async()=>{stopSrc();try{await api("/api/live/stop",{})}catch(e){}loadLiveHist()});
async function loadLiveHist(){try{const j=await api("/api/live/history");
 $("lhist").innerHTML=j.rows.length?j.rows.map(r=>`<tr><td>${ts(r.started_at)}</td><td>${r.stopped_at?ts(r.stopped_at):"–"}</td><td>${esc(r.started_by)}</td><td>${esc(r.source||"demo")}${r.iface?" ("+esc(r.iface)+")":""}</td><td>${fmt(r.flows)}</td><td>${fmt(r.attacks)}</td><td>${fmt(r.alerts)}</td><td>${r.max_risk}</td><td>${esc(r.status)}</td></tr>`).join(""):'<tr><td colspan="9">No live sessions yet</td></tr>'}catch(e){}}
// alerts page + nav badge
function setBadge(n){badgeN=n;$("badge").textContent=n>99?"99+":n;$("badge").hidden=!n}
async function loadBadge(){try{setBadge((await api("/api/alerts/count")).open)}catch(e){}}
async function loadAlerts(){try{const j=await api("/api/alerts?level="+$("aLvl").value+"&status="+$("aSt").value);
 $("arows").innerHTML=j.rows.length?j.rows.map(r=>`<tr><td>${ts(r.ts)}</td><td>${r.prediction}</td><td>${(r.confidence*100).toFixed(1)}%</td><td>${r.risk_score}</td><td>${pill(r.risk_label)}</td><td><button class="alt" data-inc="${r.id}">Incident</button> ${r.ack?"Acknowledged":`<button class="alt" data-id="${r.id}">Acknowledge</button>`}</td></tr>`).join(""):'<tr><td colspan="6">No alerts</td></tr>'}
 catch(e){if(e.status===401)logout()}}
$("aLvl").onchange=$("aSt").onchange=loadAlerts;
$("arows").onclick=async e=>{const d=e.target.dataset;try{
 if(d.id)await api("/api/alerts/ack",{ids:[+d.id]});
 else if(d.inc){const j=await api("/api/incidents",{alert_id:+d.inc});alert("Incident #"+j.id+" created. Open the Incidents page to work on it.")}
 else return}catch(x){alert(x.message)}loadAlerts();loadBadge()};
$("aAll").onclick=async()=>{await api("/api/alerts/ack",{all:true});loadAlerts();loadBadge()};
// risk scoring page
async function loadRisk(){try{RK=await api("/api/risk");const by=Object.fromEntries(RK.by_class.map(r=>[r.prediction,r]));
 $("rCls").innerHTML=Object.keys(RK.severity).map(c=>`<option>${c}</option>`).join("");
 $("rTbl").innerHTML=Object.entries(RK.severity).map(([c,s])=>{const b=by[c]||{};return `<tr><td>${c}</td><td>${s}</td><td>${fmt(b.n||0)}</td><td>${b.av??"–"}</td><td>${b.mx??"–"}</td></tr>`}).join("");
 $("rCut").innerHTML=RK.cutoffs.map(([m,l],i)=>`${pill(l)}<span>${i?RK.cutoffs[i-1][0]+1:0} – ${m}</span>`).join("");calc()}
 catch(e){if(e.status===401)logout()}}
async function calc(){if(!RK)return;const c=$("rCls").value,p=$("rConf").value/100;$("rConfV").textContent=Math.round(p*100)+"%";
 try{const j=await api("/api/risk/score?cls="+encodeURIComponent(c)+"&conf="+p);$("rOut").innerHTML=j.risk_score+" "+pill(j.risk_label);
  $("rExp").textContent=RK.severity[c]+" (severity) × "+p.toFixed(2)+" (confidence) = "+j.risk_score}catch(e){}}
$("rCls").onchange=$("rConf").oninput=calc;
// activity history page
const hQ=()=>"level="+$("hLvl").value+"&cls="+encodeURIComponent($("hCls").value)+"&hours="+$("hHrs").value+"&source="+$("hSrc").value;
async function loadHist(){try{
 if(!hInit){const r=await api("/api/risk");$("hCls").innerHTML='<option value="">All types</option>'+Object.keys(r.severity).map(c=>`<option>${c}</option>`).join("");hInit=true}
 const j=await api(`/api/history?page=${hPg}&size=50&${hQ()}`),np=Math.max(1,Math.ceil(j.total/50));
 $("hCount").textContent=fmt(j.total)+" detections";$("hPage").textContent=`Page ${hPg} of ${np}`;$("hPrev").disabled=hPg<=1;$("hNext").disabled=hPg>=np;
 $("hrows").innerHTML=j.rows.length?j.rows.map(r=>`<tr><td>${r.id}</td><td>${ts(r.ts)}</td><td>${r.prediction}</td><td>${(r.confidence*100).toFixed(1)}%</td><td>${r.risk_score}</td><td>${pill(r.risk_label)}</td><td>${r.anomaly_score??"–"}</td><td>${esc(r.model)}</td><td>${esc(r.source)}${r.source_name?" · "+esc(r.source_name):""}</td><td>${esc(r.proto)}</td><td>${esc(r.service)}</td><td>${esc(r.sbytes)} / ${esc(r.dbytes)}</td></tr>`).join(""):'<tr><td colspan="12">No records</td></tr>'}
 catch(e){if(e.status===401)logout()}}
["hHrs","hLvl","hCls","hSrc"].forEach(i=>$(i).onchange=()=>{hPg=1;loadHist()});
$("hPrev").onclick=()=>{hPg--;loadHist()};$("hNext").onclick=()=>{hPg++;loadHist()};
$("hCsv").onclick=()=>{location.href="/api/history.csv?token="+encodeURIComponent(TOKEN)+"&"+hQ()};
// models page
const pct=x=>x==null?"–":(x*100).toFixed(2)+"%";
async function loadModels(){try{const j=await api("/api/models");$("mdActive").textContent="Active: "+j.active;
 $("mdAnom").textContent=j.anomaly?"Anomaly detector (Isolation Forest) is active: it adds up to 30 points to the risk score of unusual flows.":"Anomaly detector not trained yet. Run: python train_anomaly.py";
 $("mdBody").innerHTML=j.models.map(m=>{const x=m.metrics||{};
  const st=!m.available?"File not found":m.error?"Load failed: "+esc(m.error):m.loaded?"Loaded":"Ready";
  const act=m.name===j.active?'<span class="pill Low">Active</span>':m.available?`<button class="alt" data-use="${esc(m.name)}">Use this model</button>`:"";
  return `<tr><td>${esc(m.name)}</td><td>${st}</td><td>${pct(x.accuracy)}</td><td>${pct(x.precision)}</td><td>${pct(x.recall)}</td><td>${pct(x.macro_f1)}</td><td>${pct(x.weighted_f1)}</td><td>${act}</td></tr>`}).join("")}
 catch(e){if(e.status===401)logout()}}
$("mdBody").onclick=async e=>{const n=e.target.dataset.use;if(!n)return;e.target.textContent="Loading…";
 try{await api("/api/models/active",{name:n})}catch(x){alert(x.message)}loadModels()};
$("mdTest").onclick=async()=>{$("mdOut").textContent="Testing… (large models can take a few seconds)";
 try{const j=await api("/api/models/test?n="+encodeURIComponent($("mdN").value),{});
  $("mdOut").innerHTML=`<table><thead><tr><th>Model</th><th>Accuracy</th><th>Macro F1</th><th>ms per 1000 rows</th></tr></thead><tbody>`
   +j.models.map(m=>m.error?`<tr><td>${esc(m.name)}</td><td colspan="3">Failed: ${esc(m.error)}</td></tr>`:`<tr><td>${esc(m.name)}</td><td>${pct(m.accuracy)}</td><td>${pct(m.macro_f1)}</td><td>${m.ms_per_1000}</td></tr>`).join("")
   +`</tbody></table><p class="sub">${j.rows} random rows`+(j.agree==null?"":` · all models agree on ${pct(j.agree)}`)+`</p>`}
 catch(x){$("mdOut").textContent=x.message}};
// incidents page
let incSel=null;
async function loadInc(){try{const j=await api("/api/incidents?status="+$("iSt").value);
 $("irows").innerHTML=j.rows.length?j.rows.map(r=>`<tr data-i="${r.id}" style="cursor:pointer"><td>${r.id}</td><td>${esc(r.title)}</td><td>${pill(r.severity)}</td><td>${esc(r.status)}</td><td>${esc(r.assignee||"–")}</td><td>${ts(r.updated_at)}</td></tr>`).join(""):'<tr><td colspan="6">No incidents yet. Create one from an alert or with New incident.</td></tr>'}
 catch(e){if(e.status===401)logout()}}
$("iSt").onchange=loadInc;
$("irows").onclick=e=>{const tr=e.target.closest("tr");if(tr&&tr.dataset.i)openInc(+tr.dataset.i)};
async function openInc(id){incSel=id;try{const [l,n,u]=await Promise.all([api("/api/incidents"),api("/api/incidents/"+id+"/notes"),api("/api/users")]);
 const r=l.rows.find(x=>x.id===id);if(!r)return;$("iTitle").textContent="#"+id+" "+r.title;$("iBox").hidden=false;$("iStat").value=r.status;
 $("iAss").innerHTML='<option value="">Unassigned</option>'+u.users.map(x=>`<option>${esc(x)}</option>`).join("");$("iAss").value=r.assignee||"";
 $("iNotes").innerHTML=n.rows.length?n.rows.map(x=>`<p><b>${esc(x.username)}</b> · ${ts(x.ts)}<br>${esc(x.note)}</p>`).join(""):"No notes yet"}catch(e){}}
const incEdit=async b=>{try{await api("/api/incidents/"+incSel,b)}catch(x){alert(x.message)}loadInc();openInc(incSel)};
$("iStat").onchange=()=>incEdit({status:$("iStat").value});$("iAss").onchange=()=>incEdit({assignee:$("iAss").value});
$("iAdd").onclick=()=>{const n=$("iNote").value.trim();if(!n||!incSel)return;$("iNote").value="";incEdit({note:n})};
$("iNew").onclick=async()=>{const t=prompt("Incident title");if(!t)return;try{const j=await api("/api/incidents",{title:t,severity:"High"});await loadInc();openInc(j.id)}catch(x){alert(x.message)}};
// reports page
const repDaily=mk("rpDaily",{type:"line",data:{labels:[],datasets:[{label:"Normal",data:[],borderColor:"#22c55e",tension:.3},{label:"Attacks",data:[],borderColor:"#ef4444",tension:.3}]},options:opt}),
 repType=mk("rpType",{type:"bar",data:{labels:[],datasets:[{data:[],backgroundColor:"#3b82f6"}]},options:{...opt,plugins:{legend:{display:false}}}});
async function loadReport(){try{const j=await api("/api/report?days="+$("rpDays").value+"&tz="+TZ),k=j.kpis;LASTREP=j;
 $("rpF").textContent=fmt(k.total);$("rpA").textContent=fmt(k.attacks)+" ("+(k.total?(k.attacks/k.total*100).toFixed(1):"0.0")+"%)";
 $("rpC").textContent=fmt(k.critical);$("rpS").textContent=fmt(k.suspicious);$("rpV").textContent=k.avg_risk;
 repDaily.data.labels=j.daily.map(x=>x.d);repDaily.data.datasets[0].data=j.daily.map(x=>x.total-x.attacks);repDaily.data.datasets[1].data=j.daily.map(x=>x.attacks);repDaily.update();
 repType.data.labels=j.types.map(x=>x.name);repType.data.datasets[0].data=j.types.map(x=>x.n);repType.update();
 $("rpProto").innerHTML=j.protocols.map(p=>`<tr><td>${esc(p.name)}</td><td>${fmt(p.total)}</td><td>${fmt(p.attacks)}</td><td>${p.total?(p.attacks/p.total*100).toFixed(1):"0.0"}%</td></tr>`).join("")||'<tr><td colspan="4">No data</td></tr>';
 $("rpTop").innerHTML=j.top.map(t=>`<tr><td>${ts(t.ts)}</td><td>${esc(t.prediction)}</td><td>${t.risk_score}</td><td>${pill(t.risk_label)}</td><td>${esc(t.proto)}</td></tr>`).join("")||'<tr><td colspan="5">No data</td></tr>'}
 catch(e){if(e.status===401)logout()}}
$("rpDays").onchange=loadReport;
$("rpPrint").onclick=()=>window.open("/api/report.html?days="+$("rpDays").value+"&tz="+TZ+"&token="+encodeURIComponent(TOKEN));
// admin page
async function loadAdmin(){try{const [u,a,n]=await Promise.all([api("/api/admin/users"),api("/api/admin/audit"),api("/api/admin/notifications")]);
 $("adUsers").innerHTML=u.users.map(x=>`<tr><td>${esc(x.username)}</td><td><select data-role="${esc(x.username)}">${["viewer","analyst","admin"].map(r=>`<option${r===x.role?" selected":""}>${r}</option>`).join("")}</select></td><td><select data-team="${esc(x.username)}"><option value="">No team</option>${u.teams.map(t=>`<option value="${t.id}"${t.id===x.team_id?" selected":""}>${esc(t.name)}</option>`).join("")}</select></td></tr>`).join("");
 $("adTeams").textContent=u.teams.length?u.teams.map(t=>t.name).join(", "):"No teams yet";
 $("adAudit").innerHTML=a.rows.map(r=>`<tr><td>${ts(r.ts)}</td><td>${esc(r.username)}</td><td>${esc(r.action)}</td><td>${esc(r.detail)}</td><td>${esc(r.ip)}</td></tr>`).join("");
 $("adNotes").innerHTML=n.rows.length?n.rows.map(r=>`<tr><td>${ts(r.ts)}</td><td>${esc(r.channel)}</td><td>${esc(r.target)}</td><td>${esc(r.subject)}</td><td>${esc(r.status)}${r.error?": "+esc(r.error):""}</td></tr>`).join(""):'<tr><td colspan="5">None sent. Set NETSHIELD_WEBHOOK_URL or the SMTP settings in .env</td></tr>'}
 catch(e){if(e.status===401)logout();else if(e.status===403)$("adUsers").innerHTML='<tr><td colspan="3">The admin role is required for this page.</td></tr>'}}
$("adUsers").onchange=async e=>{const t=e.target,u=t.dataset.role||t.dataset.team;if(!u)return;
 try{await api("/api/admin/users/"+encodeURIComponent(u),t.dataset.role?{role:t.value}:(t.value?{team_id:+t.value}:{clear_team:true}))}catch(x){alert(x.message)}loadAdmin()};
$("adTeamAdd").onclick=async()=>{const n=$("adTeamName").value.trim();if(!n)return;try{await api("/api/admin/teams",{name:n});$("adTeamName").value=""}catch(x){alert(x.message)}loadAdmin()};
// roles
function setRole(r){ROLE=r;localStorage.setItem("ns_role",r);document.body.dataset.role=r}
// forecast, top IPs and threat intelligence (Reports page)
let LASTREP=null;
const rpFc=mk("rpFc",{type:"line",data:{labels:[],datasets:[{label:"Attacks per hour",data:[],borderColor:"#ef4444",tension:.3,pointRadius:1},{label:"Forecast",data:[],borderColor:"#facc15",borderDash:[6,4],tension:.3,pointRadius:1}]},options:opt});
async function loadReportExtras(){try{const j=LASTREP||{},f=await api("/api/forecast?tz="+TZ),n=f.labels.length;
 rpFc.data.labels=[...f.labels,...f.forecast_labels];
 rpFc.data.datasets[0].data=[...f.attacks,...f.forecast.map(()=>null)];
 rpFc.data.datasets[1].data=[...f.attacks.map((v,i)=>i===n-1?v:null),...f.forecast];rpFc.update();
 $("fcOut").textContent="· outlook: "+f.outlook;
 $("fcNote").textContent="Expected attacks in the next "+f.forecast.length+" hours: "+f.forecast.reduce((a,b)=>a+b,0).toFixed(0)+" (±"+f.band+" per hour, 95% range). High or Critical expected: "+f.forecast_high.reduce((a,b)=>a+b,0).toFixed(0)+".";
 $("rpIps").innerHTML=(j.top_ips||[]).length?j.top_ips.map(i=>`<tr><td>${esc(i.ip)}</td><td>${fmt(i.flows)}</td><td>${fmt(i.attacks)}</td><td>${i.max_risk}</td><td>${i.blocklist?"yes":"no"}</td></tr>`).join(""):'<tr><td colspan="5">No source addresses recorded yet</td></tr>'}catch(e){}}
const _lr=loadReport;loadReport=async()=>{await _lr();loadReportExtras()};$("rpDays").onchange=loadReport;
$("tiBtn").onclick=async()=>{const ip=$("tiIp").value.trim();if(!ip)return;$("tiOut").textContent="Checking…";
 try{const j=await api("/api/threatintel/"+encodeURIComponent(ip)),a=j.abuseipdb;
  $("tiOut").innerHTML=`<b>${esc(j.ip)}</b>: ${esc(j.verdict)}<br>Local blocklist: ${j.blocklist?"listed":"not listed"}`+(a?(a.error?`<br>AbuseIPDB: ${esc(a.error)}`:`<br>AbuseIPDB score ${a.score}, ${a.reports} reports, ${esc(a.country||"")} ${esc(a.isp||"")}`):"<br>AbuseIPDB: not configured (set NETSHIELD_ABUSEIPDB_KEY)")}catch(x){$("tiOut").textContent=x.message}};
// performance page
const ms=x=>x==null?"–":x+" ms",pc=x=>x==null?"–":(x*100).toFixed(2)+"%";
async function loadPerf(){try{const j=await api("/api/performance"),p=j.perf,g=k=>p[k]||{};
 $("pfApi").textContent=ms(g("api_ms").avg);$("pfAlert").textContent=ms(g("alert_latency_ms").avg);$("pfFlows").textContent=p.flows_per_sec==null?"–":fmt(p.flows_per_sec);$("pfBatch").textContent=ms(g("batch_ms").avg);$("pfDash").textContent=j.dashboards_connected;
 $("pfNote").textContent=`95th percentile: dashboard ${ms(g("api_ms").p95)}, alerts ${ms(g("alert_latency_ms").p95)}. Based on the last 10 minutes. Active model: ${j.model}. Server up ${Math.round((p.uptime_s||0)/60)} min.`}catch(e){if(e.status===401)logout()}}
$("pfRefresh").onclick=loadPerf;
$("pfEval").onclick=async()=>{$("pfOut").textContent="Evaluating…";try{const j=await api("/api/metrics/evaluate?n="+encodeURIComponent($("pfN").value),{});
 $("pfDet").textContent=pc(j.detection_rate);$("pfFpr").textContent=pc(j.false_positive_rate);$("pfPrec").textContent=pc(j.precision_attack);$("pfAcc").textContent=pc(j.accuracy);$("pfF1").textContent=pc(j.macro_f1);
 $("pfOut").innerHTML=`<table><thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Rows</th></tr></thead><tbody>`+j.classes.map(c=>`<tr><td>${esc(c.name)}</td><td>${pc(c.precision)}</td><td>${pc(c.recall)}</td><td>${pc(c.f1)}</td><td>${c.support}</td></tr>`).join("")+`</tbody></table><p class="sub">${esc(j.model)} on ${j.rows} rows · attacks caught ${j.tp}, missed ${j.fn}; normal flagged ${j.fp}, normal passed ${j.tn} · ${j.ms_per_1000} ms per 1000 rows</p>`}catch(x){$("pfOut").textContent=x.message}};
// time: the database keeps UTC, every page shows the viewer's own local time
function pad(n){return String(n).padStart(2,"0")}
const TZ=-new Date().getTimezoneOffset();
function tick(){const d=new Date(),o=Math.abs(TZ);
 $("clock").textContent=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds())+"  UTC"+(TZ<0?"-":"+")+pad(Math.floor(o/60))+":"+pad(o%60)}
tick();setInterval(tick,1000);
// live source: real network capture or demo replay of the dataset
function liveBody(){return {source:localStorage.getItem("ns_src")||"network",iface:localStorage.getItem("ns_iface")||""}}
async function loadIfaces(){const sel=$("lvSrc");sel.value=localStorage.getItem("ns_src")||"network";$("lvIface").hidden=sel.value!=="network";
 try{const j=await api("/api/interfaces"),box=$("lvIface");
  box.innerHTML=j.available&&j.interfaces.length?j.interfaces.map(i=>`<option value="${esc(i.name)}"${i.default?" selected":""}>${esc(i.name)} · ${esc(i.ip)}</option>`).join(""):`<option value="">${j.available?"no adapter found":"install scapy to capture"}</option>`;
  const saved=localStorage.getItem("ns_iface");if(saved&&[...box.options].some(o=>o.value===saved))box.value=saved;else localStorage.setItem("ns_iface",box.value||"")}catch(e){}}
$("lvSrc").onchange=()=>{localStorage.setItem("ns_src",$("lvSrc").value);$("lvIface").hidden=$("lvSrc").value!=="network"};
$("lvIface").onchange=()=>localStorage.setItem("ns_iface",$("lvIface").value);
setInterval(async()=>{if(mode!=="live"||!TOKEN){$("capInfo").textContent="";return}
 try{const j=await api("/api/live/status");$("capInfo").textContent=j.source==="network"?`Capturing on ${j.iface||"the default adapter"}: ${fmt(j.packets)} packets seen, ${j.open_flows} open connections. A connection is scored after it has been quiet for a few seconds.`:"Demo replay: simulated traffic from the dataset file."}catch(e){}},2000);
// small screens: the menu opens as a side drawer
const closeMenu=()=>document.body.classList.remove("menu-open");
$("menuBtn").onclick=()=>document.body.classList.toggle("menu-open");
$("menuClose").onclick=closeMenu;$("navOverlay").onclick=closeMenu;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
document.querySelectorAll("nav a").forEach(a=>a.addEventListener("click",closeMenu));
// hook into login / logout
const oi=init;init=async()=>{await oi();if(TOKEN){try{setRole((await api("/api/me")).role)}catch(e){}loadBadge();route();try{if((await api("/api/live/status")).running)openSrc("live")}catch(e){}}};
const lo=logout;logout=()=>{lo();setRole("");setBadge(0);liveReset();route()};
liveReset();
setRole(ROLE);reset();draw();renderAuth();setBtns();TOKEN?init():route();
