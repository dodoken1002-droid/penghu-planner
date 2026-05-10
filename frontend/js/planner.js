// ── State ─────────────────────────────────────────────────────────────────────
let REF = { attractions: [], restaurants: [], transportation: [], accommodations: [] };
let editingTripId = null;
let currentDays = 2;

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  setActive('nav-planner');
  const [at, re, tr, ac] = await Promise.all([
    apiFetch('/api/attractions'),
    apiFetch('/api/restaurants'),
    apiFetch('/api/transportation'),
    apiFetch('/api/accommodations'),
  ]);
  REF.attractions = at;
  REF.restaurants = re;
  REF.transportation = tr;
  REF.accommodations = ac;

  populateTransportSelect();
  bindEvents();

  // Check if editing existing trip
  const params = new URLSearchParams(location.search);
  if (params.get('id')) {
    editingTripId = parseInt(params.get('id'));
    await loadTrip(editingTripId);
  } else {
    buildDayTabs(currentDays);
  }
}

// ── Transport select ──────────────────────────────────────────────────────────
function populateTransportSelect() {
  const sel = document.getElementById('transport_id');
  sel.innerHTML = '<option value="">── 選擇交通方式 ──</option>';
  const groups = {};
  REF.transportation.forEach(t => {
    if (!groups[t.type]) groups[t.type] = [];
    groups[t.type].push(t);
  });
  for (const [type, items] of Object.entries(groups)) {
    const og = document.createElement('optgroup');
    og.label = type;
    items.forEach(t => {
      const o = document.createElement('option');
      o.value = t.id;
      if (t.price_per_person > 0) {
        let label = `${t.name}（成人$${fmt(t.price_per_person)}`;
        if (t.price_child > 0)  label += ` / 兒童$${fmt(t.price_child)}`;
        if (t.price_senior > 0) label += ` / 敬老$${fmt(t.price_senior)}`;
        label += '）';
        o.textContent = label;
      } else {
        o.textContent = `${t.name}（$${fmt(t.price_per_unit)}/${t.unit}）`;
      }
      o.dataset.pricePerson = t.price_per_person;
      o.dataset.priceChild  = t.price_child  || 0;
      o.dataset.priceSenior = t.price_senior || 0;
      o.dataset.priceUnit = t.price_per_unit;
      o.dataset.unit = t.unit;
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
}

// ── Day tabs builder ──────────────────────────────────────────────────────────
function buildDayTabs(n) {
  currentDays = n;
  const tabBar = document.getElementById('day-tabs');
  const panels = document.getElementById('day-panels');
  tabBar.innerHTML = '';
  panels.innerHTML = '';

  for (let d = 1; d <= n; d++) {
    const tab = document.createElement('button');
    tab.className = 'day-tab' + (d === 1 ? ' active' : '');
    tab.textContent = `第 ${d} 天`;
    tab.onclick = () => switchDay(d);
    tabBar.appendChild(tab);

    const panel = document.createElement('div');
    panel.id = `day-panel-${d}`;
    panel.className = 'day-panel' + (d === 1 ? ' active' : '');
    panel.innerHTML = buildDayHTML(d, n);
    panels.appendChild(panel);
  }
  calcCosts();
}

function switchDay(d) {
  document.querySelectorAll('.day-tab').forEach((t, i) => t.classList.toggle('active', i === d - 1));
  document.querySelectorAll('.day-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`day-panel-${d}`).classList.add('active');
}

function buildDayHTML(d, totalDays) {
  const isLast = d === totalDays;
  return `
  <div class="grid-2">
    <div>
      <div class="section-header">🌅 上午景點</div>
      <div id="am-items-${d}"></div>
      <button class="add-row-btn" onclick="addAttractionRow(${d},'am')">＋ 新增上午景點</button>

      <div class="section-header mt-3">🌆 下午景點</div>
      <div id="pm-items-${d}"></div>
      <button class="add-row-btn" onclick="addAttractionRow(${d},'pm')">＋ 新增下午景點</button>
    </div>
    <div>
      <div class="section-header">🍳 早餐</div>
      <div id="breakfast-item-${d}"></div>
      ${buildMealRow(d, 'breakfast')}

      <div class="section-header mt-3">🍜 午餐</div>
      <div id="lunch-item-${d}"></div>
      ${buildMealRow(d, 'lunch')}

      <div class="section-header mt-3">🦞 晚餐</div>
      <div id="dinner-item-${d}"></div>
      ${buildMealRow(d, 'dinner')}

      ${!isLast ? `
      <div class="section-header mt-3">🏨 住宿</div>
      <div class="item-row meal-row">
        <select class="form-control" id="accommodation-${d}" onchange="calcCosts()">
          <option value="">── 選擇住宿 ──</option>
          ${REF.accommodations.map(a =>
            `<option value="${a.id}" data-price="${a.price_per_room_night}">${a.name}（$${fmt(a.price_per_room_night)}/晚）</option>`
          ).join('')}
          <option value="custom">✏️ 自訂...</option>
        </select>
        <input type="number" class="form-control" id="accommodation-rooms-${d}" placeholder="房數" value="1" min="1" onchange="calcCosts()" style="width:80px">
      </div>
      <div id="custom-accommodation-${d}" style="display:none">
        <input class="form-control mt-2" id="custom-accommodation-name-${d}" placeholder="住宿名稱">
        <input type="number" class="form-control mt-2" id="custom-accommodation-price-${d}" placeholder="每晚每房費用" onchange="calcCosts()">
      </div>` : ''}
    </div>
  </div>`;
}

function buildMealRow(d, meal) {
  const opts = REF.restaurants
    .filter(r => r.meal_type === '全天' || r.meal_type.includes(
      meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : '晚餐'))
    .map(r => `<option value="${r.id}" data-price="${r.price_per_person}">${r.name}（$${fmt(r.price_per_person)}/人）</option>`)
    .join('');

  return `
  <div class="item-row meal-row">
    <select class="form-control" id="${meal}-${d}" onchange="onMealChange(${d},'${meal}')">
      <option value="">── 不安排 ──</option>
      ${opts}
      <option value="custom">✏️ 自訂...</option>
    </select>
    <span class="text-muted" id="${meal}-price-${d}" style="font-size:0.82rem;text-align:right"></span>
  </div>
  <div id="custom-${meal}-${d}" style="display:none">
    <input class="form-control mt-2" id="custom-${meal}-name-${d}" placeholder="餐廳名稱">
    <input type="number" class="form-control mt-2" id="custom-${meal}-price-${d}" placeholder="每人費用" onchange="calcCosts()">
  </div>`;
}

function onMealChange(d, meal) {
  const sel = document.getElementById(`${meal}-${d}`);
  const customDiv = document.getElementById(`custom-${meal}-${d}`);
  customDiv.style.display = sel.value === 'custom' ? 'block' : 'none';
  calcCosts();
}

// ── Attraction rows ───────────────────────────────────────────────────────────
function addAttractionRow(d, slot, data = null) {
  const container = document.getElementById(`${slot}-items-${d}`);
  const rowId = `${slot}-attr-${d}-${Date.now()}`;
  const opts = REF.attractions.map(a =>
    `<option value="${a.id}" data-price="${a.price}">${a.name} [${a.location}]（${a.duration_hours}h${a.price > 0 ? ` $${a.price}/人` : ' 免費'}）</option>`
  ).join('');

  const row = document.createElement('div');
  row.className = 'item-row';
  row.id = rowId;
  row.innerHTML = `
    <select class="form-control" onchange="calcCosts()">
      <option value="">── 選擇景點 ──</option>
      ${opts}
      <option value="custom">✏️ 自訂景點...</option>
    </select>
    <span class="text-muted" style="font-size:0.82rem;width:60px;text-align:right"></span>
    <button class="remove-btn" onclick="document.getElementById('${rowId}').remove(); calcCosts()">✕</button>`;
  container.appendChild(row);

  const sel = row.querySelector('select');
  sel.addEventListener('change', function () {
    if (this.value === 'custom') {
      const input = document.createElement('input');
      input.className = 'form-control mt-2';
      input.placeholder = '景點名稱（自訂）';
      row.parentNode.insertBefore(input, row.nextSibling);
    }
  });

  if (data) sel.value = data;
  calcCosts();
}

// ── Cost calculation ──────────────────────────────────────────────────────────
function calcCosts() {
  const adults   = parseInt(document.getElementById('adults').value)   || 0;
  const children = parseInt(document.getElementById('children').value) || 0;
  const seniors  = parseInt(document.getElementById('seniors').value)  || 0;
  const total = adults + children + seniors;
  const days = parseInt(document.getElementById('days').value) || 1;

  // Transport — 成人/兒童/敬老各自套用不同票價
  let transportCost = 0;
  const transportSel = document.getElementById('transport_id');
  if (transportSel.value) {
    const opt = transportSel.options[transportSel.selectedIndex];
    const pp = parseInt(opt.dataset.pricePerson) || 0;
    const pc = parseInt(opt.dataset.priceChild)  || 0;
    const ps = parseInt(opt.dataset.priceSenior) || 0;
    const pu = parseInt(opt.dataset.priceUnit)   || 0;
    const unit = opt.dataset.unit || '人';
    if (pp > 0) {
      // 兒童/敬老無專屬票價時沿用成人票價
      transportCost = adults   * pp
                    + children * (pc > 0 ? pc : pp)
                    + seniors  * (ps > 0 ? ps : pp);
    } else if (pu > 0) {
      if (unit.includes('台') || unit.includes('次')) {
        transportCost = pu * parseInt(document.getElementById('transport_qty').value || 1);
      } else {
        transportCost = pu * total;
      }
    }
  }

  // Accommodation + Activities + Meals
  let accommodationCost = 0, activityCost = 0, mealCost = 0;

  for (let d = 1; d <= currentDays; d++) {
    // Attraction costs
    const slots = ['am', 'pm'];
    slots.forEach(slot => {
      const container = document.getElementById(`${slot}-items-${d}`);
      if (!container) return;
      container.querySelectorAll('select').forEach(sel => {
        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.dataset.price > 0) {
          activityCost += parseInt(opt.dataset.price) * total;
        }
      });
    });

    // Meal costs
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      const sel = document.getElementById(`${meal}-${d}`);
      if (!sel || !sel.value || sel.value === 'custom') {
        if (sel && sel.value === 'custom') {
          const customPrice = parseInt(document.getElementById(`custom-${meal}-price-${d}`)?.value) || 0;
          mealCost += customPrice * total;
        }
        return;
      }
      const opt = sel.options[sel.selectedIndex];
      if (opt && opt.dataset.price) {
        mealCost += parseInt(opt.dataset.price) * total;
      }
    });

    // Accommodation (not on last day)
    const accSel = document.getElementById(`accommodation-${d}`);
    if (accSel) {
      const rooms = parseInt(document.getElementById(`accommodation-rooms-${d}`)?.value) || 1;
      if (accSel.value && accSel.value !== 'custom') {
        const opt = accSel.options[accSel.selectedIndex];
        if (opt && opt.dataset.price) {
          accommodationCost += parseInt(opt.dataset.price) * rooms;
        }
      } else if (accSel.value === 'custom') {
        const cp = parseInt(document.getElementById(`custom-accommodation-price-${d}`)?.value) || 0;
        accommodationCost += cp * rooms;
      }
    }
  }

  const other = parseInt(document.getElementById('other_cost').value) || 0;
  const serviceFee = parseInt(document.getElementById('service_fee').value) || 0;
  const subtotal = transportCost + accommodationCost + activityCost + mealCost + other;
  const final = subtotal + serviceFee;
  const perPerson = total > 0 ? Math.round(final / total) : 0;

  // 顯示人數細項
  const paxLabel = [
    adults   > 0 ? `大人×${adults}`   : '',
    children > 0 ? `兒童×${children}` : '',
    seniors  > 0 ? `敬老×${seniors}`  : '',
  ].filter(Boolean).join('　');
  const paxEl = document.getElementById('cost-pax-detail');
  if (paxEl) paxEl.textContent = paxLabel ? `（${paxLabel}）` : '';

  document.getElementById('cost-transport').textContent = `$${fmt(transportCost)}`;
  document.getElementById('cost-accommodation').textContent = `$${fmt(accommodationCost)}`;
  document.getElementById('cost-activity').textContent = `$${fmt(activityCost)}`;
  document.getElementById('cost-meal').textContent = `$${fmt(mealCost)}`;
  document.getElementById('cost-other').textContent = `$${fmt(other)}`;
  document.getElementById('cost-subtotal').textContent = `$${fmt(subtotal)}`;
  document.getElementById('cost-final').textContent = `$${fmt(final)}`;
  document.getElementById('cost-per-person').textContent = `$${fmt(perPerson)}`;

  renderSummary();
  return { transportCost, accommodationCost, activityCost, mealCost, other, serviceFee, subtotal, final, perPerson, adults, children, seniors };
}

// ── Collect form data ─────────────────────────────────────────────────────────
function collectData(status) {
  const costs = calcCosts();
  const days = currentDays;

  const itinerary = { days: [] };
  for (let d = 1; d <= days; d++) {
    const day = { day: d, am_attractions: [], pm_attractions: [], meals: {}, accommodation: null };

    ['am', 'pm'].forEach(slot => {
      const container = document.getElementById(`${slot}-items-${d}`);
      if (!container) return;
      container.querySelectorAll('select').forEach(sel => {
        if (!sel.value || sel.value === 'custom') return;
        const opt = sel.options[sel.selectedIndex];
        const found = REF.attractions.find(a => a.id == sel.value);
        if (found) day[`${slot}_attractions`].push({ id: found.id, name: found.name, price: found.price, location: found.location });
      });
    });

    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      const sel = document.getElementById(`${meal}-${d}`);
      if (!sel || !sel.value) return;
      if (sel.value === 'custom') {
        day.meals[meal] = {
          id: null,
          name: document.getElementById(`custom-${meal}-name-${d}`)?.value || '自訂',
          price_per_person: parseInt(document.getElementById(`custom-${meal}-price-${d}`)?.value) || 0,
        };
      } else {
        const found = REF.restaurants.find(r => r.id == sel.value);
        if (found) day.meals[meal] = { id: found.id, name: found.name, price_per_person: found.price_per_person };
      }
    });

    const accSel = document.getElementById(`accommodation-${d}`);
    if (accSel) {
      const rooms = parseInt(document.getElementById(`accommodation-rooms-${d}`)?.value) || 1;
      if (accSel.value && accSel.value !== 'custom') {
        const found = REF.accommodations.find(a => a.id == accSel.value);
        if (found) day.accommodation = { id: found.id, name: found.name, rooms, price: found.price_per_room_night };
      } else if (accSel.value === 'custom') {
        day.accommodation = {
          id: null,
          name: document.getElementById(`custom-accommodation-name-${d}`)?.value || '自訂住宿',
          rooms,
          price: parseInt(document.getElementById(`custom-accommodation-price-${d}`)?.value) || 0,
        };
      }
    }
    itinerary.days.push(day);
  }

  const transportSel = document.getElementById('transport_id');
  const transportOpt = transportSel.options[transportSel.selectedIndex];
  if (transportOpt && transportSel.value) {
    const found = REF.transportation.find(t => t.id == transportSel.value);
    if (found) itinerary.transport = { id: found.id, name: found.name };
  }

  return {
    customer_name: document.getElementById('customer_name').value,
    customer_phone: document.getElementById('customer_phone').value,
    customer_email: document.getElementById('customer_email').value,
    trip_date: document.getElementById('trip_date').value,
    return_date: document.getElementById('return_date').value,
    days, adults: parseInt(document.getElementById('adults').value) || 0,
    children: parseInt(document.getElementById('children').value) || 0,
    seniors: parseInt(document.getElementById('seniors').value) || 0,
    transport_cost: costs.transportCost,
    accommodation_cost: costs.accommodationCost,
    activity_cost: costs.activityCost,
    meal_cost: costs.mealCost,
    other_cost: costs.other,
    service_fee: parseInt(document.getElementById('service_fee').value) || 0,
    notes: document.getElementById('notes').value,
    status: status || '草稿',
    itinerary_data: itinerary,
  };
}

