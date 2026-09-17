const API = 'http://127.0.0.1:8000';
let token = localStorage.getItem('netshield_token');
const $ = (id) => document.getElementById(id);

function showError(message) { $('error').textContent = message; $('error').hidden = false; }
function renderBars(id, values) {
  const max = Math.max(...values.map((item) => item[1]), 1);
  $(id).innerHTML = values.length ? values.map(([label, value]) => `<div class="bar-row"><div class="bar-label"><span>${label}</span><b>${value.toLocaleString()}</b></div><div class="bar-track"><div class="bar-fill" style="width:${(value / max) * 100}%"></div></div></div>`).join('') : '<span>No observations returned.</span>';
}
async function request(path, options = {}) {
  const response = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) throw new Error((await response.json()).detail || `Request failed (${response.status})`);
  return response.json();
}
async function loadDashboard() {
  $('loading').textContent = 'Loading local telemetry...';
  try {
    const data = await request('/api/traffic/analytics');
    $('total').textContent = (data.total_records_sampled || 0).toLocaleString(); $('normal').textContent = (data.normal_records || 0).toLocaleString(); $('anomalous').textContent = (data.anomalous_records || 0).toLocaleString(); $('model').textContent = data.model_ready ? 'READY' : 'NOT TRAINED'; $('dataset-status').textContent = data.status.toUpperCase(); renderBars('attacks', data.attack_distribution || []); renderBars('protocols', data.protocol_distribution || []); $('dashboard').hidden = false; $('loading').hidden = true; $('connection').textContent = 'Connected'; $('connection').classList.add('online');
  } catch (error) { showError(error.message); $('loading').textContent = 'Unable to load telemetry.'; }
}
$('auth-form').addEventListener('submit', async (event) => { event.preventDefault(); $('auth-message').textContent = ''; const credentials = { email: $('email').value, password: $('password').value }; try { let response = await fetch(`${API}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(credentials) }); if (!response.ok) response = await fetch(`${API}/api/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(credentials) }); if (!response.ok) throw new Error((await response.json()).detail); token = (await response.json()).access_token; localStorage.setItem('netshield_token', token); await loadDashboard(); } catch (error) { $('auth-message').textContent = error.message; } });
$('refresh').addEventListener('click', loadDashboard);
if (token) loadDashboard();