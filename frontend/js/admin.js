// ── State ─────────────────────────────────────────────────────────────────────
let currentTab = 'attractions';
let modalCallback = null;

const TABS = {
  attractions: {
    label: '景點', endpoint: '/api/attractions',
    fields: [
      { key: 'name', label: '景點名稱', required: true },
      { key: 'category', label: '分類', type: 'select', options: ['自然景觀', '文化古蹟', '海灘', '水上活動', '生態體驗', '室內景點', '地標', '節慶活動', '離島'] },
      { key: 'location', label: '地點', type: 'select', options: ['馬公市', '白沙鄉', '西嶼鄉', '七美島', '望安島', '吉貝島', '員貝島', '白沙/西嶼'] },
      { key: 'duration_hours', label: '建議遊覽時數（小時）', type: 'number', step: '0.5' },
      { key: 'price', label: '門票/費用（元/人，免費填0）', type: 'number' },
      { key: 'description', label: '說明', type: 'textarea' },
    ],
    columns: ['名稱', '分類', '地點', '時數', '費用', '操作'],
    renderRow: r => `<td><strong>${r.name}</strong></td><td>${r.category}</td><td>${r.location}</td><td>${r.duration_hours}h</td><td>${r.price > 0 ? '$' + fmt(r.price) + '/人' : '免費'}</td>`,
  },
  restaurants: {
    label: '餐廳', endpoint: '/api/restaurants',
    fields: [
      { key: 'name', label: '餐廳名稱', required: true },
      { key: 'category', label: '分類', type: 'select', options: ['海鮮', '小吃', '早餐', '冰品', '飲料', '中式', '其他'] },
      { key: 'location', label: '地點', type: 'select', options: ['馬公市', '白沙鄉', '西嶼鄉', '七美島', '望安島', '吉貝島'] },
      { key: 'meal_type', label: '適合餐別', type: 'select', options: ['早餐', '午餐', '晚餐', '午晚餐', '全天'] },
      { key: 'price_per_person', label: '每人估計費用（元）', type: 'number' },
      { key: 'description', label: '說明', type: 'textarea' },
    ],
    columns: ['名稱', '分類', '地點', '餐別', '每人費用', '操作'],
    renderRow: r => `<td><strong>${r.name}</strong></td><td>${r.category}</td><td>${r.location}</td><td>${r.meal_type}</td><td>$${fmt(r.price_per_person)}/人</td>`,
  },
  transportation: {
    label: '交通', endpoint: '/api/transportation',
    fields: [
      { key: 'name', label: '交通名稱', required: true },
      { key: 'type', label: '類型', type: 'select', options: ['飛機', '船', '機車', '腳踏車', '包車', '離島船'] },
      { key: 'price_per_person', label: '成人票價（元）', type: 'number' },
      { key: 'price_child',      label: '兒童票價（元，無則填 0）', type: 'number' },
      { key: 'price_senior',     label: '敬老/愛陪票價（元，無則填 0）', type: 'number' },
      { key: 'price_per_unit', label: '每單位費用（台/次計費用此欄）', type: 'number' },
      { key: 'unit', label: '計費單位', type: 'select', options: ['人', '台/天', '次'] },
      { key: 'description', label: '說明', type: 'textarea' },
    ],
    columns: ['名稱', '類型', '成人', '兒童', '敬老/愛陪', '單位費用', '操作'],
    renderRow: r => `
      <td><strong>${r.name}</strong></td>
      <td>${r.type}</td>
      <td>${r.price_per_person > 0 ? '$' + fmt(r.price_per_person) : '—'}</td>
      <td>${r.price_child > 0 ? '$' + fmt(r.price_child) : '—'}</td>
      <td>${r.price_senior > 0 ? '$' + fmt(r.price_senior) : '—'}</td>
      <td>${r.price_per_unit > 0 ? '$' + fmt(r.price_per_unit) + '/' + r.unit : '—'}</td>`,
  },
  accommodations: {
    label: '住宿', endpoint: '/api/accommodations',
    fields: [
      { key: 'name', label: '住宿名稱', required: true },
      { key: 'type', label: '類型', type: 'select', options: ['五星飯店', '四星飯店', '三星飯店', '民宿', '背包客棧'] },
      { key: 'location', label: '地點', type: 'select', options: ['馬公市', '白沙鄉', '西嶼鄉', '七美島', '望安島', '吉貝島'] },
      { key: 'price_per_room_night', label: '每房每晚費用（元）', type: 'number' },
      { key: 'description', label: '說明', type: 'textarea' },
    ],
    columns: ['名稱', '類型', '地點', '每房每晚', '操作'],
    renderRow: r => `<td><strong>${r.name}</strong></td><td>${r.type}</td><td>${r.location}</td><td>$${fmt(r.price_per_room_night)}</td>`,
  },
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  setActive('nav-admin');
  buildTabs();
  switchTab('attractions');
}

