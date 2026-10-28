import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertOctagon, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell,
  CheckCircle2, ChevronDown, CircleHelp, Cpu, Download, Eye, FileBarChart2,
  Filter, Gauge, Globe2, LayoutDashboard, LockKeyhole, Menu, Network, Play,
  Radio, Search, Settings, Shield, ShieldAlert, ShieldCheck, Siren, Sparkles,
  SquareActivity, StopCircle, Terminal, Users, Wifi, X, Zap, UploadCloud, FileSpreadsheet, AlertCircle
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const navGroups = [
  { label: 'WORKSPACE', items: [
    { id: 'Overview', icon: LayoutDashboard },
    { id: 'Live Monitor', icon: Radio },
    { id: 'Threat Detection', icon: ShieldAlert },
    { id: 'Alert Center', icon: Bell, badge: '8' },
    { id: 'Incidents', icon: Siren },
  ]},
  { label: 'INTELLIGENCE', items: [
    { id: 'Analytics', icon: FileBarChart2 },
    { id: 'Threat Intel', icon: Globe2 },
    { id: 'Network Flows', icon: Network },
  ]},
  { label: 'ADMINISTRATION', items: [
    { id: 'Team & Access', icon: Users },
    { id: 'Settings', icon: Settings },
  ]}
]
const seedAlerts = [
  { id:'NS-1048', time:'10:18:42', source:'192.168.1.24', destination:'10.0.0.8:443', type:'DDoS', score:94, level:'CRITICAL', status:'Open' },
  { id:'NS-1047', time:'10:18:31', source:'172.16.0.19', destination:'10.0.0.12:22', type:'Brute Force', score:82, level:'HIGH', status:'Investigating' },
  { id:'NS-1046', time:'10:17:56', source:'45.83.12.104', destination:'10.0.0.4:80', type:'Reconnaissance', score:68, level:'HIGH', status:'Open' },
  { id:'NS-1045', time:'10:17:09', source:'192.168.1.88', destination:'10.0.0.6:53', type:'DNS Anomaly', score:47, level:'MEDIUM', status:'Acknowledged' },
  { id:'NS-1044', time:'10:16:45', source:'10.0.0.23', destination:'10.0.0.1:443', type:'Normal traffic', score:8, level:'LOW', status:'Resolved' },
  { id:'NS-1043', time:'10:15:22', source:'91.214.124.77', destination:'10.0.0.10:8080', type:'Web Attack', score:77, level:'HIGH', status:'Investigating' },
  { id:'NS-1042', time:'10:14:58', source:'185.220.101.5', destination:'10.0.0.7:443', type:'Botnet', score:89, level:'CRITICAL', status:'Open' },
  { id:'NS-1041', time:'10:14:11', source:'192.168.1.42', destination:'10.0.0.9:80', type:'Normal traffic', score:12, level:'LOW', status:'Resolved' },
]
const traffic = [
  {time:'09:00', benign:28, threats:5}, {time:'09:10', benign:34, threats:8},
  {time:'09:20', benign:31, threats:6}, {time:'09:30', benign:45, threats:12},
  {time:'09:40', benign:39, threats:9}, {time:'09:50', benign:54, threats:18},
  {time:'10:00', benign:48, threats:13}, {time:'10:10', benign:63, threats:23},
  {time:'10:20', benign:57, threats:16}, {time:'10:30', benign:71, threats:27},
]
const attackTypes = [
  {name:'Exploits', value:31, color:'#ff4f91'}, {name:'Fuzzers', value:23, color:'#a78bfa'},
  {name:'Generic', value:19, color:'#ff6b6b'}, {name:'Recon', value:14, color:'#fbbf24'},
  {name:'Other', value:13, color:'#35d6a0'}
]
const modelStats = [
  {name:'Random Forest', purpose:'Attack classification', accuracy:'—', state:'Ready'},
  {name:'Extra Trees', purpose:'Attack classification', accuracy:'—', state:'Ready'},
  {name:'XGBoost', purpose:'Attack classification', accuracy:'78.73%*', state:'Ready'},
]
function Badge({level}) { return <span className={'badge '+String(level).toLowerCase()}><i />{level}</span> }
function Metric({label,value,sub,icon:Icon,tone,trend}) {
  return <div className="metric-card">
    <div className="metric-top"><span>{label}</span><span className={'metric-icon '+tone}><Icon size={19}/></span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-bottom"><span className={trend?.startsWith('+')?'up':'muted'}>{trend}</span><span>{sub}</span></div>
  </div>
}
function SectionTitle({eyebrow,title,desc,action}) {
  return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{desc&&<p>{desc}</p>}</div>{action}</div>
}
function App() {
  const [active,setActive] = useState('Overview')
  const [alerts,setAlerts] = useState(seedAlerts)
  const [query,setQuery] = useState('')
  const [levelFilter,setLevelFilter] = useState('ALL')
  const [scanRunning,setScanRunning] = useState(false)
  const [scanCount,setScanCount] = useState(0)
  const [toast,setToast] = useState('')
  const [mobileNav,setMobileNav] = useState(false)
  const [showProfile,setShowProfile] = useState(false)
  const [ackAll,setAckAll] = useState(false)
  const [apiStatus,setApiStatus] = useState('checking')
  const [csvModel,setCsvModel] = useState('XGBoost')
  const [csvBusy,setCsvBusy] = useState(false)
  const [csvError,setCsvError] = useState('')
  const [csvResult,setCsvResult] = useState(null)
  const [csvFilename,setCsvFilename] = useState('')
  useEffect(()=>{
    let live=true
    fetch('/api/health').then(r=>{if(!r.ok) throw new Error('API unavailable'); return r.json()}).then(data=>{
      if(!live) return
      setApiStatus(data.status==='healthy'?'connected':'degraded')
      return fetch('/api/alerts')
    }).then(r=>r&&r.ok?r.json():null).then(data=>{if(live&&Array.isArray(data)) setAlerts(data)}).catch(()=>{if(live) setApiStatus('offline')})
    return ()=>{live=false}
  },[])
  const filtered = useMemo(()=>alerts.filter(a=>
    (levelFilter==='ALL'||a.level===levelFilter) &&
    [a.id,a.source,a.destination,a.type,a.status].join(' ').toLowerCase().includes(query.toLowerCase())
  ),[alerts,levelFilter,query])
  function notify(message){setToast(message); window.setTimeout(()=>setToast(''),2600)}
  function startScan(){
    if(scanRunning){setScanRunning(false);notify('Dataset replay stopped.');return}
    setScanRunning(true); setScanCount(0); notify('Dataset replay started from row 1.')
    let n=0
    const timer=window.setInterval(()=>{
      n++; setScanCount(n)
      if(n%2===0){
        setAlerts(prev=>{
          const item=seedAlerts[(n/2)%seedAlerts.length]
          const newAlert={...item,id:`NS-${1050+n}`,time:new Date().toLocaleTimeString('en-GB'),status:'Open'}
          return [newAlert,...prev].slice(0,30)
        })
      }
      if(n>=12){window.clearInterval(timer);setScanRunning(false);notify('Demo replay complete. Connect the API for real CSV streaming.')}
    },900)
  }
  async function resolveAlert(id){
    try { const response=await fetch(`/api/alerts/${encodeURIComponent(id)}/resolve`,{method:'PATCH'}); if(!response.ok) throw new Error('API unavailable'); const updated=await response.json(); setAlerts(prev=>prev.map(a=>a.id===id?updated:a)); notify(`${id} marked resolved and saved by API.`) }
    catch { setAlerts(prev=>prev.map(a=>a.id===id?{...a,status:'Resolved'}:a)); notify(`${id} resolved locally; backend is offline.`) }
  }
  async function uploadAndScanCsv(file){
    if(!file) return
    setCsvError(''); setCsvResult(null); setCsvFilename(file.name)
    if(!file.name.toLowerCase().endsWith('.csv')){setCsvError('Please select a CSV file (.csv).');return}
    const form = new FormData(); form.append('file', file); form.append('model_name', csvModel)
    setCsvBusy(true)
    try {
      const response = await fetch('/api/scan-csv', {method:'POST', body:form})
      const data = await response.json()
      if(!response.ok) throw new Error(data.detail || `Scan failed (${response.status})`)
      setCsvResult(data)
      if(Array.isArray(data.results)){
        const generated = data.results.filter(r=>r.risk_level!=='LOW').slice(0,100).map(r=>({id:`CSV-${Date.now()}-${r.row}`,time:new Date().toLocaleTimeString('en-GB'),source:r.source||'—',destination:r.destination||'—',type:r.prediction,score:r.risk_score,level:r.risk_level,status:'Open'}))
        if(generated.length) setAlerts(prev=>[...generated,...prev].slice(0,500))
      }
      notify(`CSV scan complete: ${data.rows_scanned} rows analyzed.`)
    } catch(err){ setCsvError(err.message || 'Could not connect to the backend. Start FastAPI and ensure a trained model exists.') }
    finally { setCsvBusy(false) }
  }
  function exportAlerts(){
    const csv=['ID,Time,Source,Destination,Type,Risk Score,Risk Level,Status',...filtered.map(a=>[a.id,a.time,a.source,a.destination,a.type,a.score,a.level,a.status].join(','))].join('\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='netshield-alerts.csv';a.click();URL.revokeObjectURL(url)
  }
  const critical=alerts.filter(a=>a.level==='CRITICAL'&&a.status!=='Resolved').length
  const openCount=alerts.filter(a=>a.status==='Open').length
  const pageTitle=active==='Overview'?'Security overview':active
  return <div className="app-shell">
    <aside className={'sidebar '+(mobileNav?'mobile-open':'')}>
      <div className="brand"><div className="brand-mark"><Shield size={23}/><span /></div><div><strong>NETSHIELD<span> AI</span></strong><small>SECURITY OPERATIONS</small></div><button className="close-nav" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">NS</div><div><b>Security Workspace</b><small>Enterprise · SOC-01</small></div><ChevronDown size={15}/></div>
      <nav>{navGroups.map(group=><div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(item=><button key={item.id} className={'nav-item '+(active===item.id?'selected':'')} onClick={()=>{setActive(item.id);setMobileNav(false)}}><item.icon size={18}/><span>{item.id}</span>{item.badge&&<em>{openCount||item.badge}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="system-status"><span className="pulse-dot"/><div><b>All systems operational</b><small>{apiStatus==='connected'?'FastAPI connected':apiStatus==='checking'?'Checking API…':apiStatus==='degraded'?'API degraded':'API offline · local mode'}</small></div></div><div className="user-row"><div className="user-avatar">SS</div><div><b>Security Analyst</b><small>Analyst role</small></div><button onClick={()=>setShowProfile(!showProfile)}><ChevronDown size={16}/></button></div>{showProfile&&<div className="profile-pop"><b>Demo profile</b><p>Role-based access is a UI placeholder until backend authentication is connected.</p></div>}</div>
    </aside>
    {mobileNav&&<div className="mobile-scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">NetShield AI <span>/</span> <b>{pageTitle}</b></div></div><div className="top-actions"><div className="live-pill"><span className="pulse-dot"/> SYSTEM LIVE</div><button className="icon-btn" onClick={()=>setActive('Alert Center')} title="View alerts"><Bell size={18}/><i/></button><div className="top-divider"/><button className="profile-button" onClick={()=>setShowProfile(!showProfile)}><div className="user-avatar small">SS</div><span>Analyst</span><ChevronDown size={14}/></button></div></header>
      <div className="page-content">
        {active==='Overview'&&<Overview alerts={alerts} critical={critical} openCount={openCount} scanRunning={scanRunning} scanCount={scanCount} startScan={startScan} setActive={setActive} csvModel={csvModel} setCsvModel={setCsvModel} csvBusy={csvBusy} csvError={csvError} csvResult={csvResult} csvFilename={csvFilename} uploadAndScanCsv={uploadAndScanCsv} />}
        {active==='Live Monitor'&&<LiveMonitor scanRunning={scanRunning} scanCount={scanCount} startScan={startScan} alerts={alerts} />}
        {active==='Threat Detection'&&<Detection alerts={alerts} setActive={setActive}/>}
        {active==='Alert Center'&&<AlertCenter alerts={filtered} query={query} setQuery={setQuery} levelFilter={levelFilter} setLevelFilter={setLevelFilter} resolveAlert={resolveAlert} exportAlerts={exportAlerts} ackAll={ackAll} setAckAll={setAckAll} notify={notify}/>}
        {active==='Incidents'&&<Incidents alerts={alerts} resolveAlert={resolveAlert}/>}
        {active==='Analytics'&&<Analytics alerts={alerts}/>}
        {active==='Threat Intel'&&<ThreatIntel/>}
        {active==='Network Flows'&&<NetworkFlows alerts={alerts}/>}
        {active==='Team & Access'&&<TeamAccess/>}
        {active==='Settings'&&<SettingsPage notify={notify}/>}
      </div>
      <footer className="footer"><span>© 2026 NetShield AI <b>•</b> Network Anomaly Detection & Threat Monitoring</span><span><i className="green-dot"/> {apiStatus==='connected'?'FastAPI connected':apiStatus==='checking'?'Checking FastAPI':'Local demo mode'} <b>•</b> Model files must be configured separately</span></footer>
    </main>
    {toast&&<div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>
}
function Overview({alerts,critical,openCount,scanRunning,scanCount,startScan,setActive,csvModel,setCsvModel,csvBusy,csvError,csvResult,csvFilename,uploadAndScanCsv}){
  const rows=alerts.slice(0,5)
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={13}/> SECURITY COMMAND CENTER</div><h1>Good morning, Analyst <span>✦</span></h1><p>Here's what's happening across your network right now.</p></div><div className="welcome-actions"><button className="button secondary" onClick={()=>setActive('Analytics')}><FileBarChart2 size={16}/> View reports</button><button className={'button primary '+(scanRunning?'stop-button':'')} onClick={startScan}>{scanRunning?<StopCircle size={16}/>:<Play size={16} fill="currentColor"/>}{scanRunning?'Stop demo scan':'Start demo scan'}</button></div></div>
    <div className="demo-note"><span className="note-icon"><CircleHelp size={16}/></span><div><b>Frontend preview mode</b><span>Dashboard uses sample alerts until FastAPI is connected. “Start demo scan” simulates activity; it does not yet scan your CSV.</span></div><span className="demo-tag">DEMO DATA</span></div>
    <section className="panel csv-upload-panel">
      <div className="panel-head"><div><h3><FileSpreadsheet size={19}/> Upload network traffic CSV</h3><p>Select a CICIDS2017 / UNSW-NB15 flow CSV with the same feature columns used to train your model.</p></div><span className="demo-tag">AI SCAN</span></div>
      <div className="csv-upload-controls">
        <label className="csv-model-label">Detection model<select value={csvModel} onChange={e=>setCsvModel(e.target.value)} disabled={csvBusy}><option value="XGBoost">XGBoost</option><option value="RandomForest">Random Forest</option><option value="ExtraTrees">Extra Trees</option></select></label>
        <label className={'csv-file-button '+(csvBusy?'disabled':'')}><UploadCloud size={18}/><span>{csvBusy?'Analyzing CSV…':'Add CSV file'}</span><input type="file" accept=".csv,text/csv" disabled={csvBusy} onChange={e=>{const file=e.target.files?.[0]; if(file) uploadAndScanCsv(file); e.target.value=''}} /></label>
        <span className="csv-file-name">{csvFilename || 'No file selected'}</span>
      </div>
      {csvError&&<div className="csv-error"><AlertCircle size={17}/><span>{csvError}</span></div>}
      {csvBusy&&<div className="csv-progress"><span/><span>Uploading file to FastAPI and scoring rows with {csvModel}…</span></div>}
      {csvResult&&<div className="csv-results">
        <div className="csv-result-heading"><div><b>Scan results</b><small>{csvResult.filename} · {csvResult.model} · {csvResult.rows_scanned.toLocaleString()} rows analyzed</small></div><span className="ready-pill"><i/> Scan complete</span></div>
        <div className="metrics-grid four csv-metrics"><Metric label="Rows scanned" value={csvResult.rows_scanned.toLocaleString()} sub="CSV records" icon={Network} tone="pink" trend="Complete"/><Metric label="Threat predictions" value={csvResult.threat_rows.toLocaleString()} sub="Non-benign labels" icon={ShieldAlert} tone="red" trend="Analyzed"/><Metric label="Critical risk" value={csvResult.risk_counts.CRITICAL||0} sub="Risk score 76–100" icon={AlertOctagon} tone="orange" trend="Review"/><Metric label="Alerts created" value={csvResult.alerts_created} sub="Added to alert center" icon={Bell} tone="purple" trend="Saved"/></div>
        <div className="csv-prediction-summary">{Object.entries(csvResult.prediction_counts||{}).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=><span key={name}><b>{name}</b><em>{count.toLocaleString()}</em></span>)}</div>
        <div className="csv-table-wrap"><table className="csv-table"><thead><tr><th>Row</th><th>Prediction</th><th>Confidence</th><th>Risk score</th><th>Level</th></tr></thead><tbody>{csvResult.results.slice(0,15).map(r=><tr key={r.row}><td>{r.row}</td><td>{r.prediction}</td><td>{(r.confidence*100).toFixed(1)}%</td><td><b>{r.risk_score}/100</b></td><td><span className={'badge '+r.risk_level.toLowerCase()}><i/>{r.risk_level}</span></td></tr>)}</tbody></table></div>
        {csvResult.truncated_results&&<p className="tiny-note">Showing the first 15 rows here and up to 500 results returned by the API. All {csvResult.rows_scanned.toLocaleString()} rows were scored.</p>}
        <div className="csv-result-actions"><button className="button primary" onClick={()=>{window.location.href=csvResult.download_url}}><Download size={15}/> Download all {csvResult.rows_scanned.toLocaleString()} results</button><button className="button secondary" onClick={()=>setActive('Alert Center')}>Open generated alerts <ArrowUpRight size={15}/></button></div>
      </div>}
    </section>
    <div className="metrics-grid">
      <Metric label="Total network flows" value="82.3K" sub="UNSW-NB15 test records" icon={Network} tone="pink" trend="+12.8%"/>
      <Metric label="Threats detected" value="1,284" sub="Across replayed flows" icon={ShieldAlert} tone="red" trend="+8.4%"/>
      <Metric label="Critical alerts" value={String(critical).padStart(2,'0')} sub="Require immediate review" icon={AlertOctagon} tone="orange" trend="Live"/>
      <Metric label="Open incidents" value={String(openCount).padStart(2,'0')} sub="Awaiting analyst action" icon={Siren} tone="purple" trend="Active"/>
    </div>
    <div className="content-grid overview-charts">
      <section className="panel traffic-panel"><div className="panel-head"><div><h3>Network traffic overview</h3><p>Flow volume and detected threats over time</p></div><button className="select-like">Last 90 minutes <ChevronDown size={14}/></button></div><div className="chart-legend"><span><i className="legend-pink"/> Total traffic</span><span><i className="legend-red"/> Threat signals</span><span className="chart-stat"><b>2,849</b> <small>flows/min</small></span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={traffic} margin={{top:8,right:6,left:-22,bottom:0}}><defs><linearGradient id="benignGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f34c98" stopOpacity={0.28}/><stop offset="95%" stopColor="#f34c98" stopOpacity={0}/></linearGradient><linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff4d5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#ff4d5e" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#282330" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill:'#8b8496',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8b8496',fontSize:11}}/><Tooltip contentStyle={{background:'#17121e',border:'1px solid #3a2b3c',borderRadius:10,color:'#fff'}}/><Area type="monotone" dataKey="benign" name="Total traffic" stroke="#f34c98" strokeWidth={2.5} fill="url(#benignGrad)"/><Area type="monotone" dataKey="threats" name="Threat signals" stroke="#ff5964" strokeWidth={2} fill="url(#threatGrad)"/></AreaChart></ResponsiveContainer></div><div className="chart-foot"><span><i className="green-dot"/> Traffic telemetry active</span><span>Illustrative sample series</span></div></section>
      <section className="panel attack-panel"><div className="panel-head"><div><h3>Threat distribution</h3><p>Detected category breakdown</p></div><button className="dots-button">•••</button></div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={attackTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={66} outerRadius={91} paddingAngle={4} stroke="none">{attackTypes.map((entry,i)=><Cell key={i} fill={entry.color}/>)}</Pie><Tooltip contentStyle={{background:'#17121e',border:'1px solid #3a2b3c',borderRadius:10,color:'#fff'}}/></PieChart></ResponsiveContainer><div className="donut-center"><b>1,284</b><span>THREATS</span></div></div><div className="distribution-list">{attackTypes.map(t=><div className="distribution-row" key={t.name}><span><i style={{background:t.color}}/>{t.name}</span><b>{t.value}%</b><div className="mini-track"><i style={{width:t.value+'%',background:t.color}}/></div></div>)}</div></section>
    </div>
    <section className="panel recent-panel"><div className="panel-head"><div><h3>Recent security alerts <span className="count-chip">{alerts.length}</span></h3><p>Latest activity requiring your attention</p></div><button className="text-action" onClick={()=>setActive('Alert Center')}>View all alerts <ArrowUpRight size={15}/></button></div><AlertsTable alerts={rows} compact/><div className="panel-bottom"><span>Showing latest {rows.length} alerts</span><button className="text-action" onClick={()=>setActive('Alert Center')}>Open alert center <ArrowUpRight size={14}/></button></div></section>
    <div className="bottom-grid"><section className="panel model-panel"><div className="panel-head"><div><h3>AI model health</h3><p>Registered detection models</p></div><span className="ready-pill"><i/>3 models</span></div>{modelStats.map((m,i)=><div className="model-row" key={m.name}><div className={'model-symbol m'+i}><Cpu size={17}/></div><div className="model-details"><b>{m.name}</b><small>{m.purpose}</small></div><span className="model-accuracy">{m.accuracy}</span><span className="ready-text"><i/>Ready</span></div>)}<p className="tiny-note">*XGBoost score is from the provided multiclass notebook. Validate each model on the same test split before reporting a comparison.</p></section><section className="panel risk-panel"><div className="panel-head"><div><h3>Risk scoring engine</h3><p>Mentor-defined severity × confidence</p></div><div className="risk-glyph"><Gauge size={19}/></div></div><div className="risk-formula"><span>risk_score =</span><b>severity × confidence</b></div><div className="risk-scale"><div><span>LOW</span><b>0–25</b></div><div><span>MEDIUM</span><b>26–50</b></div><div><span>HIGH</span><b>51–75</b></div><div><span>CRITICAL</span><b>76–100</b></div></div><button className="text-action" onClick={()=>setActive('Threat Detection')}>Explore detection logic <ArrowUpRight size={14}/></button></section></div>
  </>
}
function AlertsTable({alerts,compact=false,resolveAlert}){
  return <div className="table-scroll"><table className="alerts-table"><thead><tr><th>ALERT ID</th><th>TIME</th><th>SOURCE IP</th><th>DESTINATION</th><th>THREAT TYPE</th><th>RISK SCORE</th><th>SEVERITY</th><th>STATUS</th>{!compact&&<th>ACTION</th>}</tr></thead><tbody>{alerts.map(a=><tr key={a.id}><td><b className="alert-id">{a.id}</b></td><td className="time-cell">{a.time}</td><td className="ip-cell">{a.source}</td><td className="ip-cell">{a.destination}</td><td><span className="threat-name">{a.type}</span></td><td><div className="score-cell"><b className={a.score>=76?'score-critical':a.score>=51?'score-high':a.score>=26?'score-medium':'score-low'}>{a.score}</b><div className="score-track"><i className={a.score>=76?'critical-fill':a.score>=51?'high-fill':a.score>=26?'medium-fill':'low-fill'} style={{width:a.score+'%'}}/></div></div></td><td><Badge level={a.level}/></td><td><span className={'status-text '+a.status.toLowerCase().replace(' ','-')}>{a.status}</span></td>{!compact&&<td>{a.status!=='Resolved'&&<button className="row-action" onClick={()=>resolveAlert?.(a.id)}>Resolve</button>}</td>}</tr>)}</tbody></table>{alerts.length===0&&<div className="empty-state"><Search size={24}/><b>No alerts match your filters</b><span>Try another search term or severity.</span></div>}</div>
}
function LiveMonitor({scanRunning,scanCount,startScan,alerts}){
  return <><SectionTitle eyebrow="NETWORK TELEMETRY" title="Live network monitor" desc="Replay a dataset and inspect scored flow events as they arrive." action={<button className={'button primary '+(scanRunning?'stop-button':'')} onClick={startScan}>{scanRunning?<StopCircle size={16}/>:<Play size={16}/>}{scanRunning?'Stop replay':'Start dataset replay'}</button>}/><div className="demo-note"><span className="note-icon"><Radio size={16}/></span><div><b>{scanRunning?'Replay in progress':'Ready to scan'}</b><span>{scanRunning?`Simulated chunks processed: ${scanCount} of 12. Backend SSE streaming is not connected yet.`:'This frontend preview simulates events. Once connected, FastAPI will stream CSV rows and risk results using Server-Sent Events.'}</span></div><span className="demo-tag">{scanRunning?'STREAMING DEMO':'WAITING'}</span></div><div className="metrics-grid three"><Metric label="Flow events shown" value={String(82332+scanCount*250).toLocaleString()} sub="Sample dataset count" icon={Activity} tone="pink" trend="+ live"/><Metric label="Chunks processed" value={scanCount+'/12'} sub="Simulated progress" icon={Zap} tone="purple" trend={scanRunning?'Running':'Idle'}/><Metric label="Connection" value="UI ONLY" sub="API not connected" icon={Wifi} tone="orange" trend="Pending"/></div><section className="panel recent-panel"><div className="panel-head"><div><h3>Live event stream</h3><p>Newest events appear at the top of the feed</p></div><span className="ready-pill"><i className={scanRunning?'pulse-dot':''}/>{scanRunning?'Replay active':'Stream idle'}</span></div><AlertsTable alerts={alerts.slice(0,8)} compact/></section><section className="panel stream-info"><h3><Terminal size={17}/> Streaming architecture</h3><div className="pipeline"><span>CSV reader</span><ArrowUpRight/><span>3-model inference</span><ArrowUpRight/><span>Risk scoring</span><ArrowUpRight/><span>SSE stream</span><ArrowUpRight/><span>Dashboard</span></div><p>Each chunk should be processed with the saved model pipelines; stream results to the browser and restart from row one on each new scan.</p></section></>
}
function Detection({alerts,setActive}){
  const [selected,setSelected]=useState('XGBoost')
  return <><SectionTitle eyebrow="AI DETECTION ENGINE" title="Threat detection" desc="Inspect the three-model plan and mentor-defined risk scoring rules."/><div className="metrics-grid three"><Metric label="Registered models" value="03" sub="RF · Extra Trees · XGBoost" icon={Cpu} tone="purple" trend="Ready in UI"/><Metric label="Attack categories" value="10" sub="UNSW-NB15 multiclass labels" icon={ShieldAlert} tone="red" trend="Multi-class"/><Metric label="Risk scale" value="0–100" sub="Severity × confidence" icon={Gauge} tone="pink" trend="Mentor formula"/></div><div className="model-cards">{modelStats.map((m,i)=><button className={'model-card '+(selected===m.name?'active':'')} key={m.name} onClick={()=>setSelected(m.name)}><div className={'model-symbol m'+i}><Cpu size={20}/></div><span className="model-tag">MODEL 0{i+1}</span><h3>{m.name}</h3><p>{m.purpose} for UNSW-NB15 attack categories.</p><div className="model-card-foot"><span><i className="green-dot"/> Registered</span><ArrowUpRight size={16}/></div></button>)}</div><section className="panel detection-detail"><div className="panel-head"><div><h3>{selected} · model details</h3><p>Training metrics must come from your locally trained artifacts.</p></div><Badge level="MEDIUM"/></div><div className="detail-grid"><div><span>Dataset</span><b>UNSW-NB15</b></div><div><span>Target</span><b>attack_cat (10 classes)</b></div><div><span>Preprocessing</span><b>Saved pipeline</b></div><div><span>Current frontend status</span><b>Display placeholder only</b></div></div><div className="warning-note"><AlertTriangle size={17}/><span>Only the XGBoost multiclass results supplied in your notebook are known (78.73% accuracy, weighted F1 78.66%). Do not claim measured scores for Random Forest or Extra Trees until you run training and evaluate them.</span></div></section><section className="panel"><div className="panel-head"><div><h3>Risk scoring reference</h3><p>Rule supplied by your mentor</p></div></div><div className="severity-table"><div><b>Predicted class</b><b>Base severity</b></div>{[['Normal',0],['Analysis',30],['Reconnaissance',30],['Fuzzers',50],['Exploits',60],['DoS',70],['Backdoor',80],['Shellcode',80],['Worms',90],['Generic',60]].map(([n,v])=><div key={n}><span>{n}</span><b>{v}</b></div>)}</div><p className="tiny-note">Severity values above are a starter mapping for this UNSW-NB15 label set; confirm the final mapping with your mentor. The supplied guide's example mapping uses BENIGN, PortScan, Brute Force, Web Attack, Botnet and DDoS.</p></section><button className="button secondary" onClick={()=>setActive('Alert Center')}><Bell size={16}/> View alerts generated by detection</button></>
}
function AlertCenter({alerts,query,setQuery,levelFilter,setLevelFilter,resolveAlert,exportAlerts,ackAll,setAckAll,notify}){
  return <><SectionTitle eyebrow="INCIDENT RESPONSE" title="Alert center" desc="Search, filter, triage and export network threat alerts." action={<button className="button secondary" onClick={exportAlerts}><Download size={16}/> Export CSV</button>}/><div className="alert-summary"><div><span className="summary-dot critical-dot"/><b>{alerts.filter(a=>a.level==='CRITICAL').length}</b><small>Critical</small></div><div><span className="summary-dot high-dot"/><b>{alerts.filter(a=>a.level==='HIGH').length}</b><small>High</small></div><div><span className="summary-dot medium-dot"/><b>{alerts.filter(a=>a.level==='MEDIUM').length}</b><small>Medium</small></div><div><span className="summary-dot low-dot"/><b>{alerts.filter(a=>a.level==='LOW').length}</b><small>Low</small></div></div><section className="panel alert-center-panel"><div className="filter-bar"><div className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ID, IP, threat type..."/>{query&&<button onClick={()=>setQuery('')}><X size={14}/></button>}</div><div className="filter-select"><Filter size={15}/><select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}><option value="ALL">All severities</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select><ChevronDown size={13}/></div><button className="button secondary small-button" onClick={()=>{setAckAll(true);notify('Visible alerts marked acknowledged in demo.')}}><CheckCircle2 size={15}/> Acknowledge all</button></div>{ackAll&&<div className="inline-success"><CheckCircle2 size={15}/> Bulk acknowledgement requested in demo mode. Persist this action through the backend after API integration.</div>}<AlertsTable alerts={alerts} resolveAlert={resolveAlert}/><div className="table-bottom"><span>{alerts.length} alerts shown</span><span>Actions are local UI state only until backend connectivity is added.</span></div></section></>
}
function Incidents({alerts,resolveAlert}){
  const open=alerts.filter(a=>a.status!=='Resolved')
  return <><SectionTitle eyebrow="INCIDENT RESPONSE" title="Incident management" desc="Prioritize and track cases created from network alerts." action={<button className="button primary" onClick={()=>window.alert('Incident creation will be connected to FastAPI in the backend step.')}><Siren size={16}/> New incident</button>}/><div className="metrics-grid three"><Metric label="Active incidents" value={open.length} sub="Not yet resolved" icon={Siren} tone="red" trend="Needs review"/><Metric label="Investigating" value={alerts.filter(a=>a.status==='Investigating').length} sub="Analyst assigned" icon={Eye} tone="purple" trend="In progress"/><Metric label="Resolved" value={alerts.filter(a=>a.status==='Resolved').length} sub="Closed in demo" icon={CheckCircle2} tone="green" trend="Completed"/></div><div className="incident-grid">{open.map(a=><div className="incident-card" key={a.id}><div className="incident-top"><span className="incident-icon"><AlertTriangle size={18}/></span><Badge level={a.level}/></div><div className="incident-id">{a.id} · {a.time}</div><h3>{a.type}</h3><p>Traffic from <b>{a.source}</b> to {a.destination} has a risk score of {a.score}/100.</p><div className="incident-meta"><span>Risk score</span><b className={a.score>=76?'score-critical':'score-high'}>{a.score}/100</b></div><div className="incident-progress"><i style={{width:a.score+'%'}}/></div><div className="incident-foot"><span className="status-text">{a.status}</span><button className="row-action" onClick={()=>resolveAlert(a.id)}>Resolve case</button></div></div>)}</div></>
}
function Analytics({alerts}){
  const data=[{name:'Mon',critical:8,high:18,medium:25},{name:'Tue',critical:11,high:22,medium:31},{name:'Wed',critical:6,high:17,medium:29},{name:'Thu',critical:14,high:25,medium:36},{name:'Fri',critical:10,high:20,medium:32},{name:'Sat',critical:5,high:13,medium:18},{name:'Sun',critical:9,high:16,medium:24}]
  return <><SectionTitle eyebrow="SECURITY INTELLIGENCE" title="Security analytics" desc="High-level indicators and category trends for analyst reporting." action={<button className="button secondary" onClick={()=>window.print()}><Download size={16}/> Print report</button>}/><div className="metrics-grid"><Metric label="Alerts in view" value={alerts.length} sub="Current local sample" icon={Bell} tone="pink" trend="Sample"/><Metric label="Critical + high" value={alerts.filter(a=>['CRITICAL','HIGH'].includes(a.level)).length} sub="Prioritized queue" icon={ShieldAlert} tone="red" trend="Review"/><Metric label="Resolved share" value={Math.round(alerts.filter(a=>a.status==='Resolved').length/Math.max(alerts.length,1)*100)+'%'} sub="Demo alert state" icon={CheckCircle2} tone="green" trend="Local state"/><Metric label="Mean risk score" value={Math.round(alerts.reduce((s,a)=>s+a.score,0)/Math.max(alerts.length,1))} sub="Out of 100" icon={Gauge} tone="purple" trend="Sample"/></div><div className="content-grid"><section className="panel"><div className="panel-head"><div><h3>Weekly severity trends</h3><p>Illustrative trend data</p></div></div><div className="chart-area tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid stroke="#282330" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#8b8496',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8b8496',fontSize:11}}/><Tooltip contentStyle={{background:'#17121e',border:'1px solid #3a2b3c',borderRadius:10,color:'#fff'}}/><Bar dataKey="critical" stackId="a" fill="#ff4d5e" radius={[0,0,0,0]}/><Bar dataKey="high" stackId="a" fill="#f34c98"/><Bar dataKey="medium" stackId="a" fill="#a78bfa" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section><section className="panel report-panel"><div className="panel-head"><div><h3>Reporting checklist</h3><p>Suggested items for mentor demo</p></div></div>{['Model metrics: accuracy, precision, recall and F1','Risk scoring formula and severity mapping','Alert prioritization and incident workflow','Dataset streaming begins from row one','Limitations: dataset replay vs live packet capture'].map((x,i)=><div className="check-row" key={x}><CheckCircle2 size={17}/><span>{x}</span></div>)}</section></div></>
}
function ThreatIntel(){return <><SectionTitle eyebrow="THREAT INTELLIGENCE" title="Threat intelligence" desc="A triage workspace for suspicious sources and attack context."/><div className="demo-note"><span className="note-icon"><Globe2 size={16}/></span><div><b>Threat intelligence provider not connected</b><span>This view contains local demo examples only. Do not treat IP reputation or geolocation as verified without a trusted feed.</span></div><span className="demo-tag">PLACEHOLDER</span></div><div className="intel-grid">{[{ip:'45.83.12.104',label:'Reconnaissance pattern',level:'HIGH',detail:'Repeated connection attempts across multiple ports.'},{ip:'185.220.101.5',label:'Botnet-like behavior',level:'CRITICAL',detail:'Repeated high-confidence suspicious flow predictions.'},{ip:'91.214.124.77',label:'Web attack signature',level:'HIGH',detail:'Potential web service probing; validate request logs.'}].map(x=><div className="intel-card" key={x.ip}><div className="intel-icon"><Globe2 size={19}/></div><Badge level={x.level}/><h3>{x.ip}</h3><b>{x.label}</b><p>{x.detail}</p><button className="text-action" onClick={()=>navigator.clipboard?.writeText(x.ip)}>Copy source IP <ArrowUpRight size={14}/></button></div>)}</div></>}
function NetworkFlows({alerts}){return <><SectionTitle eyebrow="NETWORK TELEMETRY" title="Network flows" desc="Inspect flow-level source, destination, classification and calculated risk."/><div className="demo-note"><span className="note-icon"><Network size={16}/></span><div><b>Flow table uses sample events</b><span>After backend integration this table will display scored rows streamed from your UNSW-NB15 or approved CICIDS CSV.</span></div><span className="demo-tag">SAMPLE</span></div><section className="panel recent-panel"><div className="panel-head"><div><h3>Recent flow records</h3><p>Risk values are demonstration data in this frontend-only stage.</p></div></div><AlertsTable alerts={alerts} compact/></section><section className="panel"><h3>Expected CSV streaming behavior</h3><ul className="clean-list"><li>Read the source CSV in fixed-size chunks.</li><li>Apply the same saved preprocessing and model pipeline to every chunk.</li><li>Compute class confidence and severity-based risk scores for each row.</li><li>Send incremental results to the UI with Server-Sent Events (SSE).</li><li>Every new scan starts at row one; keep only the newest ~200 rows on screen.</li></ul></section></>}
function TeamAccess(){return <><SectionTitle eyebrow="ADMINISTRATION" title="Team & access" desc="Frontend placeholder for the authentication and role-based access module."/><div className="demo-note"><span className="note-icon"><LockKeyhole size={16}/></span><div><b>Authentication is not implemented in this frontend-only package</b><span>Real login, JWT validation, analyst/admin roles, audit logs and team management must be enforced by FastAPI, not just hidden in the UI.</span></div></div><section className="panel"><div className="panel-head"><div><h3>Team members (demo)</h3><p>Example roles for the planned platform</p></div><button className="button primary" onClick={()=>window.alert('Connect the backend before adding real users.')}><Users size={16}/> Invite member</button></div><div className="team-row"><div className="user-avatar">SS</div><div><b>Security Analyst</b><small>saisree@example.local</small></div><span className="role-pill">ANALYST</span><span className="ready-text"><i/> Active</span></div><div className="team-row"><div className="user-avatar alt">AD</div><div><b>Platform Admin</b><small>admin@example.local</small></div><span className="role-pill admin">ADMIN</span><span className="ready-text"><i/> Active</span></div></section></>}
function SettingsPage({notify}){const [chunk,setChunk]=useState('500');const [windowRows,setWindowRows]=useState('200');return <><SectionTitle eyebrow="PLATFORM CONFIGURATION" title="Settings" desc="Tune the intended stream behavior and dashboard preferences."/><section className="panel settings-panel"><h3><SquareActivity size={18}/> Streaming configuration</h3><p>These are frontend preferences only until the backend is connected.</p><label>CSV chunk size<select value={chunk} onChange={e=>setChunk(e.target.value)}><option value="250">250 rows</option><option value="500">500 rows</option><option value="1000">1,000 rows</option><option value="2000">2,000 rows</option></select></label><label>Maximum recent rows<select value={windowRows} onChange={e=>setWindowRows(e.target.value)}><option value="100">100 rows</option><option value="200">200 rows</option><option value="300">300 rows</option></select></label><div className="settings-info"><CheckCircle2 size={17}/> Recommended starting point: chunks of 500 rows and a visible window of 200 rows.</div><button className="button primary" onClick={()=>notify(`Demo settings saved: chunk ${chunk}, visible rows ${windowRows}.`)}>Save preferences</button></section><section className="panel settings-panel"><h3><ShieldCheck size={18}/> Backend connection checklist</h3>{['FastAPI health endpoint returns healthy','Three model pipelines and feature schemas load successfully','SSE endpoint streams prediction results','JWT / role permissions enforced server-side','CSV path and chunk reader validated'].map(t=><div className="check-row pending" key={t}><AlertTriangle size={17}/><span>{t}</span><small>Pending</small></div>)}</section></>}
export default App