// ── Save trip ─────────────────────────────────────────────────────────────────
async function saveTrip(status) {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = '儲存中…'; }

  try {
    const data = collectData(status);   // ← 移入 try/catch，確保錯誤被捕捉
    let trip;
    if (editingTripId) {
      trip = await apiFetch(`/api/trips/${editingTripId}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      trip = await apiFetch('/api/trips', { method: 'POST', body: JSON.stringify(data) });
      editingTripId = trip.id;
      history.replaceState(null, '', `/?id=${trip.id}`);
    }

    if (status === '報價中') {
      toast(`✅ 已儲存到「所有報價」(#${trip.id})，即將開啟報價單…`);
      setTimeout(() => window.location.href = `/quote?id=${trip.id}`, 1200);
    } else {
      toast(`✅ 草稿已儲存 (#${trip.id})`);
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 儲存草稿'; }
    }
  } catch (e) {
    toast('❌ 儲存失敗：' + e.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = status === '報價中' ? '📄 生成報價單' : '💾 儲存草稿';
    }
  }
}

// ── Load existing trip ────────────────────────────────────────────────────────
async function loadTrip(id) {
  const trip = await apiFetch(`/api/trips/${id}`);
  document.getElementById('customer_name').value = trip.customer_name;
  document.getElementById('customer_phone').value = trip.customer_phone;
  document.getElementById('customer_email').value = trip.customer_email;
  document.getElementById('trip_date').value = trip.trip_date;
  document.getElementById('return_date').value = trip.return_date;
  document.getElementById('adults').value = trip.adults;
  document.getElementById('children').value = trip.children;
  document.getElementById('seniors').value = trip.seniors || 0;
  document.getElementById('days').value = trip.days;
  document.getElementById('other_cost').value = trip.other_cost;
  document.getElementById('service_fee').value = trip.service_fee || 0;
  document.getElementById('notes').value = trip.notes;

  buildDayTabs(trip.days);

  const itin = trip.itinerary_data;
  if (itin.transport) {
    document.getElementById('transport_id').value = itin.transport.id;
  }

  if (itin.days) {
    itin.days.forEach(day => {
      const d = day.day;
      day.am_attractions?.forEach(a => addAttractionRow(d, 'am', a.id));
      day.pm_attractions?.forEach(a => addAttractionRow(d, 'pm', a.id));

      ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        if (day.meals?.[meal]) {
          const sel = document.getElementById(`${meal}-${d}`);
          if (sel && day.meals[meal].id) sel.value = day.meals[meal].id;
        }
      });

      if (day.accommodation) {
        const sel = document.getElementById(`accommodation-${d}`);
        if (sel && day.accommodation.id) {
          sel.value = day.accommodation.id;
          const roomsEl = document.getElementById(`accommodation-rooms-${d}`);
          if (roomsEl) roomsEl.value = day.accommodation.rooms || 1;
        }
      }
    });
  }
  calcCosts();

  document.getElementById('page-title').textContent = `編輯行程 #${id}`;
}

