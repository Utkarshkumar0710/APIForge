const state = { user: null, usage: null, invoices: [], weather: null, loading: false };

function setLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.dataset.label = button.dataset.label || button.innerHTML;
  button.innerHTML = loading ? '<span class="spinner"></span>' : button.dataset.label;
}

function showToast(message, type = 'info') {
  if (window.apiForgeToast && window.apiForgeToast.showToast) {
    window.apiForgeToast.showToast(message);
    return;
  }
  alert(message);
}

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function bootstrap() {
  try {
    const me = await api('/api/auth/me');
    state.user = me.user;
    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = me.user.full_name; });
    document.querySelectorAll('[data-user-email]').forEach((el) => { el.textContent = me.user.email; });
    document.querySelectorAll('[data-user-id]').forEach((el) => { el.textContent = me.user.id; });
    document.querySelectorAll('[data-api-key-status]').forEach((el) => { el.textContent = me.user.api_key ? 'Active' : 'Not generated'; });
    if (document.getElementById('masked-api-key')) {
      document.getElementById('masked-api-key').textContent = me.user.api_key ? me.user.api_key : 'Not available';
    }
    if (document.getElementById('account-created')) {
      document.getElementById('account-created').textContent = new Date(me.user.created_at).toLocaleDateString();
    }
    await refreshDashboard();
  } catch (err) {
    if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
      window.location.href = '/login.html';
    }
  }
}

function maskKey(key) {
  if (!key) return 'Not available';
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

async function refreshDashboard() {
  const usage = await api('/api/usage/summary');
  state.usage = usage;
  updateUsageCards(usage);
  const recent = await api('/api/usage/recent');
  renderRecentActivity(recent.recent || []);
  const invoicesData = await api('/api/invoices');
  state.invoices = invoicesData.invoices || [];
  renderInvoices(state.invoices);
}

function updateUsageCards(usage) {
  const cards = [
    ['calls-card', usage.monthly],
    ['remaining-card', usage.remaining],
    ['usage-card', `${usage.percent}%`],
    ['bill-card', '$0.00'],
  ];
  for (const [id, value] of cards) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  const bar = document.getElementById('usage-bar');
  if (bar) bar.style.width = `${Math.min(usage.percent, 100)}%`;
  const totalEl = document.getElementById('total-calls');
  if (totalEl) totalEl.textContent = usage.total;
  const todayEl = document.getElementById('today-calls');
  if (todayEl) todayEl.textContent = usage.today;
  const monthlyEl = document.getElementById('monthly-calls');
  if (monthlyEl) monthlyEl.textContent = usage.monthly;
  const remainingEl = document.getElementById('remaining-requests');
  if (remainingEl) remainingEl.textContent = usage.remaining;
  const usagePercentEl = document.getElementById('usage-percent');
  if (usagePercentEl) usagePercentEl.textContent = `${usage.percent}%`;
}

function renderRecentActivity(items) {
  const container = document.getElementById('recent-activity');
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="empty-state">No activity yet. Run your first real API request to see it here.</div>';
    return;
  }
  container.innerHTML = items.slice(0, 6).map((item) => `
    <div class="activity-item">
      <div>
        <div class="activity-title">${item.endpoint}</div>
        <div class="activity-meta">${item.request_input ? item.request_input : 'No input'}</div>
      </div>
      <div class="activity-status ${item.response_status >= 200 && item.response_status < 300 ? 'success' : 'error'}">${item.response_status}</div>
    </div>
  `).join('');
}

