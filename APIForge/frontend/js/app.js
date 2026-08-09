const state = {
  user: null,
  usage: null,
  invoices: [],
  weather: null,
  loading: false,
  refreshTimer: null,
};

// ----------------------------------------------------
// Loading button
// ----------------------------------------------------
function setLoading(button, loading) {
  if (!button) return;

  button.disabled = loading;

  if (!button.dataset.label) {
    button.dataset.label = button.innerHTML;
  }

  button.innerHTML = loading
    ? '<span class="spinner"></span>'
    : button.dataset.label;
}

// ----------------------------------------------------
// Toast
// ----------------------------------------------------
function showToast(message, type = 'info') {
  if (window.apiForgeToast && window.apiForgeToast.showToast) {
    window.apiForgeToast.showToast(message, type);
    return;
  }

  alert(message);
}

// ----------------------------------------------------
// API helper
// ----------------------------------------------------
async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message ||
      data.error ||
      'Request failed'
    );
  }

  return data;
}

// ----------------------------------------------------
// Bootstrap dashboard
// ----------------------------------------------------
async function bootstrap() {
  try {
    const me = await api('/api/auth/me');

    state.user = me.user;

    // User name
    document
      .querySelectorAll('[data-user-name]')
      .forEach((el) => {
        el.textContent = me.user.full_name || 'Developer';
      });

    // Email
    document
      .querySelectorAll('[data-user-email]')
      .forEach((el) => {
        el.textContent = me.user.email || '';
      });

    // User ID
    document
      .querySelectorAll('[data-user-id]')
      .forEach((el) => {
        el.textContent = me.user.id || '';
      });

    // API status
    document
      .querySelectorAll('[data-api-key-status]')
      .forEach((el) => {
        el.textContent = me.user.api_key
          ? 'Active'
          : 'Not generated';
      });

    // ------------------------------------------------
    // SHOW FULL API KEY
    // ------------------------------------------------
    const apiKeyElement =
      document.getElementById('masked-api-key');

    if (apiKeyElement) {
      apiKeyElement.textContent =
        me.user.api_key || 'Not available';
    }

    // Account creation date
    const accountCreated =
      document.getElementById('account-created');

    if (accountCreated && me.user.created_at) {
      accountCreated.textContent =
        new Date(me.user.created_at)
          .toLocaleDateString();
    }

    // Automatically put user's API key in playground
    const apiKeyInput =
      document.querySelector(
        '#playground-form [name="apiKey"]'
      );

    if (apiKeyInput && me.user.api_key) {
      apiKeyInput.value = me.user.api_key;
    }

    // Initial dashboard refresh
    await refreshDashboard();

    // Start automatic live updates
    startLiveRefresh();

  } catch (err) {

    console.error('Bootstrap error:', err);

    if (
      window.location.pathname !== '/login.html' &&
      window.location.pathname !== '/register.html'
    ) {
      window.location.href = '/login.html';
    }
  }
}

// ----------------------------------------------------
// LIVE DASHBOARD REFRESH
// ----------------------------------------------------
function startLiveRefresh() {

  // Prevent duplicate timers
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
  }

  state.refreshTimer = setInterval(async () => {

    // Don't refresh when tab is hidden
    if (document.hidden) return;

    try {
      await refreshDashboard();
    } catch (err) {
      console.error(
        'Automatic dashboard refresh failed:',
        err
      );
    }

  }, 5000);
}

