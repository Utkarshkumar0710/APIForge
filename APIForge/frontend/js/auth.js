// Simple auth helpers
async function getMe() {
  const res = await fetch('/api/auth/me');
  return res.json();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

module.exports = { getMe, logout };
