/**
 * main.js — Logic trang khách hàng (index.html)
 * Quản lý: điều hướng trang, hiển thị sản phẩm, tìm kiếm/lọc, giỏ hàng, modal chi tiết
 */

// ── Hằng số ───────────────────────────────────────────
const CATEGORIES = ['Tất cả', 'Khai vị', 'Món chính', 'Bánh mặn', 'Bánh tráng miệng', 'Tráng miệng', 'Đồ uống lạnh', 'Đồ uống nóng', 'Set/Combo'];
const SELECTED_TABLE_KEY = 'fm_selected_table';


const RESTAURANT = {
  hotline:  '1800 1234',
  address:  '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
  email:    'info@foodiemenu.vn',
  facebook: '#',
  hours:    { weekday: '07:00 – 22:00', weekend: '06:30 – 23:00' },
  orderHours: { start: '06:00', end: '15:00' },
};

const REVIEWS = [
  { name: 'Nguyễn Thị Lan',  rating: 5, text: 'Phở bò ở đây ngon tuyệt! Nước dùng trong và ngọt, thịt tươi mềm. Sẽ quay lại nhiều lần nữa.' },
  { name: 'Trần Minh Khoa',  rating: 5, text: 'Set gia đình rất đáng tiền, phục vụ nhanh. Bánh cuốn nhân thịt ngon lắm!' },
  { name: 'Phạm Thu Hương',  rating: 4, text: 'Không gian ấm cúng, đồ ăn ngon và phong phú. Cà phê trứng là điểm nhấn đặc biệt.' },
  { name: 'Lê Văn Đức',      rating: 5, text: 'Order set văn phòng, ship nhanh đúng 20 phút như cam kết. Bún bò Huế đặc biệt ngon.' },
  { name: 'Vũ Thị Mai',      rating: 4, text: 'Bánh xèo miền Trung giòn thật sự, không bị nhão. Chè khúc bạch ngon mát.' },
  { name: 'Đỗ Hoàng Nam',    rating: 5, text: 'Ăn nộm bò khô thấy đúng vị miền Trung. Nhà hàng sạch, nhân viên nhiệt tình.' },
];

// ── Trạng thái ứng dụng ───────────────────────────────
const state = {
  products:      [],
  cart:          [],
  page:          'home',
  category:      'Tất cả',
  search:        '',
  priceFilter:   'all',    // 'all' | 'under50' | '50to100' | 'over100'
  sortBy:        'default', // 'default' | 'price-asc' | 'price-desc' | 'popular'
  selectedTable: null,     // { id, name, status } | null
};

let _detailModal = null;
let _storeStatusModal = null;
let _isOrdering = false;

// ── Khởi tạo ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  state.cart = Utils.loadCart();
  await _loadSelectedTable();
  await loadProducts();
  _detailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  _ensureStoreStatusModal();
  syncCartBadge();
  _updateTableChip();
  if (!state.selectedTable) {
    navigateTo('table');
  } else {
    navigateTo('home');
    _showClosedNoticeIfNeeded();
  }
});

// ── Event delegation (click) ──────────────────────────
document.addEventListener('click', (e) => {
  // Nút thêm trong modal chi tiết
  const modalAddBtn = e.target.closest('[data-modal-add-id]');
  if (modalAddBtn) {
    const product = state.products.find(p => p.id === Number(modalAddBtn.dataset.modalAddId));
    if (product) {
      addToCart(product);
      if (_detailModal) _detailModal.hide();
    }
    return;
  }
  // Nút thêm vào giỏ trên card
  const addBtn = e.target.closest('[data-add-id]');
  if (addBtn) {
    const product = state.products.find(p => p.id === Number(addBtn.dataset.addId));
    if (product) addToCart(product);
    return;
  }
  // Lọc danh mục (trang menu)
  const catBtn = e.target.closest('[data-cat]');
  if (catBtn) { filterByCategory(catBtn.dataset.cat); return; }
  // Chuyển sang menu với danh mục (trang home)
  const gotoCatBtn = e.target.closest('[data-goto-cat]');
  if (gotoCatBtn) { goToCategory(gotoCatBtn.dataset.gotoCat); return; }
  // Lọc giá
  const priceBtn = e.target.closest('[data-price]');
  if (priceBtn) { filterByPrice(priceBtn.dataset.price); return; }
  // Reset toàn bộ bộ lọc
  const resetBtn = e.target.closest('[data-reset-filters]');
  if (resetBtn) { clearSearch(); filterByCategory('Tất cả'); filterByPrice('all'); return; }
  // Popup cửa hàng đã đóng cửa
  const closeExitBtn = e.target.closest('[data-store-close-exit]');
  if (closeExitBtn) { _hideStoreStatusModal(); return; }
  const closeMenuBtn = e.target.closest('[data-store-close-menu]');
  if (closeMenuBtn) { _hideStoreStatusModal(); navigateTo('menu'); return; }
  // Nút +/- số lượng trong giỏ hàng
  const qtyBtn = e.target.closest('[data-cart-delta]');
  if (qtyBtn) { updateQty(Number(qtyBtn.dataset.cartId), Number(qtyBtn.dataset.cartDelta)); return; }
  // Nút xóa khỏi giỏ hàng
  const removeBtn = e.target.closest('[data-cart-remove]');
  if (removeBtn) { removeFromCart(Number(removeBtn.dataset.cartRemove)); return; }
  // Chọn bàn từ lưới bàn
  const tableCard = e.target.closest('[data-select-table]');
  if (tableCard) { selectTable(tableCard.dataset.selectTable); return; }
  // Click card để xem chi tiết
  const card = e.target.closest('[data-detail-id]');
  if (card) {
    openProductModal(Number(card.dataset.detailId));
  }
});

