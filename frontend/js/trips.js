let allTrips = [];

async function init() {
  setActive('nav-trips');
  await loadTrips();
  document.getElementById('filter-status').addEventListener('change', renderTrips);
  document.getElementById('search-input').addEventListener('input', renderTrips);
}

async function loadTrips() {
  allTrips = await apiFetch('/api/trips');
  renderTrips();
}

function renderTrips() {
  const statusFilter = document.getElementById('filter-status').value;
  const search = document.getElementById('search-input').value.trim().toLowerCase();

  let filtered = allTrips;
  if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
  if (search) filtered = filtered.filter(t =>
    t.customer_name.toLowerCase().includes(search) ||
    t.customer_phone.includes(search)
  );

  const tbody = document.getElementById('trips-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:32px">尚無資料</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td>#${t.id}</td>
        <td><strong>${t.customer_name || '—'}</strong><br><small class="text-muted">${t.customer_phone || ''}</small></td>
        <td>${t.trip_date || '—'}</td>
        <td>${t.days} 天 ${t.days - 1} 夜</td>
        <td>${t.adults}大${t.children > 0 ? t.children + '小' : ''}${t.seniors > 0 ? t.seniors + '敬老' : ''}</td>
        <td>$${fmt(t.cost_subtotal)}</td>
        <td><strong style="color:var(--ocean)">$${fmt(t.final_quote)}</strong><br><small class="text-muted">每人 $${fmt(t.quote_per_person)}</small></td>
        <td>${statusBadge(t.status)}</td>
        <td>
          <div class="actions">
            <a href="/quote?id=${t.id}" class="btn btn-primary btn-sm">報價單</a>
            <a href="/?id=${t.id}" class="btn btn-outline btn-sm">編輯</a>
            <button class="btn btn-danger btn-sm" onclick="deleteTrip(${t.id})">刪除</button>
          </div>
        </td>
      </tr>`).join('');
  }

  // 更新統計數字
  const total     = allTrips.length;
  const quoting   = allTrips.filter(t => t.status === '報價中').length;
  const confirmed = allTrips.filter(t => t.status === '確認').length;
  const revenue   = allTrips.filter(t => t.status === '確認').reduce((s, t) => s + t.final_quote, 0);
  const se = id => document.getElementById(id);
  if (se('stat-total'))     se('stat-total').textContent     = total;
  if (se('stat-quoting'))   se('stat-quoting').textContent   = quoting;
  if (se('stat-confirmed')) se('stat-confirmed').textContent = confirmed;
  if (se('stat-revenue'))   se('stat-revenue').textContent   = '$' + fmt(revenue);
}

async function deleteTrip(id) {
  if (!confirm('確定要刪除這筆行程嗎？')) return;
  try {
    await apiFetch(`/api/trips/${id}`, { method: 'DELETE' });
    toast('已刪除');
    await loadTrips();
  } catch (e) {
    toast('刪除失敗', 'error');
  }
}

window.addEventListener('DOMContentLoaded', init);