// ----------------------------------------------------
// Stop live refresh
// ----------------------------------------------------
function stopLiveRefresh() {

  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

// ----------------------------------------------------
// Refresh everything
// ----------------------------------------------------
async function refreshDashboard() {

  try {

    const [
      usage,
      recent,
      invoicesData
    ] = await Promise.all([
      api('/api/usage/summary'),
      api('/api/usage/recent'),
      api('/api/invoices')
    ]);

    // Save state
    state.usage = usage;
    state.invoices = invoicesData.invoices || [];

    // Update UI
    updateUsageCards(usage);

    renderRecentActivity(
      recent.recent || []
    );

    renderInvoices(
      state.invoices
    );

  } catch (err) {

    console.error(
      'Dashboard refresh error:',
      err
    );

    throw err;
  }
}

// ----------------------------------------------------
// Usage cards
// ----------------------------------------------------
function updateUsageCards(usage) {

  const cards = [
    ['calls-card', usage.monthly ?? 0],
    ['remaining-card', usage.remaining ?? 0],
    ['usage-card', `${usage.percent ?? 0}%`],
    ['bill-card', '$0.00'],
  ];

  for (const [id, value] of cards) {

    const el = document.getElementById(id);

    if (el) {
      el.textContent = value;
    }
  }

  // Progress bar
  const bar =
    document.getElementById('usage-bar');

  if (bar) {

    const percent =
      Number(usage.percent || 0);

    bar.style.width =
      `${Math.min(percent, 100)}%`;
  }

  // Total calls
  const totalEl =
    document.getElementById('total-calls');

  if (totalEl) {
    totalEl.textContent =
      usage.total ?? 0;
  }

  // Today
  const todayEl =
    document.getElementById('today-calls');

  if (todayEl) {
    todayEl.textContent =
      usage.today ?? 0;
  }

  // Monthly
  const monthlyEl =
    document.getElementById('monthly-calls');

  if (monthlyEl) {
    monthlyEl.textContent =
      usage.monthly ?? 0;
  }

  // Remaining
  const remainingEl =
    document.getElementById(
      'remaining-requests'
    );

  if (remainingEl) {
    remainingEl.textContent =
      usage.remaining ?? 0;
  }

  // Percentage
  const usagePercentEl =
    document.getElementById(
      'usage-percent'
    );

  if (usagePercentEl) {
    usagePercentEl.textContent =
      `${usage.percent ?? 0}%`;
  }

  // Current bill
  const billAmount =
    document.getElementById(
      'bill-amount'
    );

  if (billAmount) {

    const amount =
      usage.total_amount ??
      usage.bill ??
      0;

    billAmount.textContent =
      `$${Number(amount).toFixed(2)}`;
  }
}

// ----------------------------------------------------
// Recent activity
// ----------------------------------------------------
function renderRecentActivity(items) {

  const container =
    document.getElementById(
      'recent-activity'
    );

  if (!container) return;

  if (!items.length) {

    container.innerHTML =
      '<div class="empty-state">' +
      'No activity yet. Run your first real API request to see it here.' +
      '</div>';

    return;
  }

  container.innerHTML =
    items
      .slice(0, 6)
      .map((item) => {

        const status =
          Number(item.response_status);

        const success =
          status >= 200 &&
          status < 300;

        return `
          <div class="activity-item">

            <div>
              <div class="activity-title">
                ${escapeHtml(
                  item.endpoint || 'API Request'
                )}
              </div>

              <div class="activity-meta">
                ${escapeHtml(
                  item.request_input || 'No input'
                )}
              </div>
            </div>

            <div class="activity-status ${
              success ? 'success' : 'error'
            }">
              ${status || '—'}
            </div>

          </div>
        `;

      })
      .join('');
}

// ----------------------------------------------------
// Invoices
// ----------------------------------------------------
function renderInvoices(invoices) {

  const container =
    document.getElementById(
      'invoice-list'
    );

  if (!container) return;

  if (!invoices.length) {

    container.innerHTML =
      '<div class="empty-state">' +
      'No invoices yet.' +
      '</div>';

    return;
  }

  container.innerHTML =
    invoices
      .slice(0, 5)
      .map((invoice) => {

        return `
          <div class="invoice-item">

            <div>

              <div class="invoice-id">
                ${escapeHtml(
                  invoice.invoice_number
                )}
              </div>

              <div class="invoice-meta">
                ${escapeHtml(
                  invoice.billing_period || ''
                )}
                •
                ${invoice.total_requests || 0}
                calls
              </div>

            </div>

            <div class="invoice-actions">

              <span class="pill">
                ${escapeHtml(
                  invoice.status || 'FREE'
                )}
              </span>

              <a
                class="ghost-link"
                href="/api/invoices/${invoice.id}/download"
              >
                Download
              </a>

            </div>

          </div>
        `;

      })
      .join('');
}

// ----------------------------------------------------
// Safe HTML helper
// ----------------------------------------------------
function escapeHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// REGISTER
// ----------------------------------------------------
async function handleRegister(event) {

  event.preventDefault();

  const form = event.currentTarget;

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  const email =
    form.querySelector(
      '[name="email"]'
    ).value.trim();

  const password =
    form.querySelector(
      '[name="password"]'
    ).value;

  const confirmPassword =
    form.querySelector(
      '[name="confirm_password"]'
    ).value;

  const fullName =
    form.querySelector(
      '[name="full_name"]'
    ).value.trim();

  const companyInput =
    form.querySelector(
      '[name="company"]'
    );

  const company =
    companyInput
      ? companyInput.value.trim()
      : '';

  const messageEl =
    document.getElementById(
      'form-message'
    );

  if (
    !fullName ||
    !email ||
    !password ||
    !confirmPassword
  ) {

    messageEl.textContent =
      'Please complete all required fields.';

    messageEl.className =
      'form-message error';

    return;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {

    messageEl.textContent =
      'Please enter a valid email address.';

    messageEl.className =
      'form-message error';

    return;
  }

  if (password.length < 8) {

    messageEl.textContent =
      'Password must be at least 8 characters.';

    messageEl.className =
      'form-message error';

    return;
  }

  if (password !== confirmPassword) {

    messageEl.textContent =
      'Passwords do not match.';

    messageEl.className =
      'form-message error';

    return;
  }

  try {

    setLoading(
      submitButton,
      true
    );

    const data =
      await api(
        '/api/auth/register',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            full_name: fullName,
            email,
            phone: company || '',
            password,
            confirm_password:
              confirmPassword
          })
        }
      );

    messageEl.textContent =
      data.message ||
      'Account created successfully.';

    messageEl.className =
      'form-message success';

    setTimeout(
      () => {
        window.location.href =
          '/login.html';
      },
      800
    );

  } catch (err) {

    messageEl.textContent =
      err.message;

    messageEl.className =
      'form-message error';

  } finally {

    setLoading(
      submitButton,
      false
    );
  }
}

