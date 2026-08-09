async function loadProfile() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!res.ok) { window.location.href = '/login.html'; return; }
    document.getElementById('name').textContent = data.user.full_name;
    document.getElementById('email').textContent = data.user.email;
    document.getElementById('apiKey').textContent = data.user.api_key;
    document.getElementById('welcome').textContent = `Welcome, ${data.user.full_name}`;
  } catch (err) { window.location.href = '/login.html'; }
}

async function loadUsage() {
  try {
    const res = await fetch('/api/usage/stats');
    const j = await res.json();
    if (!res.ok) return;
    document.getElementById('usage').textContent = `${j.used} / ${j.limit}`;
    const pct = Math.round((j.used / j.limit) * 100);
    const bar = document.getElementById('usage-bar');
    bar.style.width = `${pct}%`;
  } catch (e){}
}

async function loadRecent() {
  try {
    const res = await fetch('/api/usage/recent');
    const j = await res.json();
    if (!res.ok) return;
    const table = document.getElementById('recent-table');
    table.innerHTML = j.recent.map(r=>`<tr><td>${r.endpoint}</td><td>${r.response_status}</td><td>${new Date(r.requested_at).toLocaleString()}</td><td>${r.response_time_ms} ms</td></tr>`).join('');
  } catch (e){}
}

async function fetchWeatherByApi() {
  const city = document.getElementById('city-input').value.trim();
  if (!city) return alert('Enter a city');
  const apiKey = document.getElementById('apiKey').textContent;
  try {
    const btn = document.getElementById('fetchApiBtn');
    const loader = window.apiForgeToast.showLoading ? window.apiForgeToast.showLoading(btn) : null;
    const res = await fetch(`/api/v1/weather?city=${encodeURIComponent(city)}`, { headers: { 'X-API-Key': apiKey } });
    const j = await res.json();
    if (!res.ok) return window.apiForgeToast.showToast(j.message || 'Error');
    document.getElementById('weather-result').textContent = JSON.stringify(j, null, 2);
    loadUsage(); loadRecent();
    window.apiForgeToast.showToast('Weather fetched');
    if (loader && window.apiForgeToast.hideLoading) window.apiForgeToast.hideLoading(btn);
  } catch (err) { alert('Error: '+err.message); }
}

async function fetchWeatherFromDashboard() {
  const city = document.getElementById('city-input').value.trim();
  if (!city) return alert('Enter a city');
  try {
    const btn = document.getElementById('fetchDashBtn');
    const loader = window.apiForgeToast.showLoading ? window.apiForgeToast.showLoading(btn) : null;
    const res = await fetch('/api/dashboard/weather', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city }) });
    const j = await res.json();
    if (!res.ok) return window.apiForgeToast.showToast(j.message || 'Error');
    document.getElementById('weather-result').textContent = JSON.stringify(j, null, 2);
    loadUsage(); loadRecent();
    window.apiForgeToast.showToast('Weather fetched');
    if (loader && window.apiForgeToast.hideLoading) window.apiForgeToast.hideLoading(btn);
  } catch (err) { alert('Error: '+err.message); }
}

function copyApiKey() {
  const key = document.getElementById('apiKey').textContent;
  navigator.clipboard.writeText(key).then(()=> window.apiForgeToast.showToast('API Key copied'));
}

document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

document.getElementById('fetchApiBtn')?.addEventListener('click', fetchWeatherByApi);
document.getElementById('fetchDashBtn')?.addEventListener('click', fetchWeatherFromDashboard);
document.getElementById('copyKeyBtn')?.addEventListener('click', copyApiKey);

loadProfile(); loadUsage(); loadRecent();
