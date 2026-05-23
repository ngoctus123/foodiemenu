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
    const name = Utils.escapeHtml(p.name);
    const desc = Utils.escapeHtml(p.description);
    const cat  = Utils.escapeHtml(p.category);
    return `
    <tr>
      <td>
        <img src="${Utils.safeImgSrc(p.image)}" alt="${name}" class="fm-table-img"
          onerror="this.src='img/placeholder.png'">
      </td>
      <td>
        <div class="fw-semibold">${name}</div>
        <div class="text-muted small">${desc}</div>
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

  _previewImage(p.image);
  _updateStatusButtons(p.available);
  adminState.bsModal.show();
}

function _clearForm() {
  ['f-name', 'f-price', 'f-image', 'f-desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cat = document.getElementById('f-category');
  if (cat) cat.value = 'Phở';
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
  const data = {
    name:        document.getElementById('f-name').value.trim(),
    price:       Number(document.getElementById('f-price').value),
    category:    document.getElementById('f-category').value,
    image:       document.getElementById('f-image').value.trim() ||
                 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
    description: document.getElementById('f-desc').value.trim(),
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
  // Dùng modal confirm tùy chỉnh (không dùng window.confirm)
  const el = document.getElementById('confirm-modal-body');
  if (el) el.textContent = `Bạn có chắc muốn xóa "${name}" không? Hành động này không thể hoàn tác.`;

  const confirmBtn = document.getElementById('confirm-delete-btn');
  if (confirmBtn) {
    // Gán id cần xóa vào nút
    confirmBtn.onclick = () => _doDelete(id, name);
  }

  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  modal.show();
}

async function _doDelete(id, name) {
  // Đóng confirm modal
  bootstrap.Modal.getInstance(document.getElementById('confirmModal'))?.hide();

  try {
    await API.deleteProduct(id);
    Utils.showToast(`Đã xóa "${name}"!`);
    await _loadProducts();
  } catch (e) {
    Utils.showToast(e.message || 'Lỗi khi xóa!', 'error');
  }
}