function renderInvoices(invoices) {
  const container = document.getElementById('invoice-list');
  if (!container) return;
  if (!invoices.length) {
    container.innerHTML = '<div class="empty-state">No invoices yet. Your first invoice will appear after the next billing cycle.</div>';
    return;
  }
  container.innerHTML = invoices.slice(0, 5).map((invoice) => `
    <div class="invoice-item">
      <div>
        <div class="invoice-id">${invoice.invoice_number}</div>
        <div class="invoice-meta">${invoice.billing_period} • ${invoice.total_requests} calls</div>
      </div>
      <div class="invoice-actions">
        <span class="pill">${invoice.status}</span>
        <a class="ghost-link" href="/api/invoices/${invoice.id}/download">Download</a>
      </div>
    </div>
  `).join('');
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const confirmPassword = form.querySelector('[name="confirm_password"]').value;
  const fullName = form.querySelector('[name="full_name"]').value.trim();
  const company = form.querySelector('[name="company"]').value.trim();
  const messageEl = document.getElementById('form-message');
  if (!fullName || !email || !password || !confirmPassword) {
    messageEl.textContent = 'Please complete all required fields.';
    messageEl.className = 'form-message error';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    messageEl.textContent = 'Please enter a valid email address.';
    messageEl.className = 'form-message error';
    return;
  }
  if (password.length < 8) {
    messageEl.textContent = 'Password must be at least 8 characters.';
    messageEl.className = 'form-message error';
    return;
  }
  if (password !== confirmPassword) {
    messageEl.textContent = 'Passwords do not match.';
    messageEl.className = 'form-message error';
    return;
  }
  try {
    setLoading(submitButton, true);
    const data = await api('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, phone: company || '', password, confirm_password: confirmPassword })
    });
    messageEl.textContent = data.message || 'Account created successfully.';
    messageEl.className = 'form-message success';
    setTimeout(() => window.location.href = '/login.html', 800);
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'form-message error';
  } finally {
    setLoading(submitButton, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const messageEl = document.getElementById('form-message');
  try {
    setLoading(submitButton, true);
    const data = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    messageEl.textContent = data.message || 'Signed in successfully.';
    messageEl.className = 'form-message success';
    setTimeout(() => window.location.href = '/dashboard.html', 600);
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'form-message error';
  } finally {
    setLoading(submitButton, false);
  }
}

async function handleWeatherPlayground(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const city = form.querySelector('[name="city"]').value.trim();
  const apiKey = form.querySelector('[name="apiKey"]').value.trim();
  const output = document.getElementById('playground-output');
  const statusEl = document.getElementById('playground-status');
  const timeEl = document.getElementById('playground-time');
  const usageEl = document.getElementById('playground-usage');
  if (!city) {
    showToast('Please enter a city');
    return;
  }
  try {
    setLoading(form.querySelector('button[type="submit"]'), true);
    const started = Date.now();
    const data = await api(`/api/v1/weather?city=${encodeURIComponent(city)}`, { headers: { 'X-API-Key': apiKey || state.user?.api_key || '' } });
    const elapsed = Date.now() - started;
    output.textContent = JSON.stringify(data, null, 2);
    statusEl.textContent = '200 OK';
    timeEl.textContent = `${elapsed} ms`;
    const usage = await api('/api/usage/stats');
    usageEl.textContent = `${usage.used}/${usage.limit}`;
    showToast('Real weather request completed');
  } catch (err) {
    output.textContent = JSON.stringify({ error: err.message }, null, 2);
    statusEl.textContent = 'Request failed';
    timeEl.textContent = '—';
    usageEl.textContent = '—';
    showToast(err.message);
  } finally {
    setLoading(form.querySelector('button[type="submit"]'), false);
  }
}

async function handleLogout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (err) {}
  window.location.href = '/login.html';
}

function attachEvents() {
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('playground-form')?.addEventListener('submit', handleWeatherPlayground);
  document.querySelectorAll('[data-logout]').forEach((el) => el.addEventListener('click', handleLogout));
  document.querySelectorAll('[data-show-password]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const target = document.querySelector(toggle.dataset.showPassword);
      if (!target) return;
      const isPassword = target.type === 'password';
      target.type = isPassword ? 'text' : 'password';
      toggle.textContent = isPassword ? 'Hide' : 'Show';
    });
  });
  document.querySelectorAll('[data-scroll]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.querySelector(el.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  if (document.body.dataset.page === 'dashboard') {
    bootstrap();
  }
});