// ── Trạng thái giờ bán hàng ─────────────────────────────────────────────
function _parseTimeToMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

function _getStoreStatus(now = new Date()) {
  const start = _parseTimeToMinutes(RESTAURANT.orderHours.start);
  const end = _parseTimeToMinutes(RESTAURANT.orderHours.end);
  const current = now.getHours() * 60 + now.getMinutes();
  const isOpen = start <= end
    ? current >= start && current < end
    : current >= start || current < end;
  return { isOpen, label: `${RESTAURANT.orderHours.start} - ${RESTAURANT.orderHours.end}` };
}

function _isStoreOpen() {
  return _getStoreStatus().isOpen;
}

function _ensureStoreStatusModal() {
  if (_storeStatusModal || document.getElementById('storeStatusModal')) return;

  const modalWrap = document.createElement('div');
  modalWrap.className = 'modal fade';
  modalWrap.id = 'storeStatusModal';
  modalWrap.tabIndex = -1;
  modalWrap.setAttribute('aria-hidden', 'true');
  modalWrap.innerHTML = `
    <div class="modal-dialog fm-store-status-dialog">
      <div class="modal-content fm-store-status-modal">
        <div class="fm-store-status-icon"><i class="bi bi-moon-stars"></i></div>
        <h2 class="fm-store-status-title">Cửa hàng đã đóng cửa</h2>
        <p class="fm-store-status-hours">Giờ nhận đơn: ${RESTAURANT.orderHours.start} - ${RESTAURANT.orderHours.end}</p>
        <p class="fm-store-status-copy">Bạn vẫn có thể xem thực đơn và lưu món yêu thích để đặt khi cửa hàng mở lại.</p>
        <div class="fm-store-status-actions">
          <button type="button" class="btn fm-store-status-exit" data-store-close-exit>Thoát</button>
          <button type="button" class="btn fm-store-status-menu" data-store-close-menu>Xem thực đơn</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalWrap);
  _storeStatusModal = new bootstrap.Modal(modalWrap);
}

function _showStoreStatusModal() {
  _ensureStoreStatusModal();
  if (_storeStatusModal) _storeStatusModal.show();
}

function _hideStoreStatusModal() {
  if (_storeStatusModal) _storeStatusModal.hide();
}

function _showClosedNoticeIfNeeded() {
  if (!_isStoreOpen()) _showStoreStatusModal();
}

// ── Tải dữ liệu ───────────────────────────────────────
async function loadProducts() {
  try {
    state.products = await API.getProducts();
  } catch (e) {
    Utils.showToast('Lỗi tải dữ liệu sản phẩm!', 'error');
    state.products = [];
  }
}

// ── Điều hướng ────────────────────────────────────────
function navigateTo(page) {
  state.page = page;
  ['home', 'menu', 'cart', 'table', 'history'].forEach(p => {
    const el = document.getElementById(`view-${p}`);
    if (el) el.classList.toggle('d-none', p !== page);
  });
  setNavActive(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'home')    renderHome();
  else if (page === 'menu')    renderMenu();
  else if (page === 'cart')    renderCart();
  else if (page === 'table')   renderTableSelection();
  else if (page === 'history') renderHistory();
}

function setNavActive(page) {
  ['home', 'menu', 'history'].forEach(p => {
    const btn = document.getElementById(`nav-${p}`);
    if (btn) btn.classList.toggle('active', p === page);
  });
}

// ── Modal chi tiết sản phẩm ───────────────────────────
function openProductModal(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  const body = document.getElementById('product-detail-body');
  if (body) body.innerHTML = _buildProductModalHTML(p);
  if (_detailModal) _detailModal.show();
}

function _buildProductModalHTML(p) {
  const name   = Utils.escapeHtml(p.name);
  const cat    = Utils.escapeHtml(p.category);
  const desc   = Utils.escapeHtml(p.detail || p.description);
  const ingr   = p.ingredients ? Utils.escapeHtml(p.ingredients) : '';
  const tags   = Array.isArray(p.tags) ? p.tags : [];
  const tagHtml = tags.map(t => `<span class="fm-tag fm-tag-${_tagClass(t)}">${Utils.escapeHtml(t)}</span>`).join('');

  const addBtn = p.available
    ? `<button class="btn fm-btn-primary px-4 py-2" data-modal-add-id="${p.id}">＋ Thêm vào giỏ</button>`
    : `<span class="fm-sold-badge px-4" style="padding-top:9px;padding-bottom:9px;font-size:14px">Tạm hết món</span>`;

  return `
    <div class="fm-detail-img">
      <img src="${Utils.safeImgSrc(p.image)}" alt="${name}" onerror="this.src=Utils.PLACEHOLDER;this.onerror=null">
      ${!p.available ? '<div class="fm-sold-overlay"><span>Hết món</span></div>' : ''}
    </div>
    <div class="fm-detail-body">
      <div class="d-flex align-items-start justify-content-between gap-2 mb-1 flex-wrap">
        <h4 class="fm-detail-title mb-0">${name}</h4>
        <span class="fm-badge-cat">${cat}</span>
      </div>
      ${tagHtml ? `<div class="mb-2 d-flex flex-wrap gap-1">${tagHtml}</div>` : ''}
      <div class="fm-detail-price">${Utils.formatPrice(p.price)}</div>
      <p class="fm-detail-desc">${desc}</p>
      ${ingr ? `
        <div class="fm-detail-section">
          <div class="fm-detail-section-title">🥬 Thành phần</div>
          <p class="text-muted small mb-0">${ingr}</p>
        </div>` : ''}
      <div class="d-flex align-items-center justify-content-between mt-4 flex-wrap gap-2">
        ${addBtn}
        <span class="text-muted small">${p.available ? '✅ Còn phục vụ' : '❌ Tạm hết món'}</span>
      </div>
    </div>
  `;
}

function _tagClass(tag) {
  if (tag === 'Bán chạy') return 'hot';
  if (tag === 'Món mới')  return 'new';
  if (tag === 'Ưu đãi')   return 'sale';
  return 'default';
}

// ── Trang Chủ ─────────────────────────────────────────
function renderHome() {
  const el = document.getElementById('view-home');
  if (!el) return;

  const featured = state.products.filter(p => p.available && Array.isArray(p.tags) && p.tags.includes('Bán chạy')).slice(0, 8);
  const combos   = state.products.filter(p => p.category === 'Set/Combo');

  el.innerHTML = `
    <!-- Hero -->
    <section class="fm-hero">
      <div class="fm-hero-bg"></div>
      <div class="container position-relative text-center py-2">
        <h1 class="fm-hero-title">Thực đơn <em>ngon</em><br>giao tận nơi</h1>
        <p class="fm-hero-sub">Khám phá hàng trăm món ăn đậm đà hương vị Việt Nam<br>từ khai vị, món chính đến tráng miệng và đồ uống đặc sắc</p>
        <div class="fm-search-hero mx-auto">
          <i class="bi bi-search fm-si"></i>
          <input class="fm-sinput" placeholder="Tìm kiếm món ăn yêu thích..."
            oninput="heroSearch(this.value)" autocomplete="off">
        </div>
        <div class="fm-hero-badges d-flex justify-content-center flex-wrap gap-3 mt-4">
          <span class="fm-hero-badge"><i class="bi bi-telephone-fill me-1"></i>${RESTAURANT.hotline}</span>
          <span class="fm-hero-badge"><i class="bi bi-clock-fill me-1"></i>T2–T6: ${RESTAURANT.hours.weekday}</span>
          <span class="fm-hero-badge"><i class="bi bi-geo-alt-fill me-1"></i>${Utils.escapeHtml(RESTAURANT.address)}</span>
        </div>
      </div>
    </section>

    <div class="container-xl py-5 px-3 px-md-4">

      <!-- Điểm nổi bật -->
      <div class="row g-3 mb-5">
        ${[
          { ico: '🍜', h: 'Hương vị chuẩn vị',  t: 'Công thức gia truyền, nguyên liệu tươi mỗi ngày' },
          { ico: '🚀', h: 'Giao hàng nhanh',     t: '30 phút có mặt tại địa chỉ của bạn' },
          { ico: '💳', h: 'Thanh toán dễ',        t: 'Nhận nhiều hình thức thanh toán tiện lợi' },
          { ico: '⭐', h: 'Đánh giá 5 sao',       t: 'Hơn 10.000 khách hàng hài lòng mỗi tháng' },
        ].map(f => `
          <div class="col-6 col-md-3">
            <div class="fm-feat-card text-center h-100">
              <div class="fm-feat-ico">${f.ico}</div>
              <h6 class="fw-bold mb-1">${f.h}</h6>
              <p class="text-muted small mb-0">${f.t}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Danh mục -->
      <h2 class="fm-section-title">Danh mục món ăn</h2>
      <p class="text-muted small mb-3">Chọn món theo sở thích</p>
      <div class="d-flex flex-wrap gap-2 mb-5">
        ${['Khai vị','Món chính','Bánh mặn','Bánh tráng miệng','Tráng miệng','Đồ uống lạnh','Đồ uống nóng','Set/Combo'].map(c => `
          <button class="btn fm-cat-pill" data-goto-cat="${Utils.escapeHtml(c)}">
            ${Utils.getCategoryIcon(c)} ${Utils.escapeHtml(c)}
          </button>
        `).join('')}
      </div>

      <!-- Món bán chạy -->
      <h2 class="fm-section-title">🔥 Món bán chạy</h2>
      <p class="text-muted small mb-3">Được yêu thích nhất tháng này</p>
      <div class="row g-3 mb-4">
        ${featured.map(p => `<div class="col-6 col-md-4 col-xl-3">${buildProductCard(p)}</div>`).join('')}
      </div>
      <div class="text-center mb-5">
        <button class="btn fm-btn-primary px-4 py-2 fs-6" onclick="navigateTo('menu')">
          Xem tất cả thực đơn <i class="bi bi-arrow-right ms-1"></i>
        </button>
      </div>

      <!-- Set & Combo -->
      ${combos.length ? `
      <div class="mb-5">
        <div class="d-flex justify-content-between align-items-end mb-3 flex-wrap gap-2">
          <div>
            <h2 class="fm-section-title mb-1">🎁 Set & Combo ưu đãi</h2>
            <p class="text-muted small mb-0">Tiết kiệm hơn khi đặt combo — giao nhanh trong 30 phút</p>
          </div>
          <button class="btn fm-btn-outline btn-sm" data-goto-cat="Set/Combo">Xem tất cả</button>
        </div>
        <div class="row g-3">
          ${combos.map(p => `<div class="col-12 col-md-6 col-xl-3">${_buildComboCard(p)}</div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Đánh giá -->
      <div class="mb-5">
        <h2 class="fm-section-title mb-1">💬 Khách hàng nói gì?</h2>
        <p class="text-muted small mb-4">Đánh giá thực tế từ khách hàng</p>
        <div class="row g-3">
          ${REVIEWS.map(r => `
            <div class="col-12 col-md-6 col-xl-4">
              <div class="fm-review-card">
                <div class="fm-review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                <p class="fm-review-text">"${Utils.escapeHtml(r.text)}"</p>
                <div class="fm-review-author">
                  <div class="fm-review-avatar">${Utils.escapeHtml(r.name.charAt(0))}</div>
                  <span class="fw-semibold small">${Utils.escapeHtml(r.name)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Thông tin nhà hàng -->
      ${_renderRestaurantInfo()}

    </div>
  `;
}

function _renderRestaurantInfo() {
  return `
    <div class="mb-4">
      <h2 class="fm-section-title mb-1">📍 Thông tin nhà hàng</h2>
      <p class="text-muted small mb-4">Liên hệ và đặt bàn</p>
      <div class="row g-3">
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="fm-info-card">
            <div class="fm-info-icon">📞</div>
            <div class="fm-info-label">Hotline</div>
            <div class="fm-info-value">
              <a href="tel:18001234" style="color:var(--fm-primary);font-weight:700;text-decoration:none">${RESTAURANT.hotline}</a>
              <div class="text-muted small mt-1">Miễn phí cuộc gọi</div>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="fm-info-card">
            <div class="fm-info-icon">⏰</div>
            <div class="fm-info-label">Giờ mở cửa</div>
            <div class="fm-info-value">
              <div>T2 – T6: <strong>${RESTAURANT.hours.weekday}</strong></div>
              <div>T7 – CN: <strong>${RESTAURANT.hours.weekend}</strong></div>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="fm-info-card">
            <div class="fm-info-icon">📍</div>
            <div class="fm-info-label">Địa chỉ</div>
            <div class="fm-info-value">${Utils.escapeHtml(RESTAURANT.address)}</div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="fm-info-card">
            <div class="fm-info-icon">✉️</div>
            <div class="fm-info-label">Liên hệ</div>
            <div class="fm-info-value">
              <a href="mailto:${RESTAURANT.email}" style="color:var(--fm-primary);text-decoration:none">${RESTAURANT.email}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _buildComboCard(p) {
  const name = Utils.escapeHtml(p.name);
  const desc = Utils.escapeHtml(p.description);
  const info = p.comboInfo;
  return `
    <div class="fm-combo-card h-100">
      <div class="fm-combo-img">
        <img src="${Utils.safeImgSrc(p.image)}" alt="${name}" onerror="this.src=Utils.PLACEHOLDER;this.onerror=null">
        ${info && info.savings ? `<div class="fm-combo-badge">-${Utils.escapeHtml(info.savings)}</div>` : ''}
      </div>
      <div class="fm-combo-body">
        <h5 class="fm-combo-title">${name}</h5>
        <p class="fm-combo-desc">${desc}</p>
        ${info && info.includes ? `
          <ul class="fm-combo-list">
            ${info.includes.map(i => `<li>${Utils.escapeHtml(i)}</li>`).join('')}
          </ul>` : ''}
        <div class="d-flex align-items-center justify-content-between mt-auto pt-3">
          <span class="fm-price">${Utils.formatPrice(p.price)}</span>
          <button class="btn fm-add-btn" data-add-id="${p.id}">＋ Thêm</button>
        </div>
      </div>
    </div>
  `;
}

function heroSearch(val) {
  state.search = val.trim();
  if (state.search) {
    navigateTo('menu');
    const inp = document.getElementById('menu-search');
    if (inp) inp.value = state.search;
    applyFilters();
  }
}

function goToCategory(cat) {
  state.category = cat;
  state.search = '';
  navigateTo('menu');
}

// ── Trang Thực Đơn ────────────────────────────────────
function renderMenu() {
  const el = document.getElementById('view-menu');
  if (!el) return;

  el.innerHTML = `
    <div class="container-xl py-4 px-3 px-md-4">
      <h2 class="fm-section-title">Thực đơn</h2>
      <p class="text-muted small mb-3" id="menu-count">Đang tải...</p>

      <!-- Tìm kiếm -->
      <div class="fm-search-bar mb-3">
        <i class="bi bi-search fm-si"></i>
        <input class="fm-sinput fm-sinput-flat" id="menu-search"
          placeholder="Tìm kiếm món ăn..." value="${Utils.escapeHtml(state.search)}"
          oninput="onSearch(this.value)" autocomplete="off">
        <button class="fm-search-clear" id="search-clear-btn"
          onclick="clearSearch()" title="Xóa tìm kiếm"
          style="${state.search ? '' : 'display:none'}">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Bộ lọc danh mục -->
      <div class="d-flex flex-wrap gap-2 mb-3" id="cat-pills">
        ${CATEGORIES.map(c => `
          <button class="btn fm-cat-pill ${state.category === c ? 'active' : ''}"
            data-cat="${Utils.escapeHtml(c)}">${Utils.escapeHtml(c)}</button>
        `).join('')}
      </div>

      <!-- Lọc giá + Sắp xếp -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
        <div class="d-flex flex-wrap gap-1">
          ${[
            { val: 'all',      lbl: 'Tất cả giá' },
            { val: 'under50',  lbl: 'Dưới 50k' },
            { val: '50to100',  lbl: '50k–100k' },
            { val: 'over100',  lbl: 'Trên 100k' },
          ].map(f => `
            <button class="btn fm-price-pill ${state.priceFilter === f.val ? 'active' : ''}"
              data-price="${f.val}">${f.lbl}</button>
          `).join('')}
        </div>
        <div class="ms-auto">
          <select class="form-select form-select-sm fm-sort-select" onchange="sortProducts(this.value)">
            <option value="default"   ${state.sortBy === 'default'   ? 'selected' : ''}>Mặc định</option>
            <option value="price-asc" ${state.sortBy === 'price-asc' ? 'selected' : ''}>Giá thấp → cao</option>
            <option value="price-desc"${state.sortBy === 'price-desc'? 'selected' : ''}>Giá cao → thấp</option>
            <option value="popular"   ${state.sortBy === 'popular'   ? 'selected' : ''}>Bán chạy trước</option>
          </select>
        </div>
      </div>

      <!-- Lưới sản phẩm -->
      <div class="row g-3" id="product-grid">
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-warning" role="status">
            <span class="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    </div>
  `;

  applyFilters();
}

const _debouncedFilter = Utils.debounce(applyFilters, 280);

function onSearch(val) {
  state.search = val;
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = val ? '' : 'none';
  _debouncedFilter();
}

function clearSearch() {
  state.search = '';
  const inp = document.getElementById('menu-search');
  if (inp) inp.value = '';
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  applyFilters();
}

function filterByCategory(cat) {
  state.category = cat;
  document.querySelectorAll('#cat-pills .fm-cat-pill').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === cat);
  });
  applyFilters();
}

function filterByPrice(val) {
  state.priceFilter = val;
  document.querySelectorAll('.fm-price-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.price === val);
  });
  applyFilters();
}

function sortProducts(val) {
  state.sortBy = val;
  applyFilters();
}

function applyFilters() {
  const grid    = document.getElementById('product-grid');
  const countEl = document.getElementById('menu-count');
  if (!grid) return;

  const q = state.search.toLowerCase();
  let filtered = state.products.filter(p => {
    const matchCat    = state.category === 'Tất cả' || p.category === state.category;
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    const matchPrice  = _matchPrice(p.price, state.priceFilter);
    return matchCat && matchSearch && matchPrice;
  });

  if (state.sortBy === 'price-asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'popular') {
    filtered = [...filtered].sort((a, b) => {
      const aHot = (a.tags || []).includes('Bán chạy') ? 1 : 0;
      const bHot = (b.tags || []).includes('Bán chạy') ? 1 : 0;
      return bHot - aHot;
    });
  }

  if (countEl) countEl.textContent = `${filtered.length} món ăn`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="fm-empty text-center py-5">
          <div class="fm-empty-ico">🔍</div>
          <h5 class="fw-bold mt-3 mb-1">Không tìm thấy món ăn</h5>
          <p class="text-muted">Thử từ khóa khác hoặc bỏ bộ lọc</p>
          <button class="btn fm-btn-outline mt-2" data-reset-filters>
            Xem tất cả
          </button>
        </div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="col-6 col-md-4 col-lg-3">${buildProductCard(p)}</div>
  `).join('');
}

function _matchPrice(price, filter) {
  if (filter === 'all')      return true;
  if (filter === 'under50')  return price < 50000;
  if (filter === '50to100')  return price >= 50000 && price <= 100000;
  if (filter === 'over100')  return price > 100000;
  return true;
}

// ── Product Card ──────────────────────────────────────
function buildProductCard(p) {
  const name     = Utils.escapeHtml(p.name);
  const category = Utils.escapeHtml(p.category);
  const desc     = Utils.escapeHtml(p.description);
  const tags     = Array.isArray(p.tags) ? p.tags : [];
  const tagHtml  = tags.map(t => `<span class="fm-tag fm-tag-${_tagClass(t)}">${Utils.escapeHtml(t)}</span>`).join('');

  const addBtn = p.available
    ? `<button class="btn fm-add-btn" data-add-id="${p.id}">＋ Thêm</button>`
    : `<span class="fm-sold-badge">Hết món</span>`;

  return `
    <div class="fm-card h-100" data-detail-id="${p.id}" style="cursor:pointer">
      <div class="fm-card-img">
        <img src="${Utils.safeImgSrc(p.image)}" alt="${name}" loading="lazy"
          onerror="this.src=Utils.PLACEHOLDER;this.onerror=null">
        ${!p.available ? '<div class="fm-sold-overlay"><span>Hết món</span></div>' : ''}
        ${tagHtml ? `<div class="fm-card-tags">${tagHtml}</div>` : ''}
      </div>
      <div class="fm-card-body d-flex flex-column">
        <div class="d-flex align-items-start justify-content-between gap-1 mb-1">
          <div class="fm-card-name">${name}</div>
          <span class="fm-badge-cat flex-shrink-0">${category}</span>
        </div>
        <p class="fm-card-desc flex-grow-1">${desc}</p>
        <div class="d-flex align-items-center justify-content-between mt-2">
          <span class="fm-price">${Utils.formatPrice(p.price)}</span>
          ${addBtn}
        </div>
      </div>
    </div>
  `;
}

// ── Giỏ Hàng ──────────────────────────────────────────
function addToCart(product) {
  if (_isOrdering) {
    Utils.showToast('Đang xử lý đơn hàng, vui lòng đợi...', 'warning');
    return;
  }
  if (!state.selectedTable) {
    Utils.showToast('Vui lòng chọn bàn trước khi gọi món! 🍽', 'warning');
    navigateTo('table');
    return;
  }
  if (!_isStoreOpen()) {
    _showStoreStatusModal();
    Utils.showToast('Cửa hàng đang ngoài giờ nhận đơn. Bạn vẫn có thể xem thực đơn.', 'warning');
    return;
  }

  const idx = state.cart.findIndex(i => i.id === product.id);
  if (idx > -1) {
    state.cart[idx].qty += 1;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }
  Utils.saveCart(state.cart);
  syncCartBadge();
  Utils.showToast(`Đã thêm "${product.name}" vào giỏ! 🛒`);
}

function updateQty(id, delta) {
  if (_isOrdering) return;
  state.cart = state.cart
    .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
    .filter(i => i.qty > 0);
  Utils.saveCart(state.cart);
  syncCartBadge();
  renderCart();
}

function removeFromCart(id) {
  if (_isOrdering) return;
  const item = state.cart.find(i => i.id === id);
  state.cart = state.cart.filter(i => i.id !== id);
  Utils.saveCart(state.cart);
  syncCartBadge();
  renderCart();
  if (item) Utils.showToast(`Đã xóa "${item.name}" khỏi giỏ`);
}

function syncCartBadge() {
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('d-none', count === 0);
  }
}

// ── Trang Giỏ Hàng ────────────────────────────────────
function renderCart() {
  const el = document.getElementById('view-cart');
  if (!el) return;

  const { cart } = state;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  if (cart.length === 0) {
    el.innerHTML = `
      <div class="container-xl py-5 px-3">
        <div class="fm-empty text-center py-5">
          <div class="fm-empty-ico">🛒</div>
          <h4 class="fw-bold mt-3 mb-2">Giỏ hàng trống</h4>
          <p class="text-muted mb-4">Hãy thêm vài món ăn ngon vào giỏ nhé!</p>
          <button class="btn fm-btn-primary px-4" onclick="navigateTo('menu')">Xem thực đơn</button>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="container-xl py-4 px-3 px-md-4">
      <h2 class="fm-section-title">Giỏ hàng</h2>
      <p class="text-muted small mb-4">${count} món · ${Utils.formatPrice(total)}</p>

      <div class="row g-4 align-items-start">
        <div class="col-lg-8">
          ${cart.map(item => `
            <div class="fm-cart-item">
              <img src="${Utils.safeImgSrc(item.image)}" alt="${Utils.escapeHtml(item.name)}">
              <div class="flex-grow-1 overflow-hidden">
                <div class="fw-bold text-truncate">${Utils.escapeHtml(item.name)}</div>
                <div class="text-muted small">${Utils.escapeHtml(item.category)}</div>
                <div class="fm-qty-ctrl mt-2">
                  <button class="fm-qty-btn" data-cart-delta="-1" data-cart-id="${item.id}">−</button>
                  <span class="fm-qty-val">${item.qty}</span>
                  <button class="fm-qty-btn" data-cart-delta="1" data-cart-id="${item.id}">+</button>
                </div>
              </div>
              <div class="text-end flex-shrink-0">
                <div class="fm-price mb-2">${Utils.formatPrice(item.price * item.qty)}</div>
                <button class="fm-remove-btn" data-cart-remove="${item.id}" title="Xóa">
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="col-lg-4">
          <div class="fm-summary">
            <h5 class="fm-summary-title mb-4">Đơn hàng</h5>
            ${cart.map(i => `
              <div class="d-flex justify-content-between mb-2 small">
                <span class="text-white-50">${Utils.escapeHtml(i.name)} ×${i.qty}</span>
                <span>${Utils.formatPrice(i.price * i.qty)}</span>
              </div>`).join('')}
            <hr class="border-secondary my-3">
            <div class="d-flex justify-content-between mb-2 small">
              <span class="text-white-50">Phí giao hàng</span>
              <span class="text-success fw-semibold">Miễn phí</span>
            </div>
            <div class="d-flex justify-content-between fw-bold mb-4" style="font-size:18px;color:var(--fm-amber)">
              <span>Tổng cộng</span>
              <span>${Utils.formatPrice(total)}</span>
            </div>
            <button class="btn fm-btn-primary w-100 py-2 fs-6" id="order-btn" onclick="placeOrder()">
              🛍 Đặt hàng ngay
            </button>
            <div class="fm-cart-note mt-3">
              <div class="d-flex align-items-center gap-2 mb-1">
                <i class="bi bi-telephone-fill" style="color:var(--fm-amber)"></i>
                <span>Hotline: <a href="tel:18001234" class="fw-bold" style="color:var(--fm-amber)">${RESTAURANT.hotline}</a></span>
              </div>
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi bi-clock-fill" style="color:var(--fm-amber)"></i>
                <span class="text-white-50 small">${RESTAURANT.hours.weekday} (T2–T6)</span>
              </div>
              <p class="text-white-50 small mb-0">
                ⚠ Đây là demo order. Liên hệ hotline để đặt hàng thực tế.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function placeOrder() {
  if (_isOrdering) return;
  if (!state.selectedTable) {
    Utils.showToast('Vui lòng chọn bàn trước khi đặt hàng!', 'warning');
    navigateTo('table');
    return;
  }
  if (!_isStoreOpen()) {
    _showStoreStatusModal();
    Utils.showToast('Cửa hàng đã đóng cửa, vui lòng quay lại trong giờ nhận đơn.', 'warning');
    return;
  }

  _isOrdering = true;

  const btn = document.getElementById('order-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...`;
  }

  // Chụp snapshot giỏ hàng ngay tại thời điểm xác nhận, trước khi await
  const orderItems = state.cart.map(i => ({
    id:    i.id,
    name:  i.name,
    qty:   Math.max(1, Math.floor(Number(i.qty)   || 1)),
    price: Math.max(0,             Number(i.price) || 0),
  }));
  const orderTotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  await new Promise(r => setTimeout(r, 1600));

  // Lưu đơn hàng — nếu thất bại thì khôi phục nút và báo lỗi, không clear cart
  try {
    await API.addOrder({
      tableId:   state.selectedTable.id,
      tableName: state.selectedTable.name,
      items:     orderItems,
      total:     orderTotal,
    });
  } catch (e) {
    _isOrdering = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🛍 Đặt hàng ngay';
    }
    Utils.showToast(e.message || 'Không thể lưu đơn hàng. Vui lòng thử lại!', 'error');
    return;
  }

  // Cập nhật trạng thái bàn — không quan trọng nếu thất bại
  try {
    await API.updateTable(state.selectedTable.id, { status: 'serving' });
    state.selectedTable = { ...state.selectedTable, status: 'serving' };
    localStorage.setItem(SELECTED_TABLE_KEY, JSON.stringify(state.selectedTable));
    _updateTableChip();
  } catch { /* trạng thái bàn không ảnh hưởng đến đơn hàng đã lưu */ }

  // Đơn đã lưu thành công — xóa giỏ và hiện màn thành công
  _isOrdering = false;
  state.cart = [];
  Utils.clearCart();
  syncCartBadge();

  const el = document.getElementById('view-cart');
  if (el) el.innerHTML = `
    <div class="container-xl py-5 px-3">
      <div class="fm-empty text-center py-5">
        <div class="fm-empty-ico">✅</div>
        <h4 class="fw-bold mt-3 mb-2">Đã đặt món thành công!</h4>
        <p class="text-muted mb-4">Cảm ơn bạn đã gọi món. Chúng tôi sẽ lên món trong ít phút nữa.</p>
        <button class="btn fm-btn-primary px-4" onclick="navigateTo('menu')">Đặt thêm món</button>
      </div>
    </div>`;
  Utils.showToast('Đã đặt món thành công! 🎉');
}

// ── Chọn bàn ──────────────────────────────────────────

async function _loadSelectedTable() {
  const saved = localStorage.getItem(SELECTED_TABLE_KEY);
  if (!saved) return;
  try {
    const savedData = JSON.parse(saved);
    const tables = await API.getVisibleTables();
    const found = tables.find(t => t.id === savedData.id);
    if (found) {
      state.selectedTable = found;
    } else {
      localStorage.removeItem(SELECTED_TABLE_KEY);
    }
  } catch {
    localStorage.removeItem(SELECTED_TABLE_KEY);
  }
}

async function selectTable(tableId) {
  try {
    const tables = await API.getVisibleTables();
    const table = tables.find(t => t.id === tableId);
    if (!table) { Utils.showToast('Không tìm thấy bàn', 'error'); return; }

    const isSameTable = state.selectedTable && state.selectedTable.id === tableId;
    if (!isSameTable && state.cart.length > 0) {
      // Giỏ có hàng, đang đổi sang bàn khác → hỏi giữ hay xóa giỏ
      _showTableChangeModal(
        table,
        () => _applyTableSelection(table, false),  // giữ giỏ
        () => _applyTableSelection(table, true)    // xóa giỏ
      );
      return;
    }
    _applyTableSelection(table, false);
  } catch {
    Utils.showToast('Lỗi khi chọn bàn', 'error');
  }
}

function _applyTableSelection(table, clearCart) {
  if (clearCart) {
    state.cart = [];
    Utils.clearCart();
    syncCartBadge();
  }
  state.selectedTable = table;
  localStorage.setItem(SELECTED_TABLE_KEY, JSON.stringify(table));
  _updateTableChip();
  const msg = clearCart
    ? `Đã chuyển sang ${table.name}. Giỏ hàng đã được xóa.`
    : `Đã chọn ${table.name}! 🍽`;
  Utils.showToast(msg);
  navigateTo('home');
  _showClosedNoticeIfNeeded();
}

function _showTableChangeModal(newTable, onKeep, onClear) {
  // Dọn instance cũ nếu còn
  const old = document.getElementById('tableChangeModal');
  if (old) { bootstrap.Modal.getInstance(old)?.dispose(); old.remove(); }

  const cartCount = state.cart.reduce((s, i) => s + i.qty, 0);
  const currentName = Utils.escapeHtml(state.selectedTable?.name || 'bàn hiện tại');
  const newName     = Utils.escapeHtml(newTable.name);

  const modalEl = document.createElement('div');
  modalEl.className = 'modal fade';
  modalEl.id = 'tableChangeModal';
  modalEl.tabIndex = -1;
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content fm-modal">
        <div class="modal-header border-0 pb-2">
          <h5 class="modal-title fm-modal-title" style="font-size:17px">Đổi sang ${newName}?</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body py-2">
          <p class="text-muted mb-0" style="font-size:14px">
            Giỏ hàng đang có <strong>${cartCount} món</strong> cho ${currentName}.
            Bạn muốn làm gì với giỏ khi chuyển sang ${newName}?
          </p>
        </div>
        <div class="modal-footer border-0 pt-2 flex-column gap-2">
          <button class="btn fm-btn-primary w-100" id="tc-keep-btn">
            ✅ Giữ giỏ & đổi sang ${newName}
          </button>
          <button class="btn fm-btn-danger w-100" id="tc-clear-btn">
            🗑 Xóa giỏ & đổi sang ${newName}
          </button>
          <button class="btn fm-btn-outline w-100" data-bs-dismiss="modal">
            Hủy, ở lại ${currentName}
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modalEl);

  const modal = new bootstrap.Modal(modalEl);
  modalEl.querySelector('#tc-keep-btn').addEventListener('click', () => { modal.hide(); onKeep(); });
  modalEl.querySelector('#tc-clear-btn').addEventListener('click', () => { modal.hide(); onClear(); });
  modalEl.addEventListener('hidden.bs.modal', () => { modal.dispose(); modalEl.remove(); });
  modal.show();
}

function _updateTableChip() {
  const chip = document.getElementById('nav-table-chip');
  if (!chip) return;
  if (state.selectedTable) {
    chip.innerHTML = `<i class="bi bi-table me-1"></i>${Utils.escapeHtml(state.selectedTable.name)}`;
    chip.title = 'Thay đổi bàn';
    chip.classList.add('fm-table-chip-active');
  } else {
    chip.innerHTML = `<i class="bi bi-table me-1"></i>Chọn bàn`;
    chip.title = 'Chọn bàn';
    chip.classList.remove('fm-table-chip-active');
  }
}

// ── Màn hình chọn bàn ─────────────────────────────────

async function renderTableSelection() {
  const el = document.getElementById('view-table');
  if (!el) return;

  el.innerHTML = `
    <div class="fm-table-selection-bg">
      <div class="container-xl py-5 px-3 px-md-4">
        <div class="text-center mb-5">
          <div class="fm-table-hero-icon">
            <img src="assets/icons/restaurant.png" alt="Bàn ăn" class="fm-table-icon-img">
          </div>
          <h2 class="fm-section-title mt-4 mb-1">Chọn bàn của bạn</h2>
          <p class="text-muted small">Chọn bàn để bắt đầu gọi món. Nhân viên sẽ phục vụ tại bàn.</p>
        </div>
        <div id="tables-grid" class="fm-tables-grid">
          <div class="col-12 text-center py-4">
            <div class="spinner-border text-warning" role="status"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const tables = await API.getVisibleTables();
    const grid = document.getElementById('tables-grid');
    if (!grid) return;

    if (tables.length === 0) {
      grid.innerHTML = `<p class="text-center text-muted py-4">Không có bàn nào khả dụng. Vui lòng liên hệ nhân viên.</p>`;
      return;
    }

    grid.innerHTML = tables.map(t => {
      const isSelected = state.selectedTable && state.selectedTable.id === t.id;
      const isServing  = t.status === 'serving';
      return `
        <div class="fm-table-card ${isServing ? 'serving' : ''} ${isSelected ? 'selected' : ''}"
          data-select-table="${Utils.escapeHtml(t.id)}">
          ${isSelected ? '<div class="fm-table-check-badge">✓</div>' : ''}
          <div class="fm-table-icon-wrap">
            <img src="assets/icons/restaurant.png" alt="" class="fm-table-icon-img">
          </div>
          <div class="fm-table-name">${Utils.escapeHtml(t.name)}</div>
          <span class="fm-table-pill ${isServing ? 'serving' : 'empty'}">
            ${isServing ? '● Đang phục vụ' : '● Trống'}
          </span>
        </div>
      `;
    }).join('');
  } catch {
    Utils.showToast('Lỗi tải danh sách bàn', 'error');
  }
}

// ── Lịch sử gọi món ───────────────────────────────────

async function renderHistory() {
  const el = document.getElementById('view-history');
  if (!el) return;

  const tableId    = state.selectedTable ? state.selectedTable.id : null;
  const tableLabel = state.selectedTable ? Utils.escapeHtml(state.selectedTable.name) : 'Tất cả bàn';

  el.innerHTML = `
    <div class="container-xl py-4 px-3 px-md-4">
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="fm-section-title mb-1">Lịch sử gọi món</h2>
          <p class="text-muted small mb-0">${tableLabel}</p>
        </div>
      </div>
      <div id="history-list">
        <div class="text-center py-5">
          <div class="spinner-border text-warning" role="status"></div>
        </div>
      </div>
    </div>
  `;

  try {
    // Lấy đơn hàng và danh sách bàn hiện tại song song để join theo tableId
    const [orders, allTables] = await Promise.all([
      API.getOrders(tableId),
      API.getTables(),
    ]);

    // Map tableId → tên hiện tại (nguồn sự thật là fm_tables, không phải snapshot)
    const tableMap = new Map(allTables.map(t => [t.id, t.name]));

    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    if (orders.length === 0) {
      listEl.innerHTML = `
        <div class="fm-empty text-center py-5">
          <div class="fm-empty-ico">📋</div>
          <h5 class="fw-bold mt-3 mb-1">Chưa có đơn hàng nào</h5>
          <p class="text-muted">Gọi món để lịch sử xuất hiện ở đây</p>
          <button class="btn fm-btn-primary mt-2 px-4" onclick="navigateTo('menu')">Xem thực đơn</button>
        </div>`;
      return;
    }

    listEl.innerHTML = orders.map(o => {
      const timeStr = new Date(o.time).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const statusHtml = o.status === 'done'
        ? '<span class="fm-history-status done">✅ Hoàn thành</span>'
        : '<span class="fm-history-status pending">⏳ Đang xử lý</span>';

      // Tên hiện tại từ fm_tables; fallback về snapshot nếu bàn đã bị xóa
      const resolvedName = tableMap.has(o.tableId)
        ? tableMap.get(o.tableId)
        : o.tableName;
      const isDeletedTable = !tableMap.has(o.tableId);
      const tableChipHtml = isDeletedTable
        ? `<span class="fm-history-table fm-history-table-gone">${Utils.escapeHtml(resolvedName || '')}</span>`
        : `<span class="fm-history-table">${Utils.escapeHtml(resolvedName || '')}</span>`;

      return `
        <div class="fm-history-card">
          <div class="fm-history-header">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              ${tableChipHtml}
              <span class="fm-history-time">${timeStr}</span>
            </div>
            ${statusHtml}
          </div>
          <div class="fm-history-items">
            ${(o.items || []).map(i => `
              <div class="d-flex justify-content-between small py-1">
                <span>${Utils.escapeHtml(i.name)} × ${Math.floor(Number(i.qty) || 0)}</span>
                <span class="fw-semibold">${Utils.formatPrice((Number(i.price) || 0) * (Number(i.qty) || 0))}</span>
              </div>
            `).join('')}
          </div>
          <div class="fm-history-footer">
            <span class="text-muted small">Tổng cộng</span>
            <span class="fm-history-total">${Utils.formatPrice(o.total)}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch {
    Utils.showToast('Lỗi tải lịch sử đơn hàng', 'error');
  }
}
