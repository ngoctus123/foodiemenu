/**
 * admin.js — Logic trang quản trị (admin.html)
 * Quản lý: thống kê, bảng CRUD, modal thêm/sửa, xác nhận xóa
 */

// ── Trạng thái admin ──────────────────────────────────
const adminState = {
  products: [],       // danh sách sản phẩm hiện tại
  editId: null,       // null = đang thêm mới | number = đang sửa
  formAvailable: true,// trạng thái form: true = còn món
  bsModal: null,      // instance Bootstrap Modal
};

// ── Khởi tạo — được gọi bởi auth.js sau khi xác thực ─
// Guard flag đảm bảo event listeners không bị gán lại khi login nhiều lần
let _adminInitialized = false;

function initAdmin() {
  if (_adminInitialized) {
    // Đã khởi tạo trước đó — chỉ cần reload dữ liệu mới nhất
    _loadProducts();
    return;
  }
  _adminInitialized = true;

  adminState.bsModal = new bootstrap.Modal(document.getElementById('productModal'));
  _initTableSection();

  // Đóng modal → reset preview ảnh
  document.getElementById('productModal').addEventListener('hidden.bs.modal', () => {
    _hidePreview();
  });

  // Nhập URL ảnh → preview realtime
  document.getElementById('f-image').addEventListener('input', function () {
    _previewImage(this.value.trim());
  });

  // Delegation listener cho nút xóa — data-del-name đã được escapeHtml trước khi render
  document.getElementById('table-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-id]');
    if (!btn) return;
    confirmDelete(Number(btn.dataset.delId), btn.dataset.delName);
  });

  _loadProducts();
}

// ── Tải & Render ──────────────────────────────────────

async function _loadProducts() {
  _showTableLoading();
  try {
    adminState.products = await API.getProducts();
    _renderStats();
    _renderTable();
  } catch (e) {
    Utils.showToast('Lỗi tải dữ liệu!', 'error');
    _hideTableLoading();
  }
}

function _showTableLoading() {
  const el = document.getElementById('table-body');
  if (el) el.innerHTML = `
    <tr><td colspan="6" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
    </td></tr>`;
}

function _hideTableLoading() {
  const el = document.getElementById('table-body');
  if (el) el.innerHTML = `
    <tr><td colspan="6" class="text-center py-5 text-muted">
      Không có dữ liệu
    </td></tr>`;
}

// ── Thống kê ──────────────────────────────────────────
function _renderStats() {
  const p = adminState.products;
  const cats = new Set(p.map(x => x.category)).size;

  const data = [
    { num: p.length,                         lbl: 'Tổng số món',   color: 'var(--fm-primary)' },
    { num: p.filter(x => x.available).length, lbl: 'Còn phục vụ',  color: '#2E7D32' },
    { num: p.filter(x => !x.available).length,lbl: 'Hết món',       color: '#C62828' },
    { num: cats,                               lbl: 'Danh mục',      color: 'var(--fm-amber)' },
  ];

  const el = document.getElementById('admin-stats');
  if (!el) return;
  el.innerHTML = data.map(s => `
    <div class="col-6 col-md-3">
      <div class="fm-stat-card text-center">
        <div class="fm-stat-num" style="color:${s.color}">${s.num}</div>
        <div class="fm-stat-lbl">${s.lbl}</div>
      </div>
    </div>
  `).join('');
}