// ── Event bindings ────────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('days').addEventListener('change', function () {
    buildDayTabs(parseInt(this.value));
  });
  document.getElementById('transport_id').addEventListener('change', function () {
    const opt = this.options[this.selectedIndex];
    const unit = opt?.dataset?.unit || '';
    const qtyRow = document.getElementById('transport-qty-row');
    const needsQty = unit && !unit.includes('人');
    qtyRow.style.display = needsQty ? 'flex' : 'none';
    calcCosts();
  });
  ['adults', 'children', 'seniors', 'service_fee', 'other_cost'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcCosts);
  });
  // 出發/回程日期自動聯動天數
  ['trip_date', 'return_date'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', syncDaysFromDates);
  });
}

// ── 日期自動計算天數 ──────────────────────────────────────────────────────────
function syncDaysFromDates() {
  const start = document.getElementById('trip_date').value;
  const end   = document.getElementById('return_date').value;
  if (!start || !end) return;
  const diff = Math.round((new Date(end) - new Date(start)) / 86400000);
  if (diff <= 0) return;
  const days = diff + 1; // 出發當天也算一天
  const daysEl = document.getElementById('days');
  // 如果天數超出選單最大值，就加入新選項
  const max = Math.max(...Array.from(daysEl.options).map(o => parseInt(o.value)));
  if (days > max) {
    for (let d = max + 1; d <= days; d++) {
      const o = document.createElement('option');
      o.value = d;
      o.textContent = `${d} 天 ${d - 1} 夜`;
      daysEl.appendChild(o);
    }
  }
  daysEl.value = days;
  buildDayTabs(days);
}