function buildTabs() {
  const bar = document.getElementById('admin-tab-bar');
  bar.innerHTML = Object.entries(TABS).map(([key, t]) =>
    `<button class="admin-tab" id="tab-${key}" onclick="switchTab('${key}')">${t.label}管理</button>`
  ).join('');
}

async function switchTab(key) {
  currentTab = key;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${key}`)?.classList.add('active');
  await loadData(key);
}

async function loadData(key) {
  const cfg = TABS[key];
  const data = await apiFetch(cfg.endpoint);
  renderTable(key, data);
}

function renderTable(key, data) {
  const cfg = TABS[key];
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="flex-between mb-2">
      <div class="page-title" style="margin:0;font-size:1.1rem">${cfg.label}清單（${data.length} 筆）</div>
      <button class="btn btn-primary" onclick="openModal('${key}')">＋ 新增${cfg.label}</button>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>${cfg.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>
          ${data.map(r => `
            <tr>
              ${cfg.renderRow(r)}
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-outline btn-sm" onclick='openModal("${key}", ${JSON.stringify(r)})'>編輯</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteItem('${key}', ${r.id})">停用</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(key, existing = null) {
  const cfg = TABS[key];
  const isEdit = !!existing;
  document.getElementById('modal-title').textContent = isEdit ? `編輯${cfg.label}` : `新增${cfg.label}`;

  const form = document.getElementById('modal-form');
  form.innerHTML = cfg.fields.map(f => {
    const val = existing ? (existing[f.key] ?? '') : '';
    let input;
    if (f.type === 'select') {
      input = `<select class="form-control" name="${f.key}">
        ${f.options.map(o => `<option value="${o}" ${o == val ? 'selected' : ''}>${o}</option>`).join('')}
      </select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="form-control" name="${f.key}" rows="2">${val}</textarea>`;
    } else {
      input = `<input class="form-control" type="${f.type || 'text'}" name="${f.key}" value="${val}" ${f.step ? `step="${f.step}"` : ''}>`;
    }
    return `<div class="form-group"><label class="form-label">${f.label}${f.required ? '<span class="required">*</span>' : ''}</label>${input}</div>`;
  }).join('');

  modalCallback = async () => {
    const fd = new FormData(form);
    const payload = {};
    cfg.fields.forEach(f => {
      const v = fd.get(f.key);
      payload[f.key] = f.type === 'number' ? (parseFloat(v) || 0) : v;
    });

    try {
      if (isEdit) {
        await apiFetch(`${cfg.endpoint}/${existing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast(`${cfg.label}已更新`);
      } else {
        await apiFetch(cfg.endpoint, { method: 'POST', body: JSON.stringify(payload) });
        toast(`${cfg.label}已新增`);
      }
      closeModal();
      loadData(currentTab);
    } catch (e) {
      toast('儲存失敗：' + e.message, 'error');
    }
  };

  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  modalCallback = null;
}

function confirmModal() {
  if (modalCallback) modalCallback();
}

async function deleteItem(key, id) {
  const cfg = TABS[key];
  if (!confirm(`確定要停用這筆${cfg.label}資料嗎？`)) return;
  try {
    await apiFetch(`${cfg.endpoint}/${id}`, { method: 'DELETE' });
    toast('已停用');
    loadData(currentTab);
  } catch (e) {
    toast('操作失敗', 'error');
  }
}

window.addEventListener('DOMContentLoaded', init);