// ── Bảng sản phẩm ──────────────────────────────────────
function _renderTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  if (adminState.products.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="text-center py-5 text-muted">
        <div style="font-size:48px">🍽️</div>
        <p class="mt-2">Chưa có món ăn nào. Nhấn "＋ Thêm món mới" để bắt đầu!</p>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = adminState.products.map(p => {
    const name   = Utils.escapeHtml(p.name);
    const desc   = Utils.escapeHtml(p.description);
    const cat    = Utils.escapeHtml(p.category);
    const ptags  = Array.isArray(p.tags) ? p.tags : [];
    const tagHtml = ptags.map(t => {
      const tc = t === 'Bán chạy' ? 'hot' : t === 'Món mới' ? 'new' : 'sale';
      return `<span class="fm-tag fm-tag-${tc}">${Utils.escapeHtml(t)}</span>`;
    }).join(' ');
    return `
    <tr>
      <td>
        <img src="${Utils.safeImgSrc(p.image)}" alt="${name}" class="fm-table-img"
          onerror="this.src=Utils.PLACEHOLDER;this.onerror=null">
      </td>
      <td>
        <div class="fw-semibold">${name}</div>
        <div class="text-muted small">${desc}</div>
        ${tagHtml ? `<div class="mt-1 d-flex flex-wrap gap-1">${tagHtml}</div>` : ''}
      </td>
      <td><span class="fm-badge-cat">${cat}</span></td>
      <td class="fw-bold" style="color:var(--fm-primary)">${Utils.formatPrice(p.price)}</td>
      <td>
        <span class="fm-status-badge ${p.available ? 'available' : 'soldout'}">
          ● ${p.available ? 'Còn món' : 'Hết món'}
        </span>
      </td>
      <td>
        <div class="d-flex gap-1 flex-wrap">
          <button class="btn btn-sm fm-btn-outline" onclick="openEditModal(${p.id})">
            ✏ Sửa
          </button>
          <button class="btn btn-sm fm-btn-danger"
            data-del-id="${p.id}" data-del-name="${name}">
            🗑 Xóa
          </button>
        </div>
      </td>
    </tr>
  `}).join('');
}

// ── Modal Thêm / Sửa ──────────────────────────────────

/** Mở modal để thêm món mới */
function openAddModal() {
  adminState.editId = null;
  adminState.formAvailable = true;
  document.getElementById('modal-title').textContent = '➕ Thêm món mới';
  document.getElementById('save-btn-text').textContent = 'Thêm món';
  _clearForm();
  adminState.bsModal.show();
}

/** Mở modal để chỉnh sửa món đã có */
function openEditModal(id) {
  const p = adminState.products.find(x => x.id === id);
  if (!p) { Utils.showToast('Không tìm thấy món ăn', 'error'); return; }

  adminState.editId = id;
  adminState.formAvailable = p.available;
  document.getElementById('modal-title').textContent = '✏ Chỉnh sửa món';
  document.getElementById('save-btn-text').textContent = 'Lưu thay đổi';

  document.getElementById('f-name').value     = p.name;
  document.getElementById('f-price').value    = p.price;
  document.getElementById('f-category').value = p.category;
  document.getElementById('f-image').value    = p.image;
  document.getElementById('f-desc').value     = p.description;

  const fDetail = document.getElementById('f-detail');
  if (fDetail) fDetail.value = p.detail || '';
  const fIngr = document.getElementById('f-ingredients');
  if (fIngr) fIngr.value = p.ingredients || '';

  const ptags = Array.isArray(p.tags) ? p.tags : [];
  const elHot  = document.getElementById('f-tag-hot');
  const elNew  = document.getElementById('f-tag-new');
  const elSale = document.getElementById('f-tag-sale');
  if (elHot)  elHot.checked  = ptags.includes('Bán chạy');
  if (elNew)  elNew.checked  = ptags.includes('Món mới');
  if (elSale) elSale.checked = ptags.includes('Ưu đãi');

  _previewImage(p.image);
  _updateStatusButtons(p.available);
  adminState.bsModal.show();
}

