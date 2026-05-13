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
      { key: 'price_per_unit',   label: '每單位費用（台/次計費用此欄）', type: 'number' },
      { key: 'unit', label: '計費單位', type: 'select', options: ['人', '台/天', '次'] },
      { key: 'description', label: '說明', type: 'textarea' },
    ],
    columns: ['名稱', '類型', '成人', '兒童', '敬老/愛陪', '單位費用', '操作'],
    renderRow: r => `
      <td><strong>${r.name}</strong></td><td>${r.type}</td>
      <td>${r.price_per_person > 0 ? '$' + fmt(r.price_per_person) : '—'}</td>
      <td>${r.price_child  > 0 ? '$' + fmt(r.price_child)  : '—'}</td>
      <td>${r.price_senior > 0 ? '$' + fmt(r.price_senior) : '—'}</td>
      <td>${r.price_per_unit > 0 ? '$' + fmt(r.price_per_unit) + '/' + r.unit : '—'}</td>`,
  },
  accommodations: {
    label: '住宿', endpoint: '/api/accommodations',
    fields: [
      { key: 'name', label: '住宿名稱', required: true },
      { key: 'type', label: '類型', type: 'select', options: ['五星飯店', '四星飯店', '三星飯店', '民宿', '背包客棧'] },
      { key: 'location', label: '地點', type: 'select', options: ['馬公市', '白沙鄉', '西嶼鄉', '七美島', '望安島', '吉貝島'] },
      { key: 'price_per_room_night', label: '基本價（每房每晚，元）', type: 'number' },
      { key: 'description', label: '說明', type: 'textarea' },
    ],
    columns: ['名稱', '類型', '地點', '基本價/晚', '房型數', '操作'],
    renderRow: r => `<td><strong>${r.name}</strong></td><td>${r.type}</td><td>${r.location}</td><td>$${fmt(r.price_per_room_night)}</td><td>${(r.rooms||[]).length} 間</td>`,
  },
};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await requirePage(['admin', 'editor']);
  setActive('nav-admin');
  buildTabs();
  switchTab('attractions');
}

function buildTabs() {
  const isAdmin = window.currentUser?.role === 'admin';
  const bar = document.getElementById('admin-tab-bar');
  let tabs = Object.entries(TABS).map(([key, t]) =>
    `<button class="admin-tab" id="tab-${key}" onclick="switchTab('${key}')">${t.label}管理</button>`
  ).join('');
  if (isAdmin) {
    tabs += `<button class="admin-tab" id="tab-users" onclick="switchTab('users')">👥 帳號管理</button>`;
    tabs += `<button class="admin-tab" id="tab-logs" onclick="switchTab('logs')">📋 操作記錄</button>`;
  }
  bar.innerHTML = tabs;
}

