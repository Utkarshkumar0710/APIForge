function showToast(message, timeout = 4000) {
  let container = document.querySelector('.toast');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast';
    document.body.appendChild(container);
  }
  const item = document.createElement('div');
  item.className = 'item';
  item.textContent = message;
  container.appendChild(item);
  setTimeout(()=>{ item.remove(); if (!container.children.length) container.remove(); }, timeout);
}

function showLoading(el) {
  const loader = document.createElement('span');
  loader.className = 'spinner';
  loader.dataset._loader = '1';
  el.disabled = true;
  el._oldText = el.innerHTML;
  el.innerHTML = '';
  el.appendChild(loader);
  return loader;
}

function hideLoading(el) {
  const loader = el.querySelector('[data-_loader]');
  el.disabled = false;
  if (el._oldText) el.innerHTML = el._oldText;
  if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
}

window.apiForgeToast = { showToast, showLoading, hideLoading };
