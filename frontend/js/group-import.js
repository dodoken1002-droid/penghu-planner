(function () {
  let previewItems = [];
  let activeTripId = null;
  let initialized = false;

  const labels = {
    trip: '可匯入', cancelled: '取消團', reference: '參考資料',
    supporting: '附屬資料', review: '需人工確認',
  };

  function addStyles() {
    if (document.getElementById('group-import-styles')) return;
    const style = document.createElement('style');
    style.id = 'group-import-styles';
    style.textContent = `
      .group-import-modal{max-width:1100px;max-height:88vh;overflow:auto}
      .group-import-table{width:100%;border-collapse:collapse;font-size:.88rem}
      .group-import-table th,.group-import-table td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
      .group-import-table input[type=text],.group-import-table input[type=date],.group-import-table input[type=number]{min-width:120px;padding:6px;border:1px solid #d1d5db;border-radius:6px}
      .import-kind{white-space:nowrap;font-weight:600}.import-warning{color:#b45309;font-size:.78rem}
      .operations-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .operations-grid .wide{grid-column:1/-1}.operations-grid label{display:block;font-weight:600;margin-bottom:5px}
      .excel-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      @media(max-width:700px){.operations-grid{grid-template-columns:1fr}.excel-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function addUi() {
    if (document.getElementById('excel-import-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="excel-import-overlay">
        <div class="modal group-import-modal">
          <div class="modal-title">📥 接團 Excel 匯入預覽</div>
          <p class="text-muted">建議使用系統匯出的標準 Excel。分析只會預覽；按下「建立／更新勾選行程」後才寫入。</p>
          <input class="form-control" type="file" id="excel-import-file" accept=".xlsx">
          <div id="excel-import-summary" style="margin:12px 0"></div>
          <div id="excel-import-preview" style="overflow:auto"></div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeExcelImport()">取消</button>
            <button class="btn btn-primary" id="excel-preview-button" onclick="previewExcelImport()">分析檔案</button>
            <button class="btn btn-success" id="excel-import-confirm" onclick="confirmExcelImport()" style="display:none">建立／更新勾選行程</button>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="operations-overlay">
        <div class="modal group-import-modal">
          <div class="modal-title">🧳 團務資料</div>
          <div class="operations-grid" id="operations-form"></div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeTripOperations()">取消</button>
            <button class="btn btn-primary" onclick="saveTripOperations()">儲存團務資料</button>
          </div>
        </div>
      </div>`);
  }

  function injectOperationsButtons() {
    document.querySelectorAll('#trips-tbody tr').forEach(row => {
      const actions = row.querySelector('.actions');
      if (!actions || actions.querySelector('.operations-button')) return;
      const match = row.querySelector('td')?.textContent.match(/#(\d+)/);
      if (!match) return;
      const button = document.createElement('button');
      button.className = 'btn btn-outline btn-sm operations-button';
      button.textContent = '🧳 團務';
      button.onclick = () => openTripOperations(Number(match[1]));
      actions.prepend(button);
    });
  }

  function openImportModal() {
    previewItems = [];
    document.getElementById('excel-import-preview').innerHTML = '';
    document.getElementById('excel-import-summary').textContent = '';
    document.getElementById('excel-import-confirm').style.display = 'none';
    document.getElementById('excel-import-overlay').classList.add('open');
  }

  async function previewExcelImport() {
    const file = document.getElementById('excel-import-file').files[0];
    if (!file) return toast('請先選擇 Excel 檔', 'error');
    const button = document.getElementById('excel-preview-button');
    const form = new FormData();
    form.append('file', file);
    button.disabled = true;
    button.textContent = '分析中…';
    try {
      const response = await fetch('/api/trips/import/preview', {method: 'POST', body: form, credentials: 'include'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '分析失敗');
      previewItems = data.items;
      const counts = data.counts || {};
      document.getElementById('excel-import-summary').textContent =
        `共 ${data.total_sheets} 筆；可匯入／更新 ${counts.trip || 0}、取消 ${counts.cancelled || 0}、參考／附屬 ${(counts.reference || 0) + (counts.supporting || 0)}、待確認 ${counts.review || 0}`;
      renderPreview();
      document.getElementById('excel-import-confirm').style.display = '';
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = '重新分析';
    }
  }

  function renderPreview() {
    if (!previewItems.length) {
      document.getElementById('excel-import-preview').innerHTML = '<div class="import-warning">找不到可預覽的資料列，請下載空白範本確認欄位格式。</div>';
      return;
    }
    document.getElementById('excel-import-preview').innerHTML = `<table class="group-import-table"><thead><tr>
      <th>匯入</th><th>系統編號</th><th>分類</th><th>來源</th><th>團名</th><th>出發</th><th>回程</th><th>成人</th><th>辨識內容</th>
      </tr></thead><tbody>${previewItems.map((item, index) => `<tr>
        <td><input type="checkbox" ${item.selected ? 'checked' : ''} onchange="updateImportItem(${index},'selected',this.checked)"></td>
        <td>${item.trip_id || '新增'}</td>
        <td class="import-kind">${labels[item.kind] || item.kind}</td>
        <td>${escapeHtml(item.source_sheet)}${item.warning ? `<div class="import-warning">${escapeHtml(item.warning)}</div>` : ''}</td>
        <td><input type="text" value="${escapeHtml(item.group_name)}" onchange="updateImportItem(${index},'group_name',this.value)"></td>
        <td><input type="date" value="${item.trip_date || ''}" onchange="updateImportItem(${index},'trip_date',this.value)"></td>
        <td><input type="date" value="${item.return_date || ''}" onchange="updateImportItem(${index},'return_date',this.value)"></td>
        <td><input type="number" min="0" max="500" value="${item.adults || 0}" onchange="updateImportItem(${index},'adults',Number(this.value))" style="min-width:75px;width:75px"></td>
        <td>${escapeHtml((item.signals || []).join('、') || '尚未辨識')}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  function updateImportItem(index, field, value) { previewItems[index][field] = value; }

  async function confirmExcelImport() {
    const selected = previewItems.filter(item => item.selected);
    if (!selected.length) return toast('請至少勾選一團', 'error');
    if (!confirm(`確定處理 ${selected.length} 筆？有系統編號會更新原資料，沒有編號會建立新行程。`)) return;
    try {
      const result = await apiFetch('/api/trips/import', {method:'POST', body:JSON.stringify({items: previewItems})});
      toast(`已新增 ${result.created_count || 0} 筆、更新 ${result.updated_count || 0} 筆；略過 ${(result.skipped || []).length} 筆`);
      closeExcelImport();
      await loadTrips();
    } catch (error) { toast('匯入失敗，請確認欄位格式', 'error'); }
  }

  const fields = [
    ['group_name','團名'],['source_sheet','來源工作表'],['contact_channel','聯絡來源'],['sales_owner','承辦人'],
    ['outbound_transport','去程交通／航班'],['return_transport','回程交通／航班'],
    ['accommodation_details','住宿資訊'],['rooming_details','房型分配'],
    ['payment_status','付款狀態'],['deposit_amount','訂金金額','number'],['balance_amount','尾款金額','number'],
    ['special_requirements','特殊需求'],['supplier_notes','供應商／訂位備註'],
  ];

  async function openTripOperations(id) {
    activeTripId = id;
    document.getElementById('operations-overlay').classList.add('open');
    document.getElementById('operations-form').innerHTML = '載入中…';
    try {
      const data = await apiFetch(`/api/trips/${id}/operations`);
      document.getElementById('operations-form').innerHTML = fields.map(([key,label,type]) => {
        const wide = ['outbound_transport','return_transport','accommodation_details','rooming_details','special_requirements','supplier_notes'].includes(key);
        const value = escapeHtml(data[key] ?? '');
        return `<div class="${wide ? 'wide' : ''}"><label for="op-${key}">${label}</label>${wide
          ? `<textarea id="op-${key}" class="form-control" rows="2">${value}</textarea>`
          : `<input id="op-${key}" class="form-control" type="${type || 'text'}" min="0" value="${value}">`}</div>`;
      }).join('');
    } catch (error) { toast('團務資料載入失敗', 'error'); }
  }

  async function saveTripOperations() {
    if (!activeTripId) return;
    const data = {};
    fields.forEach(([key,,type]) => {
      const value = document.getElementById(`op-${key}`).value;
      data[key] = type === 'number' ? Number(value) : value;
    });
    try {
      await apiFetch(`/api/trips/${activeTripId}/operations`, {method:'PUT', body:JSON.stringify(data)});
      toast('團務資料已儲存');
      closeTripOperations();
      await loadTrips();
    } catch (error) { toast('團務資料儲存失敗', 'error'); }
  }

  function closeExcelImport() { document.getElementById('excel-import-overlay').classList.remove('open'); }
  function closeTripOperations() { activeTripId = null; document.getElementById('operations-overlay').classList.remove('open'); }

  function initialize() {
    if (initialized) return;
    initialized = true;
    addStyles();
    addUi();
    injectOperationsButtons();
    const tbody = document.getElementById('trips-tbody');
    if (tbody) new MutationObserver(injectOperationsButtons).observe(tbody, {childList:true, subtree:true});
  }

  Object.assign(window, {openImportModal, previewExcelImport, confirmExcelImport, updateImportItem,
    closeExcelImport, openTripOperations, saveTripOperations, closeTripOperations});

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initialize, {once: true});
  } else {
    initialize();
  }
})();