async function switchTab(key) {
  currentTab = key;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${key}`)?.classList.add('active');
  if (key === 'users') { await loadUsers(); return; }
  if (key === 'logs')  { await loadLogs();  return; }
  await loadData(key);
}

// ── Reference Data ────────────────────────────────────────────────────────────
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
                  ${key === 'accommodations'
                    ? `<button class="btn btn-warning btn-sm" onclick='openRooms(${r.id},"${r.name}")'>房型</button>`
                    : ''}
                  <button class="btn btn-danger btn-sm" onclick="deleteItem('${key}', ${r.id})">停用</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Modal (reference data) ────────────────────────────────────────────────────
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
    } catch (e) { toast('儲存失敗：' + e.message, 'error'); }
  };
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  modalCallback = null;
}
function confirmModal() { if (modalCallback) modalCallback(); }

async function deleteItem(key, id) {
  const cfg = TABS[key];
  if (!confirm(`確定要停用這筆${cfg.label}資料嗎？`)) return;
  try {
    await apiFetch(`${cfg.endpoint}/${id}`, { method: 'DELETE' });
    toast('已停用'); loadData(currentTab);
  } catch (e) { toast('操作失敗', 'error'); }
}

// ── Room Management ───────────────────────────────────────────────────────────
let _currentAccId = null, _currentAccName = '';

async function openRooms(accId, accName) {
  _currentAccId = accId; _currentAccName = accName;
  await renderRoomsPanel();
}

async function renderRoomsPanel() {
  const rooms = await apiFetch(`/api/accommodations/${_currentAccId}/rooms`);
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="flex-between mb-2">
      <div>
        <button class="btn btn-outline btn-sm" onclick="switchTab('accommodations')" style="margin-right:8px">← 返回住宿清單</button>
        <span class="page-title" style="font-size:1.1rem;display:inline">🏨 ${_currentAccName} — 房型管理</span>
      </div>
      <button class="btn btn-primary" onclick="openRoomModal()">＋ 新增房型</button>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>房型</th><th>房號</th><th>每晚價格</th><th>操作</th></tr></thead>
        <tbody>
          ${rooms.length === 0
            ? `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">尚未設定房型，點右上角新增</td></tr>`
            : rooms.map(r => `
              <tr>
                <td><strong>${r.room_type}</strong></td>
                <td>${r.room_number || '—'}</td>
                <td>$${fmt(r.price)} / 晚</td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-outline btn-sm" onclick='openRoomModal(${JSON.stringify(r)})'>編輯</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRoom(${r.id})">停用</button>
                  </div>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openRoomModal(existing = null) {
  const isEdit = !!existing;
  document.getElementById('modal-title').textContent = isEdit ? '編輯房型' : '新增房型';
  const TYPES = ['單人房', '雙人房', '雙床房', '三人房', '四人房', '六人房', '通舖', '套房'];
  document.getElementById('modal-form').innerHTML = `
    <div class="form-group">
      <label class="form-label">房型 <span class="required">*</span></label>
      <select class="form-control" name="room_type">
        ${TYPES.map(t => `<option ${t === (existing?.room_type||'雙人房') ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">房號（可填多個以逗號分隔，如 102,301）</label>
      <input class="form-control" name="room_number" value="${existing?.room_number||''}" placeholder="例：102">
    </div>
    <div class="form-group">
      <label class="form-label">每晚價格（元）<span class="required">*</span></label>
      <input class="form-control" type="number" name="price" value="${existing?.price||0}" min="0">
    </div>`;

  modalCallback = async () => {
    const fd = new FormData(document.getElementById('modal-form'));
    const payload = {
      room_type: fd.get('room_type'),
      room_number: fd.get('room_number'),
      price: parseInt(fd.get('price')) || 0,
    };
    try {
      if (isEdit) {
        await apiFetch(`/api/accommodations/rooms/${existing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('房型已更新');
      } else {
        await apiFetch(`/api/accommodations/${_currentAccId}/rooms`, { method: 'POST', body: JSON.stringify(payload) });
        toast('房型已新增');
      }
      closeModal(); renderRoomsPanel();
    } catch (e) { toast('儲存失敗：' + e.message, 'error'); }
  };
  document.getElementById('modal-overlay').classList.add('open');
}

async function deleteRoom(roomId) {
  if (!confirm('確定要停用這個房型嗎？')) return;
  try {
    await apiFetch(`/api/accommodations/rooms/${roomId}`, { method: 'DELETE' });
    toast('已停用'); renderRoomsPanel();
  } catch (e) { toast('操作失敗', 'error'); }
}

// ── User Management (admin only) ──────────────────────────────────────────────
async function loadUsers() {
  const users = await apiFetch('/api/users');
  const container = document.getElementById('admin-content');
  const ROLE_LABEL = { admin: '主要管理者', editor: '行程編輯者', viewer: '行程確認者' };
  const ROLE_COLOR = { admin: 'var(--ocean)', editor: 'var(--success)', viewer: 'var(--warning)' };
  container.innerHTML = `
    <div class="flex-between mb-2">
      <div class="page-title" style="margin:0;font-size:1.1rem">👥 帳號管理（${users.length} 個帳號）</div>
      <button class="btn btn-primary" onclick="openUserModal()">＋ 新增帳號</button>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>帳號</th><th>顯示名稱</th><th>角色</th><th>狀態</th><th>建立時間</th><th>操作</th></tr></thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><strong>${u.username}</strong></td>
              <td>${u.display_name || '—'}</td>
              <td><span style="color:${ROLE_COLOR[u.role]||'#333'};font-weight:600">${ROLE_LABEL[u.role]||u.role}</span></td>
              <td>${u.is_active ? '<span style="color:var(--success)">●</span> 啟用' : '<span style="color:var(--muted)">●</span> 停用'}</td>
              <td style="font-size:0.82rem;color:var(--muted)">${u.created_at}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-outline btn-sm" onclick='openUserModal(${JSON.stringify(u)})'>編輯</button>
                  ${u.id !== window.currentUser?.id
                    ? `<button class="btn btn-danger btn-sm" onclick="deactivateUser(${u.id},'${u.username}')">${u.is_active ? '停用' : '已停用'}</button>`
                    : '<span style="font-size:0.75rem;color:var(--muted)">(自己)</span>'}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="background:var(--bg);border-radius:8px;padding:14px;margin-top:16px;font-size:0.83rem;color:var(--muted)">
      <strong>角色說明：</strong>
      　🔑 <strong>主要管理者</strong>：全部功能（規劃行程、所有報價、後台管理、帳號管理、操作記錄）
      　✏️ <strong>行程編輯者</strong>：僅後台管理（景點/餐廳/交通/住宿）
      　👁️ <strong>行程確認者</strong>：僅瀏覽所有報價
    </div>`;
}

function openUserModal(existing = null) {
  const isEdit = !!existing;
  document.getElementById('modal-title').textContent = isEdit ? '編輯帳號' : '新增帳號';
  document.getElementById('modal-form').innerHTML = `
    <div class="form-group">
      <label class="form-label">帳號 <span class="required">*</span></label>
      <input class="form-control" name="username" value="${existing?.username||''}" ${isEdit ? 'readonly' : 'placeholder="英文/數字"'}>
    </div>
    <div class="form-group">
      <label class="form-label">顯示名稱</label>
      <input class="form-control" name="display_name" value="${existing?.display_name||''}" placeholder="姓名或暱稱">
    </div>
    <div class="form-group">
      <label class="form-label">角色 <span class="required">*</span></label>
      <select class="form-control" name="role">
        <option value="admin"  ${existing?.role==='admin'  ?'selected':''}>主要管理者</option>
        <option value="editor" ${existing?.role==='editor' ?'selected':''}>行程編輯者</option>
        <option value="viewer" ${(!existing||existing?.role==='viewer')?'selected':''}>行程確認者</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">${isEdit ? '新密碼（留空不修改）' : '密碼 *'}</label>
      <input class="form-control" type="password" name="password" placeholder="${isEdit ? '留空保持原密碼' : '請設定登入密碼'}">
    </div>`;

  modalCallback = async () => {
    const fd = new FormData(document.getElementById('modal-form'));
    const payload = {
      display_name: fd.get('display_name'),
      role: fd.get('role'),
    };
    if (fd.get('password')) payload.password = fd.get('password');
    if (!isEdit) payload.username = fd.get('username');
    try {
      if (isEdit) {
        await apiFetch(`/api/users/${existing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('帳號已更新');
      } else {
        await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
        toast('帳號已新增');
      }
      closeModal(); loadUsers();
    } catch (e) { toast('儲存失敗：' + e.message, 'error'); }
  };
  document.getElementById('modal-overlay').classList.add('open');
}

async function deactivateUser(id, username) {
  if (!confirm(`確定要停用帳號「${username}」嗎？`)) return;
  try {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    toast('帳號已停用'); loadUsers();
  } catch (e) { toast('操作失敗：' + e.message, 'error'); }
}

// ── Activity Log (admin only) ─────────────────────────────────────────────────
async function loadLogs() {
  const logs = await apiFetch('/api/activity_logs?limit=300');
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="flex-between mb-2">
      <div class="page-title" style="margin:0;font-size:1.1rem">📋 操作記錄（最近 ${logs.length} 筆）</div>
      <input id="log-search" class="form-control" placeholder="🔍 搜尋帳號或操作…"
        style="max-width:240px" oninput="filterLogs()">
    </div>
    <div style="overflow-x:auto">
      <table class="data-table" id="logs-table">
        <thead><tr><th>時間</th><th>帳號</th><th>操作</th><th>類型</th><th>項目名稱</th><th>IP</th></tr></thead>
        <tbody id="logs-tbody">
          ${logs.map(l => `
            <tr>
              <td style="font-size:0.8rem;white-space:nowrap">${l.created_at}</td>
              <td><strong>${l.username}</strong></td>
              <td>${_actionBadge(l.action)}</td>
              <td>${l.target_type}</td>
              <td style="font-size:0.85rem">${l.target_name}</td>
              <td style="font-size:0.75rem;color:var(--muted)">${l.ip_address}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  window._logsData = logs;
}

function _actionBadge(action) {
  const map = { '登入':'success', '登出':'', '新增':'success', '修改':'warning', '停用':'danger' };
  const cls = map[action] ? `color:var(--${map[action]});font-weight:600` : 'color:var(--muted)';
  return `<span style="${cls}">${action}</span>`;
}

function filterLogs() {
  const q = document.getElementById('log-search')?.value.toLowerCase() || '';
  const rows = document.querySelectorAll('#logs-tbody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

window.addEventListener('DOMContentLoaded', init);