// ── 行程總覽（即時確認）─────────────────────────────────────────────────────
function renderSummary() {
  const el = document.getElementById('itinerary-summary');
  if (!el) return;

  const MEAL_ICON  = { breakfast: '🍳', lunch: '🍜', dinner: '🦞' };
  const MEAL_LABEL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
  let html = '';

  // 交通
  const tSel = document.getElementById('transport_id');
  if (tSel && tSel.value) {
    const tName = tSel.options[tSel.selectedIndex].textContent;
    html += `<div class="itin-transport-block">✈️ <strong>交通：</strong>${tName}</div>`;
  }

  for (let d = 1; d <= currentDays; d++) {
    let rows = '';

    // 上午 / 下午景點
    ['am', 'pm'].forEach(slot => {
      const container = document.getElementById(`${slot}-items-${d}`);
      if (!container) return;
      container.querySelectorAll('select').forEach(sel => {
        if (!sel.value || sel.value === 'custom') return;
        const name = sel.options[sel.selectedIndex].textContent.split('（')[0];
        rows += `<div class="itin-row"><span class="itin-row-icon">${slot === 'am' ? '🌅' : '🌆'}</span><span>${name}</span></div>`;
      });
    });

    // 餐食
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      const sel = document.getElementById(`${meal}-${d}`);
      if (!sel || !sel.value) return;
      const name = sel.value === 'custom'
        ? (document.getElementById(`custom-${meal}-name-${d}`)?.value || '自訂餐廳')
        : sel.options[sel.selectedIndex].textContent.split('（')[0];
      rows += `<div class="itin-row"><span class="itin-row-icon">${MEAL_ICON[meal]}</span><span>${MEAL_LABEL[meal]}：${name}</span></div>`;
    });

    // 住宿
    const accSel = document.getElementById(`accommodation-${d}`);
    if (accSel && accSel.value) {
      const rooms = document.getElementById(`accommodation-rooms-${d}`)?.value || 1;
      const name = accSel.value === 'custom'
        ? (document.getElementById(`custom-accommodation-name-${d}`)?.value || '自訂住宿')
        : accSel.options[accSel.selectedIndex].textContent.split('（')[0];
      rows += `<div class="itin-row"><span class="itin-row-icon">🏨</span><span>住宿：${name}（${rooms} 房）</span></div>`;
    }

    if (rows) {
      html += `<div class="itin-day-block"><div class="itin-day-label">📅 第 ${d} 天</div>${rows}</div>`;
    }
  }

  el.innerHTML = html || '<div class="itin-empty">尚未選擇任何行程項目</div>';
}

window.addEventListener('DOMContentLoaded', init);
