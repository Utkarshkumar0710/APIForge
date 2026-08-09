document.getElementById('demo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = document.getElementById('demo-city').value.trim();
  if (!city) return;
  const resultEl = document.getElementById('demo-result');
  resultEl.textContent = 'Fetching demo data...';

  try {
    // Public demo endpoint (to be implemented on backend in later phases)
    const res = await fetch(`/api/demo?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    resultEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    resultEl.textContent = 'Error fetching demo: ' + err.message;
  }
});
