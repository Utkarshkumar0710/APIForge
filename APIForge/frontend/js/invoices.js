async function loadInvoices() {
  try {
    const res = await fetch('/api/invoices');
    const data = await res.json();
    if (!res.ok) { window.apiForgeToast.showToast('Cannot load invoices: ' + (data.message || '')); return; }
    const list = document.getElementById('invoices-list');
    if (!data.invoices.length) list.innerHTML = '<p>No invoices yet.</p>';
    else {
      list.innerHTML = '<table><tr><th>Invoice</th><th>Date</th><th>Requests</th><th>Amount</th><th>Actions</th></tr>' + data.invoices.map(i=>`<tr><td>${i.invoice_number}</td><td>${new Date(i.created_at).toLocaleString()}</td><td>${i.total_requests}</td><td>₹${i.total_amount}</td><td><a href="/api/invoices/${i.id}/download">Download</a> <button data-id="${i.id}" class="emailBtn">Email</button></td></tr>`).join('') + '</table>';
      document.querySelectorAll('.emailBtn').forEach(b=>b.addEventListener('click', async (e)=>{
        const id = e.target.dataset.id;
        const btn = e.target;
        const loader = window.apiForgeToast.showLoading ? window.apiForgeToast.showLoading(btn) : null;
        const r = await fetch(`/api/invoices/${id}/email`, { method: 'POST' });
        const j = await r.json();
        window.apiForgeToast.showToast(j.message || (j.success ? 'Emailed' : 'Failed'));
        if (loader && window.apiForgeToast.hideLoading) window.apiForgeToast.hideLoading(btn);
      }));
    }
  } catch (err) { alert('Error: ' + err.message); }
}

document.getElementById('generateBtn').addEventListener('click', async ()=>{
  try {
    const btn = document.getElementById('generateBtn');
    const loader = window.apiForgeToast.showLoading ? window.apiForgeToast.showLoading(btn) : null;
    const res = await fetch('/api/invoices/generate', { method: 'POST' });
    const j = await res.json();
    if (res.ok && j.success) { window.apiForgeToast.showToast('Invoice generated: ' + j.invoice.invoice_number); loadInvoices(); }
    else window.apiForgeToast.showToast('Failed: ' + (j.message||'Unknown'));
    if (loader && window.apiForgeToast.hideLoading) window.apiForgeToast.hideLoading(btn);
  } catch (err) { alert('Error: ' + err.message); }
});

loadInvoices();