// ----------------------------------------------------
// LOGIN
// ----------------------------------------------------
async function handleLogin(event) {

  event.preventDefault();

  const form = event.currentTarget;

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  const email =
    form.querySelector(
      '[name="email"]'
    ).value.trim();

  const password =
    form.querySelector(
      '[name="password"]'
    ).value;

  const messageEl =
    document.getElementById(
      'form-message'
    );

  try {

    setLoading(
      submitButton,
      true
    );

    const data =
      await api(
        '/api/auth/login',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            email,
            password
          })
        }
      );

    messageEl.textContent =
      data.message ||
      'Signed in successfully.';

    messageEl.className =
      'form-message success';

    setTimeout(
      () => {
        window.location.href =
          '/dashboard.html';
      },
      600
    );

  } catch (err) {

    messageEl.textContent =
      err.message;

    messageEl.className =
      'form-message error';

  } finally {

    setLoading(
      submitButton,
      false
    );
  }
}

// ----------------------------------------------------
// WEATHER / API PLAYGROUND
// ----------------------------------------------------
async function handleWeatherPlayground(event) {

  event.preventDefault();

  const form =
    event.currentTarget;

  const city =
    form.querySelector(
      '[name="city"]'
    ).value.trim();

  const apiKeyInput =
    form.querySelector(
      '[name="apiKey"]'
    );

  const apiKey =
    apiKeyInput
      ? apiKeyInput.value.trim()
      : '';

  const output =
    document.getElementById(
      'playground-output'
    );

  const statusEl =
    document.getElementById(
      'playground-status'
    );

  const timeEl =
    document.getElementById(
      'playground-time'
    );

  const usageEl =
    document.getElementById(
      'playground-usage'
    );

  if (!city) {

    showToast(
      'Please enter a city'
    );

    return;
  }

  try {

    const button =
      form.querySelector(
        'button[type="submit"]'
      );

    setLoading(
      button,
      true
    );

    const started =
      Date.now();

    // Use entered key, otherwise logged-in user's key
    const requestKey =
      apiKey ||
      state.user?.api_key ||
      '';

    const data =
      await api(
        `/api/v1/weather?city=${encodeURIComponent(city)}`,
        {
          headers: {
            'X-API-Key':
              requestKey
          }
        }
      );

    const elapsed =
      Date.now() - started;

    // Save weather response
    state.weather = data;

    // Show response
    if (output) {
      output.textContent =
        JSON.stringify(
          data,
          null,
          2
        );
    }

    // Status
    if (statusEl) {
      statusEl.textContent =
        '200 OK';
    }

    // Response time
    if (timeEl) {
      timeEl.textContent =
        `${elapsed} ms`;
    }

    // Get latest usage
    try {

      const usage =
        await api(
          '/api/usage/stats'
        );

      if (usageEl) {

        usageEl.textContent =
          `${usage.used}/${usage.limit}`;
      }

    } catch (usageError) {

      console.error(
        'Usage stats error:',
        usageError
      );
    }

    // ------------------------------------------------
    // IMPORTANT:
    // Immediately update complete dashboard
    // WITHOUT PAGE REFRESH
    // ------------------------------------------------
    await refreshDashboard();

    showToast(
      'Real API request completed successfully'
    );

  } catch (err) {

    console.error(
      'Weather request error:',
      err
    );

    if (output) {

      output.textContent =
        JSON.stringify(
          {
            error:
              err.message
          },
          null,
          2
        );
    }

    if (statusEl) {
      statusEl.textContent =
        'Request failed';
    }

    if (timeEl) {
      timeEl.textContent =
        '—';
    }

    if (usageEl) {
      usageEl.textContent =
        '—';
    }

    showToast(
      err.message,
      'error'
    );

  } finally {

    setLoading(
      form.querySelector(
        'button[type="submit"]'
      ),
      false
    );
  }
}

