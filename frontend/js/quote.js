const MEAL_LABEL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
const MEAL_ICON = { breakfast: '🍳', lunch: '🍜', dinner: '🦞' };

async function init() {
  await requirePage(['admin', 'viewer']);
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { document.body.innerHTML = '<p style="padding:40px">缺少行程編號</p>'; return; }

  const trip = await apiFetch(`/api/trips/${id}`);
  renderQuote(trip);
}

function renderQuote(trip) {
  document.getElementById('q-id').textContent = trip.id;
  document.getElementById('q-date').textContent = new Date().toLocaleDateString('zh-TW');
  document.getElementById('q-customer').textContent = trip.customer_name || '—';
  document.getElementById('q-phone').textContent = trip.customer_phone || '—';
  document.getElementById('q-email').textContent = trip.customer_email || '—';
  document.getElementById('q-tripdate').textContent =
    trip.trip_date ? `${trip.trip_date} ～ ${trip.return_date}` : '—';
  const paxParts = [];
  if (trip.adults   > 0) paxParts.push(`${trip.adults} 大人`);
  if (trip.children > 0) paxParts.push(`${trip.children} 兒童`);
  if (trip.seniors  > 0) paxParts.push(`${trip.seniors} 敬老/愛陪`);
  document.getElementById('q-people').textContent =
    `${paxParts.join('、')}（共 ${trip.total_people} 人）`;
  document.getElementById('q-days').textContent = `${trip.days} 天 ${trip.days - 1} 夜`;

  // Itinerary
  const itin = trip.itinerary_data;
  const itinEl = document.getElementById('q-itinerary');

  if (itin.transport) {
    itinEl.innerHTML += `<div class="quote-item">✈️ 交通：${itin.transport.name}</div>`;
  }

  (itin.days || []).forEach(day => {
    const section = document.createElement('div');
    section.className = 'quote-day';
    let html = `<div class="quote-day-title">📅 第 ${day.day} 天</div>`;

    const amAt = day.am_attractions || [];
    const pmAt = day.pm_attractions || [];
    if (amAt.length) html += amAt.map(a => `<div class="quote-item">🌅 ${a.name}${a.location ? ` [${a.location}]` : ''}${a.price > 0 ? `（門票 $${fmt(a.price)}/人）` : ''}</div>`).join('');
    if (pmAt.length) html += pmAt.map(a => `<div class="quote-item">🌆 ${a.name}${a.location ? ` [${a.location}]` : ''}${a.price > 0 ? `（門票 $${fmt(a.price)}/人）` : ''}</div>`).join('');

    Object.entries(MEAL_LABEL).forEach(([key, label]) => {
      if (day.meals?.[key]) {
        const m = day.meals[key];
        html += `<div class="quote-item">${MEAL_ICON[key]} ${label}：${m.name}${m.price_per_person > 0 ? `（約 $${fmt(m.price_per_person)}/人）` : ''}</div>`;
      }
    });

    if (day.accommodation) {
      const rtStr = day.accommodation.room_type ? ` — ${day.accommodation.room_type}` : '';
      html += `<div class="quote-item">🏨 住宿：${day.accommodation.name}${rtStr}（${day.accommodation.rooms} 房 × $${fmt(day.accommodation.price)}/晚）</div>`;
    }

    section.innerHTML = html;
    itinEl.appendChild(section);
  });

  // Price breakdown
  document.getElementById('q-transport-cost').textContent = `$${fmt(trip.transport_cost)}`;
  document.getElementById('q-accommodation-cost').textContent = `$${fmt(trip.accommodation_cost)}`;
  document.getElementById('q-activity-cost').textContent = `$${fmt(trip.activity_cost)}`;
  document.getElementById('q-meal-cost').textContent = `$${fmt(trip.meal_cost)}`;
  if (trip.other_cost > 0) {
    document.getElementById('q-other-row').style.display = '';
    document.getElementById('q-other-cost').textContent = `$${fmt(trip.other_cost)}`;
  }
  document.getElementById('q-subtotal').textContent = `$${fmt(trip.cost_subtotal)}`;
  document.getElementById('q-service-fee').textContent = trip.service_fee > 0 ? `$${fmt(trip.service_fee)}` : '—';
  document.getElementById('q-total').textContent = `$${fmt(trip.final_quote)}`;
  document.getElementById('q-per-person').textContent = `$${fmt(trip.quote_per_person)}`;

  if (trip.notes) {
    document.getElementById('q-notes-section').style.display = '';
    document.getElementById('q-notes').textContent = trip.notes;
  }
}

window.addEventListener('DOMContentLoaded', init);