function _clearForm() {
  ['f-name', 'f-price', 'f-image', 'f-desc', 'f-detail', 'f-ingredients'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['f-tag-hot', 'f-tag-new', 'f-tag-sale'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  const cat = document.getElementById('f-category');
  if (cat) cat.value = 'Khai vị';
  _hidePreview();
  _updateStatusButtons(true);
}

// Preview ảnh realtime
function _previewImage(url) {
  const wrap = document.getElementById('img-preview');
  const img  = document.getElementById('preview-img');
  if (!url) { _hidePreview(); return; }
  if (wrap) wrap.classList.remove('d-none');
  if (img) {
    img.src = url;
    img.onerror = () => _hidePreview();
  }
}

function _hidePreview() {
  const wrap = document.getElementById('img-preview');
  if (wrap) wrap.classList.add('d-none');
}

// Toggle trạng thái trong form
function setFormStatus(available) {
  adminState.formAvailable = available;
  _updateStatusButtons(available);
}

function _updateStatusButtons(available) {
  const btnA = document.getElementById('btn-available');
  const btnS = document.getElementById('btn-soldout');
  if (btnA) btnA.className = `btn flex-fill ${available ? 'fm-status-btn-active' : 'fm-status-btn-inactive'}`;
  if (btnS) btnS.className = `btn flex-fill ${!available ? 'fm-status-btn-danger-active' : 'fm-status-btn-inactive'}`;
}

// ── Lưu sản phẩm (Thêm / Cập nhật) ───────────────────
async function saveProduct() {
  const tags = [];
  if (document.getElementById('f-tag-hot')?.checked)  tags.push('Bán chạy');
  if (document.getElementById('f-tag-new')?.checked)  tags.push('Món mới');
  if (document.getElementById('f-tag-sale')?.checked) tags.push('Ưu đãi');

  const data = {
    name:        document.getElementById('f-name').value.trim(),
    price:       Number(document.getElementById('f-price').value),
    category:    document.getElementById('f-category').value,
    image:       document.getElementById('f-image').value.trim() ||
                 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
    description: document.getElementById('f-desc').value.trim(),
    detail:      document.getElementById('f-detail')?.value.trim() || '',
    ingredients: document.getElementById('f-ingredients')?.value.trim() || '',
    tags,
    available:   adminState.formAvailable,
  };

  // Validate
  const errors = Utils.validateProduct(data);
  if (errors.length > 0) {
    Utils.showToast(errors[0], 'error');
    return;
  }

  // Loading state
  const saveBtn = document.getElementById('save-btn');
  const saveTxt = document.getElementById('save-btn-text');
  if (saveBtn) saveBtn.disabled = true;
  if (saveTxt) saveTxt.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang lưu...`;

  try {
    if (adminState.editId) {
      await API.updateProduct(adminState.editId, data);
      Utils.showToast(`Đã cập nhật "${data.name}"! ✅`);
    } else {
      await API.createProduct(data);
      Utils.showToast(`Đã thêm "${data.name}" vào thực đơn! ✅`);
    }
    adminState.bsModal.hide();
    await _loadProducts();
  } catch (e) {
    Utils.showToast(e.message || 'Đã xảy ra lỗi!', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveTxt) saveTxt.textContent = adminState.editId ? 'Lưu thay đổi' : 'Thêm món';
  }
}

// ── Xóa sản phẩm ──────────────────────────────────────

/** Hiển thị confirm dialog trước khi xóa */
function confirmDelete(id, name) {
  _showConfirmModal(
    '🗑 Xác nhận xóa',
    `Bạn có chắc muốn xóa "${name}" không? Hành động này không thể hoàn tác.`,
    () => _doDelete(id, name)
  );
}

async function _doDelete(id, name) {
  _hideConfirmModal();
  try {
    await API.deleteProduct(id);
    Utils.showToast(`Đã xóa "${name}"!`);
    await _loadProducts();
  } catch (e) {
    Utils.showToast(e.message || 'Lỗi khi xóa!', 'error');
  }
}

// ── Reset dữ liệu mặc định ─────────────────────────────

/** Hiển thị confirm trước khi reset */
function confirmReset() {
  _showConfirmModal(
    '♻ Reset dữ liệu',
    `Khôi phục toàn bộ thực đơn về mặc định (v${API.getDataVersion()})? Tất cả món bạn đã thêm/sửa sẽ bị xóa.`,
    _doReset
  );
}

async function _doReset() {
  _hideConfirmModal();
  try {
    await API.resetData();
    Utils.showToast('Đã reset về thực đơn mặc định! ✅');
    await _loadProducts();
  } catch (e) {
    Utils.showToast('Lỗi khi reset!', 'error');
  }
}

// ── Confirm modal helper ───────────────────────────────

function _showConfirmModal(title, body, onConfirm) {
  const titleEl = document.getElementById('confirm-modal-title');
  const bodyEl  = document.getElementById('confirm-modal-body');
  const btn     = document.getElementById('confirm-delete-btn');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl)  bodyEl.textContent  = body;
  if (btn)     btn.onclick         = onConfirm;
  new bootstrap.Modal(document.getElementById('confirmModal')).show();
}

function _hideConfirmModal() {
  bootstrap.Modal.getInstance(document.getElementById('confirmModal'))?.hide();
}

// ── Admin section tabs ─────────────────────────────────

function switchAdminSection(section) {
  ['menu', 'tables'].forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.classList.toggle('d-none', s !== section);
    const btn = document.querySelector(`[data-admin-tab="${s}"]`);
    if (btn) btn.classList.toggle('active', s === section);
  });
  if (section === 'tables') _loadAdminTables();
}

// ── Quản lý bàn ────────────────────────────────────────

const _tableState = {
  tables:      [],
  editId:      null,    // null = adding | string = editing
  formVisible: true,
  bsModal:     null,
};

function _initTableSection() {
  _tableState.bsModal = new bootstrap.Modal(document.getElementById('tableModal'));

  // Delegation for all table action buttons
  document.getElementById('tables-admin-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-table-id],[data-action]');
    if (!btn) return;
    if (btn.dataset.delTableId) {
      confirmDeleteTable(btn.dataset.delTableId, btn.dataset.delTableName);
    } else if (btn.dataset.action === 'toggle-status') {
      toggleTableStatus(btn.dataset.tableId, btn.dataset.tableStatus);
    } else if (btn.dataset.action === 'toggle-visible') {
      toggleTableVisible(btn.dataset.tableId, btn.dataset.tableVisible === 'true');
    } else if (btn.dataset.action === 'edit-table') {
      openEditTableModal(btn.dataset.tableId);
    }
  });
}

async function _loadAdminTables() {
  const el = document.getElementById('tables-admin-grid');
  if (el) el.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-warning" role="status"></div></div>`;
  try {
    _tableState.tables = await API.getTables();
    _renderAdminTables();
  } catch {
    Utils.showToast('Lỗi tải danh sách bàn', 'error');
  }
}

function _renderAdminTables() {
  const el = document.getElementById('tables-admin-grid');
  if (!el) return;

  if (_tableState.tables.length === 0) {
    el.innerHTML = `<p class="text-center text-muted py-4">Chưa có bàn nào. Nhấn "Thêm bàn" để bắt đầu.</p>`;
    return;
  }

  el.innerHTML = `<div class="fm-admin-table-grid">${_tableState.tables.map(t => {
    const name      = Utils.escapeHtml(t.name);
    const escId     = Utils.escapeHtml(String(t.id));
    const escStatus = Utils.escapeHtml(String(t.status));
    const escVis    = Utils.escapeHtml(String(t.visible));
    const isServing  = t.status === 'serving';
    const isReserved = t.status === 'reserved';
    const isHidden   = !t.visible;
    const statusLbl  = isHidden ? '🚫 Ẩn' : isServing ? '🍽 Đang phục vụ' : isReserved ? '🔵 Đã đặt' : '✅ Trống';
    const cardCls    = isServing ? 'serving' : isReserved ? 'reserved' : '';
    const toggleLbl  = isServing ? '↩ Trống' : isReserved ? '↩ Về trống' : '🍽 Phục vụ';
    const toggleTtl  = isServing ? 'Đặt trống' : isReserved ? 'Hủy giữ chỗ, về trống' : 'Đặt đang phục vụ';
    return `
      <div class="fm-admin-table-card ${cardCls} ${isHidden ? 'hidden' : ''}">
        <div class="fm-admin-table-card-name">${name}</div>
        <div class="fm-admin-table-card-status">${statusLbl}</div>
        <div class="fm-admin-table-actions">
          <button class="btn btn-sm fm-btn-outline" title="${toggleTtl}"
            data-action="toggle-status" data-table-id="${escId}" data-table-status="${escStatus}">
            ${toggleLbl}
          </button>
          <button class="btn btn-sm fm-btn-outline" title="${isHidden ? 'Hiện bàn' : 'Ẩn bàn'}"
            data-action="toggle-visible" data-table-id="${escId}" data-table-visible="${escVis}">
            ${isHidden ? '👁 Hiện' : '🚫 Ẩn'}
          </button>
          <button class="btn btn-sm fm-btn-outline"
            data-action="edit-table" data-table-id="${escId}">
            ✏ Sửa
          </button>
          <button class="btn btn-sm fm-btn-danger"
            data-del-table-id="${escId}" data-del-table-name="${name}">
            🗑
          </button>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function openAddTableModal() {
  _tableState.editId = null;
  _tableState.formVisible = true;
  document.getElementById('table-modal-title').textContent = '➕ Thêm bàn';
  document.getElementById('table-save-btn-text').textContent = 'Thêm bàn';
  document.getElementById('f-table-name').value = '';
  _updateTableModalBtns(true);
  _tableState.bsModal.show();
}

function openEditTableModal(id) {
  const t = _tableState.tables.find(x => x.id === id);
  if (!t) { Utils.showToast('Không tìm thấy bàn', 'error'); return; }
  _tableState.editId = id;
  _tableState.formVisible = t.visible;
  document.getElementById('table-modal-title').textContent = '✏ Chỉnh sửa bàn';
  document.getElementById('table-save-btn-text').textContent = 'Lưu thay đổi';
  document.getElementById('f-table-name').value = t.name;
  _updateTableModalBtns(t.visible);
  _tableState.bsModal.show();
}

function setTableFormVisible(visible) {
  _tableState.formVisible = visible;
  _updateTableModalBtns(visible);
}

function _updateTableModalBtns(visible) {
  const btnV = document.getElementById('btn-table-visible');
  const btnH = document.getElementById('btn-table-hidden');
  if (btnV) btnV.className = `btn flex-fill ${visible ? 'fm-status-btn-active' : 'fm-status-btn-inactive'}`;
  if (btnH) btnH.className = `btn flex-fill ${!visible ? 'fm-status-btn-danger-active' : 'fm-status-btn-inactive'}`;
}

async function saveTable() {
  const name = document.getElementById('f-table-name').value.trim();
  if (!name) { Utils.showToast('Vui lòng nhập tên bàn!', 'error'); return; }

  const saveTxt = document.getElementById('table-save-btn-text');
  if (saveTxt) saveTxt.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang lưu...`;

  try {
    if (_tableState.editId) {
      await API.updateTable(_tableState.editId, { name, visible: _tableState.formVisible });
      Utils.showToast(`Đã cập nhật "${name}"! ✅`);
    } else {
      await API.addTable(name);
      Utils.showToast(`Đã thêm "${name}"! ✅`);
    }
    _tableState.bsModal.hide();
    await _loadAdminTables();
  } catch (e) {
    Utils.showToast(e.message || 'Đã xảy ra lỗi!', 'error');
  } finally {
    if (saveTxt) saveTxt.textContent = _tableState.editId ? 'Lưu thay đổi' : 'Thêm bàn';
  }
}

async function toggleTableStatus(id, currentStatus) {
  if (currentStatus === 'reserved') {
    const ok = window.confirm('Bàn này đang được giữ chỗ. Chuyển về trống sẽ hủy trạng thái đặt bàn. Tiếp tục?');
    if (!ok) return;
  }
  const newStatus = (currentStatus === 'serving' || currentStatus === 'reserved') ? 'empty' : 'serving';
  try {
    await API.updateTable(id, { status: newStatus });
    await _loadAdminTables();
  } catch (e) {
    Utils.showToast(e.message || 'Lỗi cập nhật trạng thái', 'error');
  }
}

async function toggleTableVisible(id, currentVisible) {
  try {
    await API.updateTable(id, { visible: !currentVisible });
    await _loadAdminTables();
  } catch (e) {
    Utils.showToast(e.message || 'Lỗi cập nhật hiển thị', 'error');
  }
}

function confirmDeleteTable(id, name) {
  const table = _tableState.tables.find(t => t.id === id);
  if (table && (table.status === 'reserved' || table.status === 'serving')) {
    Utils.showToast('Không thể xóa bàn đang đặt hoặc đang phục vụ. Hãy hoàn tất/hủy trạng thái bàn trước.', 'warning');
    return;
  }
  _showConfirmModal(
    '🗑 Xác nhận xóa bàn',
    `Bạn có chắc muốn xóa "${name}" không? Hành động này không thể hoàn tác.`,
    () => _doDeleteTable(id, name)
  );
}

async function _doDeleteTable(id, name) {
  _hideConfirmModal();
  try {
    await API.deleteTable(id);
    Utils.showToast(`Đã xóa "${name}"!`);
    await _loadAdminTables();
  } catch (e) {
    Utils.showToast(e.message || 'Lỗi khi xóa bàn!', 'error');
  }
}

function confirmResetTables() {
  _showConfirmModal(
    '♻ Reset danh sách bàn',
    'Khôi phục về Bàn 01–10 mặc định? Tất cả bàn bạn đã thêm/sửa sẽ bị xóa.',
    _doResetTables
  );
}

async function _doResetTables() {
  _hideConfirmModal();
  try {
    await API.resetTables();
    Utils.showToast('Đã reset về danh sách bàn mặc định! ✅');
    await _loadAdminTables();
  } catch {
    Utils.showToast('Lỗi khi reset bàn!', 'error');
  }
}