// ----------------------------------------------------
// LOGOUT
// ----------------------------------------------------
async function handleLogout() {

  stopLiveRefresh();

  try {

    await api(
      '/api/auth/logout',
      {
        method: 'POST'
      }
    );

  } catch (err) {

    console.error(
      'Logout error:',
      err
    );
  }

  window.location.href =
    '/login.html';
}

// ----------------------------------------------------
// EVENTS
// ----------------------------------------------------
function attachEvents() {

  document
    .getElementById(
      'register-form'
    )
    ?.addEventListener(
      'submit',
      handleRegister
    );

  document
    .getElementById(
      'login-form'
    )
    ?.addEventListener(
      'submit',
      handleLogin
    );

  document
    .getElementById(
      'playground-form'
    )
    ?.addEventListener(
      'submit',
      handleWeatherPlayground
    );

  document
    .querySelectorAll(
      '[data-logout]'
    )
    .forEach(
      (el) => {

        el.addEventListener(
          'click',
          handleLogout
        );

      }
    );

  // Show / hide passwords
  document
    .querySelectorAll(
      '[data-show-password]'
    )
    .forEach(
      (toggle) => {

        toggle.addEventListener(
          'click',
          () => {

            const target =
              document.querySelector(
                toggle.dataset.showPassword
              );

            if (!target) return;

            const isPassword =
              target.type ===
              'password';

            target.type =
              isPassword
                ? 'text'
                : 'password';

            toggle.textContent =
              isPassword
                ? 'Hide'
                : 'Show';
          }
        );
      }
    );

  // Smooth scrolling
  document
    .querySelectorAll(
      '[data-scroll]'
    )
    .forEach(
      (el) => {

        el.addEventListener(
          'click',
          (event) => {

            event.preventDefault();

            const target =
              document.querySelector(
                el.getAttribute(
                  'href'
                )
              );

            if (target) {

              target.scrollIntoView({
                behavior:
                  'smooth'
              });

            }
          }
        );
      }
    );
}

// ----------------------------------------------------
// PAGE LOAD
// ----------------------------------------------------
window.addEventListener(
  'DOMContentLoaded',
  () => {

    attachEvents();

    if (
      document.body.dataset.page ===
      'dashboard'
    ) {

      bootstrap();
    }
  }
);

// ----------------------------------------------------
// Clean up timer when leaving page
// ----------------------------------------------------
window.addEventListener(
  'beforeunload',
  () => {
    stopLiveRefresh();
  }
);