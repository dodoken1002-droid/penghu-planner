// Shared utilities

const API = '';

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : '✗'}</span> ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function fmt(n) {
  return Number(n || 0).toLocaleString('zh-TW');
}

function statusBadge(s) {
  return `<span class="badge badge-${s}">${s}</span>`;
}

function setActive(navId) {
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const el = document.getElementById(navId);
  if (el) el.classList.add('active');
}
