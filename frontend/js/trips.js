
let allTrips = [];
let activeBookingTripId = null;

const BOOKING_CATEGORIES = ['itinerary', 'transportation', 'accommodation'];

async function init() {
  await requirePage(['admin', 'viewer']);
  setActive('nav-trips');
  await loadTrips();
  document.getElementById('filter-status').addEventListener('change', renderTrips);
  document.getElementById('filter-booking').addEventListener('change', renderTrips);
  document.getElementById('search-input').addEventListener('input', renderTrips);
  document.getElementById('booking-modal-overlay').addEventListener('click', event => {
    if (event.target.id === 'booking-modal-overlay') closeBookingChecklist();
  });
}

async function loadTrips() {
  allTrips = await apiFetch('/api/trips');
  renderTrips();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bookingSummaryBadge(summary = {}) {
  const status = summary.status || 'pending';
  const labels = {
    pending: '待確認',
    partial: '部分完成',
    complete: '全部完成',
  };
  const count = summary.confirmed_count || 0;
  const total = summary.total_count || BOOKING_CATEGORIES.length;
  return `<span class="booking-status booking-status-${status}">${labels[status]} ${count}/${total}</span>`;
}

function renderTrips() {
  const statusFilter = document.getElementById('filter-status').value;
  const bookingFilter = document.getElementById('filter-booking').value;
  const search = document.getElementById('search-input').value.trim().toLowerCase();

  let filtered = allTrips;
  if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
  if (bookingFilter) {
    filtered = filtered.filter(t => (t.booking_summary?.status || 'pending') === bookingFilter);
  }
  if (search) filtered = filtered.filter(t =>
    t.customer_name.toLowerCase().includes(search) ||
    t.customer_phone.includes(search)
  );

  const tbody = document.getElementById('trips-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:32px">尚無資料</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td>#${t.id}</td>
        <td><strong>${escapeHtml(t.customer_name || '—')}</strong><br><small class="text-muted">${escapeHtml(t.customer_phone || '')}</small></td>
        <td>${escapeHtml(t.trip_date || '—')}</td>
        <td>${t.days} 天 ${t.days - 1} 夜</td>
        <td>${t.adults}大${t.children > 0 ? t.children + '小' : ''}${t.seniors > 0 ? t.seniors + '敬老' : ''}</td>
        <td>$${fmt(t.cost_subtotal)}</td>
        <td><strong style="color:var(--ocean)">$${fmt(t.final_quote)}</strong><br><small class="text-muted">每人 $${fmt(t.quote_per_person)}</small></td>
        <td>${bookingSummaryBadge(t.booking_summary)}</td>
        <td>${statusBadge(t.status)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-success btn-sm" onclick="openBookingChecklist(${t.id})">出團確認</button>
            <a href="/quote?id=${t.id}" class="btn btn-primary btn-sm">報價單</a>
            <a href="/?id=${t.id}" class="btn btn-outline btn-sm">編輯</a>
            <button class="btn btn-outline btn-sm" onclick="copyTrip(${t.id})" style="border-color:var(--warning);color:var(--warning)">複製</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTrip(${t.id})">刪除</button>
          </div>
        </td>
      </tr>`).join('');
  }

  const total     = allTrips.length;
  const quoting   = allTrips.filter(t => t.status === '報價中').length;
  const confirmed = allTrips.filter(t => t.status === '確認').length;
  const revenue   = allTrips.filter(t => t.status === '確認').reduce((sum, t) => sum + t.final_quote, 0);
  const se = id => document.getElementById(id);
  if (se('stat-total'))     se('stat-total').textContent     = total;
  if (se('stat-quoting'))   se('stat-quoting').textContent   = quoting;
  if (se('stat-confirmed')) se('stat-confirmed').textContent = confirmed;
  if (se('stat-revenue'))   se('stat-revenue').textContent   = '$' + fmt(revenue);
}

async function openBookingChecklist(id) {
  activeBookingTripId = id;
  const trip = allTrips.find(item => item.id === id);
  document.getElementById('booking-trip-label').textContent =
    `#${id} ${trip?.customer_name || ''}｜${trip?.trip_date || '尚未設定出發日'}`;
  document.getElementById('booking-check-list').innerHTML =
    '<div class="booking-loading">載入確認項目…</div>';
  document.getElementById('booking-modal-overlay').classList.add('open');

  try {
    const summary = await apiFetch(`/api/trips/${id}/booking-checks`);
    renderBookingChecklist(summary);
  } catch (error) {
    document.getElementById('booking-check-list').innerHTML =
      '<div class="booking-error">無法載入確認項目，請稍後再試。</div>';
  }
}

function renderBookingChecklist(summary) {
  document.getElementById('booking-check-list').innerHTML = summary.items.map(item => {
    const meta = item.confirmed
      ? `由 ${escapeHtml(item.confirmed_by || '使用者')} 於 ${escapeHtml(item.confirmed_at)} 確認`
      : '尚未確認';
    return `
      <div class="booking-check-item ${item.confirmed ? 'is-confirmed' : ''}" data-category="${item.category}">
        <label class="booking-check-heading">
          <input type="checkbox" id="booking-${item.category}" ${item.confirmed ? 'checked' : ''}
                 onchange="updateBookingItemState('${item.category}')">
          <span class="booking-check-icon">${item.confirmed ? '✓' : '○'}</span>
          <span>${escapeHtml(item.label)}</span>
        </label>
        <textarea class="form-control" id="booking-note-${item.category}" rows="2"
                  placeholder="可填寫訂位編號、供應商聯絡人或待處理事項…">${escapeHtml(item.note)}</textarea>
        <div class="booking-check-meta" id="booking-meta-${item.category}">${meta}</div>
      </div>`;
  }).join('');
}

function updateBookingItemState(category) {
  const checkbox = document.getElementById(`booking-${category}`);
  const item = checkbox.closest('.booking-check-item');
  item.classList.toggle('is-confirmed', checkbox.checked);
  item.querySelector('.booking-check-icon').textContent = checkbox.checked ? '✓' : '○';
  if (!checkbox.checked) {
    document.getElementById(`booking-meta-${category}`).textContent = '取消勾選後將清除原確認人與時間';
  }
}

function closeBookingChecklist() {
  activeBookingTripId = null;
  document.getElementById('booking-modal-overlay').classList.remove('open');
}

async function saveBookingChecklist() {
  if (!activeBookingTripId) return;
  const button = document.getElementById('save-booking-checks');
  const checks = {};
  BOOKING_CATEGORIES.forEach(category => {
    checks[category] = {
      confirmed: document.getElementById(`booking-${category}`).checked,
      note: document.getElementById(`booking-note-${category}`).value,
    };
  });

  button.disabled = true;
  button.textContent = '儲存中…';
  try {
    const summary = await apiFetch(`/api/trips/${activeBookingTripId}/booking-checks`, {
      method: 'PUT',
      body: JSON.stringify({ checks }),
    });
    const trip = allTrips.find(item => item.id === activeBookingTripId);
    if (trip) trip.booking_summary = summary;
    renderTrips();
    closeBookingChecklist();
    toast(summary.status === 'complete' ? '✅ 出團預訂已全部確認' : '確認進度已儲存');
  } catch (error) {
    toast('確認進度儲存失敗', 'error');
  } finally {
    button.disabled = false;
    button.textContent = '儲存確認進度';
  }
}

async function copyTrip(id) {
  try {
    const newTrip = await apiFetch(`/api/trips/${id}/copy`, { method: 'POST' });
    toast(`✅ 已複製為新行程 #${newTrip.id}，即將開啟編輯…`);
    setTimeout(() => { window.location.href = `/?id=${newTrip.id}`; }, 1000);
  } catch (error) {
    toast('複製失敗', 'error');
  }
}

async function deleteTrip(id) {
  if (!confirm('確定要刪除這筆行程嗎？')) return;
  try {
    await apiFetch(`/api/trips/${id}`, { method: 'DELETE' });
    toast('已刪除');
    await loadTrips();
  } catch (error) {
    toast('刪除失敗', 'error');
  }
}

window.addEventListener('DOMContentLoaded', init);


