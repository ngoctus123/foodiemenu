/**
 * main.js — Logic trang khách hàng (index.html)
 * Quản lý: điều hướng trang, hiển thị sản phẩm, tìm kiếm/lọc, giỏ hàng, modal chi tiết
 */

// ── Hằng số ───────────────────────────────────────────
const CATEGORIES = ['Tất cả', 'Khai vị', 'Món chính', 'Bánh mặn', 'Bánh tráng miệng', 'Tráng miệng', 'Đồ uống lạnh', 'Đồ uống nóng', 'Set/Combo'];
const SELECTED_TABLE_KEY = 'fm_selected_table';


const RESTAURANT = {
  hotline:  '0876 785 977',
  phone:    '0876785977',
  address:  'Trường Đại học Đại Nam, Số 1 Phố Xốm, Phú Lãm, Hà Đông, Hà Nội',
  email:    'tule2077@gmail.com',
  facebook: '#',
  mapUrl:   'https://www.google.com/maps/search/?api=1&query=Tr%C6%B0%E1%BB%9Dng%20%C4%90%E1%BA%A1i%20h%E1%BB%8Dc%20%C4%90%E1%BA%A1i%20Nam%20S%E1%BB%91%201%20Ph%E1%BB%91%20X%E1%BB%91m%20Ph%C3%BA%20L%C3%A3m%20H%C3%A0%20%C4%90%C3%B4ng%20H%C3%A0%20N%E1%BB%99i',
  hours:    { weekday: '08:00 – 22:00', weekend: '08:00 – 22:00' },
  orderHours: { start: '08:00', end: '22:00' },
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
let _customerAuthModal = null;
let _isOrdering = false;

function _getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Khởi tạo ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  state.cart = Utils.loadCart();
  _seedStaffAccount();
  await _loadSelectedTable();
  await loadProducts();
  _detailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  _ensureStoreStatusModal();
  _ensureCustomerAuthModal();
  syncCartBadge();
  _updateAuthChip(); // gọi trước để _updateTableChip() được gọi bên trong
  const session = getCustomerSession();
  // Nhân viên/admin chưa chọn bàn → chuyển đến màn chọn bàn; các trường hợp còn lại → home
  if (_isStaffOrAdmin(session) && !state.selectedTable) {
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
    if (!requireCustomerAuth()) return;
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
    if (!requireCustomerAuth()) return;
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
  // Reservation panel actions (staff only)
  const resAssign   = e.target.closest('[data-res-assign]');
  const resCheckin  = e.target.closest('[data-res-checkin]');
  const resCancel   = e.target.closest('[data-res-cancel]');
  const resComplete = e.target.closest('[data-res-complete]');
  if (resAssign)   { _assignReservationToTable(resAssign.dataset.resAssign);     return; }
  if (resCheckin)  { _checkinReservation(resCheckin.dataset.resCheckin);         return; }
  if (resCancel)   { _cancelReservation(resCancel.dataset.resCancel);             return; }
  if (resComplete) { _completeReservation(resComplete.dataset.resComplete);       return; }
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
  // Chọn bàn chỉ dành cho nhân viên/admin
  if (page === 'table') {
    const session = getCustomerSession();
    if (!_isStaffOrAdmin(session)) {
      if (!session) showCustomerAuthModal('login');
      Utils.showToast('Chức năng chọn bàn chỉ dành cho nhân viên.', 'warning');
      return;
    }
  }
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
              <a href="tel:0876785977" style="color:var(--fm-primary);font-weight:700;text-decoration:none">${RESTAURANT.hotline}</a>
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
              <a href="mailto:tule2077@gmail.com" style="color:var(--fm-primary);text-decoration:none">${RESTAURANT.email}</a>
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
  if (!requireCustomerAuth()) return;

  const session = getCustomerSession();
  // Nhân viên/admin cần chọn bàn trước; khách thường thì không
  if (_isStaffOrAdmin(session) && !state.selectedTable) {
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
                <span>Hotline: <a href="tel:0876785977" class="fw-bold" style="color:var(--fm-amber)">${RESTAURANT.hotline}</a></span>
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
  // 1. Đang xử lý → bỏ qua
  if (_isOrdering) return;
  // 2. Chưa đăng nhập → mở modal login
  if (!requireCustomerAuth('Vui lòng đăng nhập để đặt hàng.')) return;
  // 3. Giỏ trống
  if (state.cart.length === 0) {
    Utils.showToast('Giỏ hàng trống, hãy thêm món trước!', 'warning');
    return;
  }
  // 4. Cửa hàng đóng
  if (!_isStoreOpen()) {
    _showStoreStatusModal();
    Utils.showToast('Cửa hàng đã đóng cửa, vui lòng quay lại trong giờ nhận đơn.', 'warning');
    return;
  }
  // 5/6. Phân luồng theo role
  const session = getCustomerSession();
  if (_isStaffOrAdmin(session)) {
    if (!state.selectedTable) {
      Utils.showToast('Vui lòng chọn bàn trước khi đặt hàng tại quán.', 'warning');
      navigateTo('table');
      return;
    }
    if (state.selectedTable.status === 'reserved') {
      Utils.showToast('Bàn này đang chờ khách đặt bàn. Vui lòng nhận khách (check-in) trước.', 'warning');
      navigateTo('table');
      return;
    }
    await _placeOrderForTable();
  } else {
    _showOrderTypeModal();
  }
}

// Đặt hàng theo bàn (staff)
async function _placeOrderForTable(extra) {
  _isOrdering = true;
  const btn = document.getElementById('order-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...`; }

  const orderItems = state.cart.map(i => ({
    id:    i.id,
    name:  i.name,
    qty:   Math.max(1, Math.floor(Number(i.qty) || 1)),
    price: Math.max(0, Number(i.price) || 0),
  }));
  const orderTotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  await new Promise(r => setTimeout(r, 1400));

  try {
    await API.addOrder({
      tableId:   state.selectedTable.id,
      tableName: state.selectedTable.name,
      orderType: 'table',
      items:     orderItems,
      total:     orderTotal,
      ...(extra || {}),
    });
  } catch (e) {
    _isOrdering = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '🛍 Đặt hàng ngay'; }
    Utils.showToast(e.message || 'Không thể lưu đơn hàng. Vui lòng thử lại!', 'error');
    return;
  }

  try {
    await API.updateTable(state.selectedTable.id, { status: 'serving' });
    state.selectedTable = { ...state.selectedTable, status: 'serving' };
    localStorage.setItem(SELECTED_TABLE_KEY, JSON.stringify(state.selectedTable));
    _updateTableChip();
  } catch { /* không quan trọng */ }

  _isOrdering = false;
  state.cart = [];
  Utils.clearCart();
  syncCartBadge();
  _showOrderSuccess('Đã đặt món thành công! Chúng tôi sẽ lên món trong ít phút. 🎉');
}

// Đặt hàng mang về (customer)
async function _placeOrderTakeaway() {
  _isOrdering = true;
  const orderItems = state.cart.map(i => ({
    id:    i.id,
    name:  i.name,
    qty:   Math.max(1, Math.floor(Number(i.qty) || 1)),
    price: Math.max(0, Number(i.price) || 0),
  }));
  const orderTotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  await new Promise(r => setTimeout(r, 1200));

  const takeawaySession = getCustomerSession();
  try {
    await API.addOrder({
      orderType:     'takeaway',
      customerEmail: takeawaySession?.email || '',
      customerName:  takeawaySession?.name  || '',
      items:         orderItems,
      total:         orderTotal,
    });
  } catch (e) {
    _isOrdering = false;
    Utils.showToast(e.message || 'Không thể lưu đơn hàng. Vui lòng thử lại!', 'error');
    return;
  }

  _isOrdering = false;
  state.cart = [];
  Utils.clearCart();
  syncCartBadge();
  _showOrderSuccess('Đặt món mang về thành công! Vui lòng đến quầy FoodieMenu để nhận món. 🎉');
}

// Đặt hàng giao về nhà (customer)
async function _placeOrderDelivery(deliveryInfo, payment) {
  _isOrdering = true;
  const orderItems = state.cart.map(i => ({
    id:    i.id,
    name:  i.name,
    qty:   Math.max(1, Math.floor(Number(i.qty) || 1)),
    price: Math.max(0, Number(i.price) || 0),
  }));
  const orderTotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  await new Promise(r => setTimeout(r, 1400));

  const deliverySession = getCustomerSession();
  try {
    await API.addOrder({
      orderType:     'delivery',
      customerEmail: deliverySession?.email || '',
      customerName:  deliverySession?.name  || '',
      deliveryInfo,
      payment,
      items:         orderItems,
      total:         orderTotal,
    });
  } catch (e) {
    _isOrdering = false;
    Utils.showToast(e.message || 'Không thể lưu đơn hàng. Vui lòng thử lại!', 'error');
    return;
  }

  _isOrdering = false;
  state.cart = [];
  Utils.clearCart();
  syncCartBadge();
  _showOrderSuccess('Đặt hàng giao về nhà thành công! FoodieMenu sẽ liên hệ xác nhận đơn trong ít phút. 🎉');
}

function _showOrderSuccess(msg) {
  const el = document.getElementById('view-cart');
  if (el) el.innerHTML = `
    <div class="container-xl py-5 px-3">
      <div class="fm-empty text-center py-5">
        <div class="fm-empty-ico">✅</div>
        <h4 class="fw-bold mt-3 mb-2">Đặt hàng thành công!</h4>
        <p class="text-muted mb-4">${Utils.escapeHtml(msg)}</p>
        <button class="btn fm-btn-primary px-4" onclick="navigateTo('menu')">Đặt thêm món</button>
      </div>
    </div>`;
  Utils.showToast(msg);
}

// ── Modal: Mang về / Giao về nhà ──────────────────

function _showOrderTypeModal() {
  const old = document.getElementById('orderTypeModal');
  if (old) { bootstrap.Modal.getInstance(old)?.dispose(); old.remove(); }

  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  const el = document.createElement('div');
  el.className = 'modal fade';
  el.id = 'orderTypeModal';
  el.tabIndex = -1;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="modal-dialog modal-dialog-centered" style="max-width:400px">
      <div class="modal-content fm-modal">
        <div class="modal-header border-0 pb-1">
          <h5 class="fm-modal-title" style="font-size:17px">🍽 Bạn muốn nhận món thế nào?</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"
            style="filter:invert(1) opacity(.55)"></button>
        </div>
        <div class="modal-body py-3">
          <p class="text-muted small mb-3">Tổng đơn: <strong style="color:var(--fm-amber)">${Utils.formatPrice(total)}</strong></p>
          <div class="d-flex flex-column gap-3">
            <button class="btn fm-btn-primary w-100 py-3 fw-semibold" id="ot-dine-btn">
              <i class="bi bi-bag-check me-2"></i>Mang về
              <div class="small fw-normal opacity-75 mt-1">Đặt trước và đến quầy FoodieMenu nhận món</div>
            </button>
            <button class="btn fm-btn-outline w-100 py-3 fw-semibold" id="ot-delivery-btn">
              <i class="bi bi-truck me-2"></i>Giao về nhà
              <div class="small fw-normal opacity-75 mt-1">Giao trong 30–45 phút, miễn phí vận chuyển</div>
            </button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);

  const modal = new bootstrap.Modal(el);
  el.querySelector('#ot-dine-btn').addEventListener('click', () => {
    modal.hide();
    _placeOrderTakeaway();
  });
  el.querySelector('#ot-delivery-btn').addEventListener('click', () => {
    modal.hide();
    setTimeout(() => _showDeliveryFormModal(), 200);
  });
  el.addEventListener('hidden.bs.modal', () => { modal.dispose(); el.remove(); });
  modal.show();
}

function _showDeliveryFormModal() {
  const old = document.getElementById('deliveryFormModal');
  if (old) { bootstrap.Modal.getInstance(old)?.dispose(); old.remove(); }

  const session = getCustomerSession();
  const total   = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  const BANKS = [
    { id: 'vcb',  name: 'Vietcombank',  acc: '1234 5678 9012', holder: 'FOODIEMENU VN' },
    { id: 'mb',   name: 'MB Bank',      acc: '0987 6543 2100', holder: 'FOODIEMENU VN' },
    { id: 'bidv', name: 'BIDV',         acc: '2109 8765 4321', holder: 'FOODIEMENU VN' },
    { id: 'tcb',  name: 'Techcombank',  acc: '3456 7890 1234', holder: 'FOODIEMENU VN' },
    { id: 'acb',  name: 'ACB',          acc: '8765 4321 0987', holder: 'FOODIEMENU VN' },
  ];

  const el = document.createElement('div');
  el.className = 'modal fade';
  el.id = 'deliveryFormModal';
  el.tabIndex = -1;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:480px">
      <div class="modal-content fm-modal">
        <div class="modal-header border-0 pb-1">
          <h5 class="fm-modal-title" style="font-size:17px"><i class="bi bi-truck me-2"></i>Thông tin giao hàng</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"
            style="filter:invert(1) opacity(.55)"></button>
        </div>
        <div class="modal-body py-3">
          <!-- Thông tin người nhận -->
          <p class="fw-semibold mb-2" style="color:var(--fm-amber)">📦 Người nhận</p>
          <div class="fm-auth-field mb-2">
            <label class="fm-auth-label">Họ tên người nhận</label>
            <input type="text" class="fm-auth-input" id="del-name"
              placeholder="Nguyễn Văn A" value="${Utils.escapeHtml(session?.name || '')}" autocomplete="name">
            <div class="fm-auth-error d-none" id="del-name-err"></div>
          </div>
          <div class="fm-auth-field mb-2">
            <label class="fm-auth-label">Số điện thoại</label>
            <input type="tel" class="fm-auth-input" id="del-phone"
              placeholder="0876785977" autocomplete="tel">
            <div class="fm-auth-error d-none" id="del-phone-err"></div>
          </div>
          <div class="fm-auth-field mb-2">
            <label class="fm-auth-label">Địa chỉ nhận hàng</label>
            <input type="text" class="fm-auth-input" id="del-address"
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" autocomplete="street-address">
            <div class="fm-auth-error d-none" id="del-address-err"></div>
          </div>
          <div class="fm-auth-field mb-4">
            <label class="fm-auth-label">Ghi chú giao hàng <span class="text-muted">(tuỳ chọn)</span></label>
            <input type="text" class="fm-auth-input" id="del-note"
              placeholder="Gọi trước khi đến, giao sau 17h...">
          </div>

          <!-- Thanh toán -->
          <p class="fw-semibold mb-2" style="color:var(--fm-amber)">💳 Thanh toán</p>
          <div class="fm-auth-field mb-2">
            <label class="fm-auth-label">Phương thức thanh toán</label>
            <select class="fm-auth-input" id="del-payment" style="appearance:auto">
              <option value="cash">💵 Tiền mặt khi nhận hàng</option>
              <option value="bank">🏦 Chuyển khoản ngân hàng</option>
              <option value="momo">💜 Ví MoMo</option>
              <option value="zalopay">🔵 ZaloPay</option>
              <option value="vnpay">🔴 VNPay</option>
            </select>
          </div>

          <!-- Thông tin ngân hàng (ẩn mặc định) -->
          <div id="del-bank-section" class="d-none">
            <div class="fm-auth-field mb-2">
              <label class="fm-auth-label">Chọn ngân hàng</label>
              <select class="fm-auth-input" id="del-bank" style="appearance:auto">
                ${BANKS.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div id="del-bank-info" class="fm-delivery-bank-info mb-3">
            </div>
          </div>

          <div class="fm-summary mt-3" style="border-radius:10px;padding:14px 16px">
            <div class="d-flex justify-content-between mb-1 small">
              <span class="text-white-50">Tổng đơn hàng</span>
              <span class="fw-bold" style="color:var(--fm-amber)">${Utils.formatPrice(total)}</span>
            </div>
            <div class="d-flex justify-content-between small">
              <span class="text-white-50">Phí giao hàng</span>
              <span class="text-success fw-semibold">Miễn phí</span>
            </div>
          </div>
        </div>
        <div class="modal-footer border-0 pt-0 pb-3">
          <button type="button" class="btn fm-btn-outline flex-fill" data-bs-dismiss="modal">Hủy</button>
          <button type="button" class="btn fm-btn-primary flex-fill" id="del-confirm-btn">
            <i class="bi bi-check-circle me-1"></i>Xác nhận đặt hàng
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);

  const modal = new bootstrap.Modal(el, { backdrop: 'static' });

  // Hiện/ẩn thông tin ngân hàng khi đổi phương thức thanh toán
  const paySelect  = el.querySelector('#del-payment');
  const bankSec    = el.querySelector('#del-bank-section');
  const bankSelect = el.querySelector('#del-bank');
  const bankInfo   = el.querySelector('#del-bank-info');

  function updateBankInfo() {
    const bank = BANKS.find(b => b.id === bankSelect.value) || BANKS[0];
    const phone = (el.querySelector('#del-phone')?.value || '').replace(/\s/g, '');
    const content = `FM ${phone || '09x'} ${Utils.formatPrice(total)}`;
    bankInfo.innerHTML = `
      <div class="small mb-1"><span class="text-white-50">Ngân hàng:</span> <strong>${Utils.escapeHtml(bank.name)}</strong></div>
      <div class="small mb-1"><span class="text-white-50">Số TK:</span> <strong>${Utils.escapeHtml(bank.acc)}</strong></div>
      <div class="small mb-1"><span class="text-white-50">Chủ TK:</span> <strong>${Utils.escapeHtml(bank.holder)}</strong></div>
      <div class="small"><span class="text-white-50">Nội dung CK:</span> <strong style="color:var(--fm-amber)">${Utils.escapeHtml(content)}</strong></div>`;
  }

  paySelect.addEventListener('change', () => {
    const isBank = paySelect.value === 'bank';
    bankSec.classList.toggle('d-none', !isBank);
    if (isBank) updateBankInfo();
  });
  bankSelect.addEventListener('change', updateBankInfo);
  el.querySelector('#del-phone').addEventListener('input', () => { if (paySelect.value === 'bank') updateBankInfo(); });

  // Xác nhận
  el.querySelector('#del-confirm-btn').addEventListener('click', () => {
    const name    = (el.querySelector('#del-name')?.value    || '').trim();
    const phone   = (el.querySelector('#del-phone')?.value   || '').trim();
    const address = (el.querySelector('#del-address')?.value || '').trim();
    const note    = (el.querySelector('#del-note')?.value    || '').trim();
    const method  = paySelect.value;

    let ok = true;
    if (!name)    { _dfErr('del-name-err',    'Vui lòng nhập họ tên người nhận.'); ok = false; } else _dfErr('del-name-err', '');
    if (!/^[0-9]{10,11}$/.test(phone.replace(/\s/g,''))) { _dfErr('del-phone-err', 'Số điện thoại 10-11 chữ số.'); ok = false; } else _dfErr('del-phone-err', '');
    if (!address) { _dfErr('del-address-err', 'Vui lòng nhập địa chỉ nhận hàng.'); ok = false; } else _dfErr('del-address-err', '');
    if (!ok) return;

    const bank = BANKS.find(b => b.id === bankSelect.value);
    const content = `FM ${phone.replace(/\s/g,'')} ${Utils.formatPrice(total)}`;
    const payment = {
      method,
      ...(method === 'bank' ? { bankName: bank?.name, bankAcc: bank?.acc, transferContent: content } : {}),
    };

    modal.hide();
    _placeOrderDelivery({ receiverName: name, phone, address, note }, payment);
  });

  el.addEventListener('hidden.bs.modal', () => { modal.dispose(); el.remove(); });
  modal.show();
}

function _dfErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) { el.textContent = msg; el.classList.remove('d-none'); }
  else      { el.textContent = '';  el.classList.add('d-none'); }
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
    if (table.status === 'reserved') {
      state.selectedTable = null;
      localStorage.removeItem(SELECTED_TABLE_KEY);
      _updateTableChip();
      Utils.showToast('Bàn này đã được đặt. Vui lòng bấm "Nhận khách" trong danh sách đặt bàn trước khi order.', 'warning');
      document.getElementById('reservation-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

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
  const session = getCustomerSession();
  const isStaff = _isStaffOrAdmin(session);
  // Ẩn nút Chọn bàn với khách thường và người chưa đăng nhập
  chip.style.display = isStaff ? '' : 'none';
  if (!isStaff) return;
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

  const session = getCustomerSession();
  const isStaff = _isStaffOrAdmin(session);

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
        ${isStaff ? '<div id="reservation-panel" class="mt-5"><div class="text-center py-3"><div class="spinner-border spinner-border-sm text-warning" role="status"></div></div></div>' : ''}
      </div>
    </div>
  `;

  try {
    const tables = await API.getVisibleTables();
    const grid = document.getElementById('tables-grid');
    if (!grid) return;

    if (tables.length === 0) {
      grid.innerHTML = `<p class="text-center text-muted py-4">Không có bàn nào khả dụng. Vui lòng liên hệ nhân viên.</p>`;
    } else {
      grid.innerHTML = tables.map(t => {
        const isSelected = state.selectedTable && state.selectedTable.id === t.id;
        const isServing  = t.status === 'serving';
        const isReserved = t.status === 'reserved';
        const cardClass  = isServing ? 'serving' : isReserved ? 'reserved' : '';
        const pillClass  = isServing ? 'serving' : isReserved ? 'reserved' : 'empty';
        const pillText   = isServing ? '● Đang phục vụ' : isReserved ? '● Đã đặt' : '● Trống';
        return `
          <div class="fm-table-card ${cardClass} ${isSelected ? 'selected' : ''}"
            data-select-table="${Utils.escapeHtml(t.id)}">
            ${isSelected ? '<div class="fm-table-check-badge">✓</div>' : ''}
            <div class="fm-table-icon-wrap">
              <img src="assets/icons/restaurant.png" alt="" class="fm-table-icon-img">
            </div>
            <div class="fm-table-name">${Utils.escapeHtml(t.name)}</div>
            <span class="fm-table-pill ${pillClass}">${pillText}</span>
          </div>
        `;
      }).join('');
    }
  } catch {
    Utils.showToast('Lỗi tải danh sách bàn', 'error');
  }

  if (isStaff) await _renderReservationPanel();
}

// ── Reservation panel (staff only) ────────────────────

async function _renderReservationPanel() {
  const panel = document.getElementById('reservation-panel');
  if (!panel) return;

  const today = _getLocalDateString();
  let allReservations;
  try { allReservations = await API.getReservations(null); }
  catch { panel.innerHTML = ''; return; }

  const statusLabel = { pending: 'Chờ xác nhận', reserved: 'Đã xếp bàn', seated: 'Đang phục vụ', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
  const badgeCls    = { pending: 'bg-warning text-dark', reserved: 'bg-primary', seated: 'bg-success', completed: 'bg-secondary', cancelled: 'bg-danger' };

  const todayList = allReservations.filter(r => r.date === today);
  const upcomingList = allReservations.filter(r =>
    r.date > today && (r.status === 'pending' || r.status === 'reserved')
  );
  const pendingCount = todayList.filter(r => r.status === 'pending').length;

  const renderReservationRows = (items, emptyText, showDate = false, canAct = true) => (
    items.length === 0
      ? `<p class="text-muted small text-center py-3 mb-0">${emptyText}</p>`
      : items.map(r => `
        <div class="fm-res-card fm-res-${Utils.escapeHtml(r.status)}">
          <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap">
            <div class="min-w-0">
              <div class="fw-semibold small">${Utils.escapeHtml(r.name)}
                <span class="text-muted fw-normal">· ${Utils.escapeHtml(r.phone)}</span>
              </div>
              <div class="text-muted" style="font-size:0.78rem">
                ${showDate ? Utils.escapeHtml(r.date) + ' · ' : ''}${Utils.escapeHtml(r.time)} · ${Utils.escapeHtml(String(r.guests))} khách
                ${r.tableName ? ' · <strong>' + Utils.escapeHtml(r.tableName) + '</strong>' : ''}
                ${r.note ? ' · ' + Utils.escapeHtml(r.note) : ''}
              </div>
            </div>
            <div class="d-flex align-items-center gap-1 flex-shrink-0 flex-wrap">
              <span class="badge ${badgeCls[r.status] || 'bg-secondary'}" style="font-size:0.7rem">${statusLabel[r.status] || r.status}</span>
              ${canAct && r.status === 'pending'  ? `<button class="btn btn-sm fm-res-btn-assign"   data-res-assign="${Utils.escapeHtml(r.id)}">Gán bàn</button>` : ''}
              ${canAct && r.status === 'reserved' ? `<button class="btn btn-sm fm-res-btn-checkin"  data-res-checkin="${Utils.escapeHtml(r.id)}">Nhận khách</button>` : ''}
              ${canAct && (r.status === 'pending' || r.status === 'reserved')
                ? `<button class="btn btn-sm fm-res-btn-cancel" data-res-cancel="${Utils.escapeHtml(r.id)}">Hủy</button>` : ''}
              ${canAct && r.status === 'seated'   ? `<button class="btn btn-sm fm-res-btn-complete" data-res-complete="${Utils.escapeHtml(r.id)}">Hoàn tất</button>` : ''}
            </div>
          </div>
        </div>
      `).join('')
  );

  panel.innerHTML = `
    <div class="fm-res-panel">
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 class="fw-bold mb-0" style="color:var(--dark)">
          <i class="bi bi-calendar-check me-2" style="color:var(--fm-amber)"></i>Đặt bàn hôm nay
        </h5>
        ${pendingCount ? `<span class="badge bg-warning text-dark">${pendingCount} chờ xử lý</span>` : ''}
      </div>
      ${renderReservationRows(todayList, 'Chưa có đặt bàn nào hôm nay.')}

      <div class="d-flex align-items-center justify-content-between mt-4 mb-2 flex-wrap gap-2">
        <h6 class="fw-bold mb-0" style="color:var(--dark)">
          <i class="bi bi-calendar-week me-2" style="color:var(--fm-amber)"></i>Đặt bàn sắp tới
        </h6>
        ${upcomingList.length ? `<span class="badge bg-light text-dark">${upcomingList.length} lịch</span>` : ''}
      </div>
      ${renderReservationRows(upcomingList, 'Chưa có đặt bàn sắp tới.', true, false)}
    </div>
  `;
}

async function _assignReservationToTable(resId) {
  let tables;
  try { tables = await API.getVisibleTables(); }
  catch { Utils.showToast('Lỗi tải bàn', 'error'); return; }

  const emptyTables = tables.filter(t => t.status === 'empty');
  if (emptyTables.length === 0) {
    Utils.showToast('Không còn bàn trống.', 'warning'); return;
  }

  const old = document.getElementById('resAssignModal');
  if (old) { bootstrap.Modal.getInstance(old)?.dispose(); old.remove(); }

  const el = document.createElement('div');
  el.className = 'modal fade'; el.id = 'resAssignModal'; el.tabIndex = -1;
  el.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content fm-modal">
        <div class="modal-header border-0 pb-1">
          <h6 class="modal-title fw-bold">Chọn bàn cho đặt chỗ</h6>
          <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body pt-1">
          <div class="d-grid gap-2">
            ${emptyTables.map(t => `
              <button class="btn fm-btn-outline text-start" data-assign-table="${Utils.escapeHtml(t.id)}">
                <i class="bi bi-table me-2"></i>${Utils.escapeHtml(t.name)}
              </button>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  const modal = new bootstrap.Modal(el);

  el.addEventListener('click', async ev => {
    const btn = ev.target.closest('[data-assign-table]');
    if (!btn) return;
    const tableId = btn.dataset.assignTable;
    const table = emptyTables.find(t => t.id === tableId);
    if (!table) return;
    modal.hide();
    try {
      await Promise.all([
        API.updateReservation(resId, { status: 'reserved', tableId, tableName: table.name }),
        API.updateTable(tableId, { status: 'reserved' }),
      ]);
      await renderTableSelection();
      Utils.showToast(`Đã gán ${Utils.escapeHtml(table.name)} cho đặt chỗ.`);
    } catch (e) { Utils.showToast(e.message || 'Lỗi gán bàn', 'error'); }
  });
  el.addEventListener('hidden.bs.modal', () => { modal.dispose(); el.remove(); });
  modal.show();
}

async function _checkinReservation(resId) {
  try {
    const all = await API.getReservations(null);
    const res = all.find(r => r.id === resId);
    if (!res) { Utils.showToast('Không tìm thấy đặt bàn', 'error'); return; }
    const updates = [API.updateReservation(resId, { status: 'seated' })];
    if (res.tableId) {
      updates.push(API.updateTable(res.tableId, { status: 'serving' }));
      // Auto-select bàn cho nhân viên để order ngay
      const tableObj = { id: res.tableId, name: res.tableName || res.tableId, status: 'serving' };
      state.selectedTable = tableObj;
      localStorage.setItem(SELECTED_TABLE_KEY, JSON.stringify(tableObj));
      _updateTableChip();
    }
    await Promise.all(updates);
    Utils.showToast(`Đã nhận khách${res.tableName ? ' tại ' + Utils.escapeHtml(res.tableName) : ''}. Bắt đầu phục vụ! 🎉`);
    navigateTo('menu');
  } catch (e) { Utils.showToast(e.message || 'Lỗi nhận khách', 'error'); }
}

async function _cancelReservation(resId) {
  try {
    const all = await API.getReservations(null);
    const res = all.find(r => r.id === resId);
    if (!res) { Utils.showToast('Không tìm thấy đặt bàn', 'error'); return; }
    const updates = [API.updateReservation(resId, { status: 'cancelled' })];
    if (res.tableId) {
      const tables = await API.getTables();
      const table = tables.find(t => t.id === res.tableId);
      if (table && table.status === 'reserved') {
        updates.push(API.updateTable(res.tableId, { status: 'empty' }));
      }
      // Nếu nhân viên đang chọn bàn này thì clear
      if (state.selectedTable?.id === res.tableId) {
        state.selectedTable = null;
        localStorage.removeItem(SELECTED_TABLE_KEY);
        _updateTableChip();
      }
    }
    await Promise.all(updates);
    await renderTableSelection();
    Utils.showToast('Đã hủy đặt bàn.', 'info');
  } catch (e) { Utils.showToast(e.message || 'Lỗi hủy đặt bàn', 'error'); }
}

async function _completeReservation(resId) {
  try {
    const all = await API.getReservations(null);
    const res = all.find(r => r.id === resId);
    if (!res) { Utils.showToast('Không tìm thấy đặt bàn', 'error'); return; }
    const updates = [API.updateReservation(resId, { status: 'completed' })];
    if (res.tableId) {
      updates.push(API.updateTable(res.tableId, { status: 'empty' }));
      if (state.selectedTable?.id === res.tableId) {
        state.selectedTable = null;
        localStorage.removeItem(SELECTED_TABLE_KEY);
        _updateTableChip();
      }
    }
    await Promise.all(updates);
    await renderTableSelection();
    Utils.showToast('Hoàn tất phục vụ. Bàn đã được giải phóng.');
  } catch (e) { Utils.showToast(e.message || 'Lỗi hoàn tất', 'error'); }
}

// ── Lịch sử gọi món ───────────────────────────────────

async function renderHistory() {
  const el = document.getElementById('view-history');
  if (!el) return;

  const session = getCustomerSession();
  const isStaff = _isStaffOrAdmin(session);

  const pageTitle    = isStaff ? 'Lịch sử gọi món' : 'Lịch sử mua hàng';
  const pageSubtitle = isStaff
    ? (state.selectedTable ? Utils.escapeHtml(state.selectedTable.name) : 'Tất cả bàn')
    : 'Đơn hàng của bạn';

  el.innerHTML = `
    <div class="container-xl py-4 px-3 px-md-4">
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="fm-section-title mb-1">${Utils.escapeHtml(pageTitle)}</h2>
          <p class="text-muted small mb-0">${pageSubtitle}</p>
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
    let orders;
    let tableMap = new Map();

    if (isStaff) {
      const tableId = state.selectedTable ? state.selectedTable.id : null;
      const [rawOrders, allTables] = await Promise.all([
        API.getOrders(tableId, null),
        API.getTables(),
      ]);
      orders   = rawOrders;
      tableMap = new Map(allTables.map(t => [t.id, t.name]));
    } else {
      // Customer: chỉ đơn của chính họ, không lọc theo bàn
      orders = await API.getOrders(null, session?.email || '');
    }

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

      // Label loại đơn
      let typeLabel = '';
      if (o.orderType === 'delivery') {
        typeLabel = '<span class="fm-history-type delivery">🚚 Giao hàng</span>';
      } else if (o.orderType === 'dine-in') { // legacy: đơn cũ trước khi customer flow đổi sang takeaway
        const label = isStaff ? 'Tại quán' : 'Ăn tại quán';
        typeLabel = `<span class="fm-history-type dine-in">🍽 ${label}</span>`;
      } else if (o.orderType === 'takeaway') {
        typeLabel = '<span class="fm-history-type dine-in">🥡 Mang về</span>';
      } else if (isStaff && (o.orderType === 'table' || (o.tableId && o.tableId !== 'delivery' && o.tableId !== 'dine-in'))) {
        typeLabel = '<span class="fm-history-type table">🪑 Theo bàn</span>';
      }

      // Tên bàn — chỉ hiển thị với đơn theo bàn, chỉ cho staff/admin
      let tableChipHtml = '';
      if (isStaff && (o.orderType === 'table' || (!o.orderType && o.tableId && o.tableId !== 'delivery' && o.tableId !== 'dine-in'))) {
        const resolvedName = tableMap.has(o.tableId) ? tableMap.get(o.tableId) : o.tableName;
        const gone = !tableMap.has(o.tableId);
        tableChipHtml = gone
          ? `<span class="fm-history-table fm-history-table-gone">${Utils.escapeHtml(resolvedName || '')}</span>`
          : `<span class="fm-history-table">${Utils.escapeHtml(resolvedName || '')}</span>`;
      }

      // Thông tin giao hàng
      let deliveryHtml = '';
      if (o.orderType === 'delivery' && o.deliveryInfo) {
        const d  = o.deliveryInfo;
        const pm = o.payment;
        const pmLabel = pm?.method === 'cash'    ? 'Tiền mặt'
          : pm?.method === 'bank'    ? `Chuyển khoản (${Utils.escapeHtml(pm.bankName || '')})`
          : pm?.method === 'momo'    ? 'Ví MoMo'
          : pm?.method === 'zalopay' ? 'ZaloPay'
          : pm?.method === 'vnpay'   ? 'VNPay'
          : (pm?.method || '—');
        deliveryHtml = `
          <div class="fm-history-delivery">
            <div class="small text-muted mb-1">
              <i class="bi bi-person-fill me-1"></i>${Utils.escapeHtml(d.receiverName || '')}
              &nbsp;·&nbsp;<i class="bi bi-telephone-fill me-1"></i>${Utils.escapeHtml(d.phone || '')}
            </div>
            <div class="small text-muted mb-1">
              <i class="bi bi-geo-alt-fill me-1"></i>${Utils.escapeHtml(d.address || '')}
            </div>
            ${d.note ? `<div class="small text-muted mb-1"><i class="bi bi-chat-text me-1"></i>${Utils.escapeHtml(d.note)}</div>` : ''}
            <div class="small" style="color:var(--fm-amber)">
              <i class="bi bi-credit-card me-1"></i>${Utils.escapeHtml(pmLabel)}
            </div>
          </div>`;
      }

      return `
        <div class="fm-history-card">
          <div class="fm-history-header">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              ${typeLabel}${tableChipHtml}
              <span class="fm-history-time">${timeStr}</span>
            </div>
            ${statusHtml}
          </div>
          ${deliveryHtml}
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

// ── Customer Auth ──────────────────────────────────────

const FM_SESSION_KEY = 'fm_customer_session';
const FM_USERS_KEY   = 'fm_customer_users';

// Tài khoản demo seed sẵn
const _DEMO_ACCOUNTS = [
  { name: 'Nhân viên Demo', email: 'staff@foodiemenu.vn', password: '123456', role: 'staff' },
  { name: 'Admin Demo',     email: 'admin@foodiemenu.vn', password: '123456', role: 'admin' },
];

function _seedStaffAccount() {
  const users = _loadUsers();
  let changed = false;
  _DEMO_ACCOUNTS.forEach(demo => {
    const existing = users.find(u => u.email === demo.email);
    if (existing) {
      Object.assign(existing, demo);
      changed = true;
    } else {
      users.push(demo);
      changed = true;
    }
  });
  if (changed) localStorage.setItem(FM_USERS_KEY, JSON.stringify(users));
  _upgradeDemoSession();
}

function _upgradeDemoSession() {
  const session = getCustomerSession();
  if (!session) return;
  const demo = _DEMO_ACCOUNTS.find(acc => acc.email === session.email);
  if (!demo || session.role === demo.role) return;
  // Demo only: role lưu ở localStorage không phải bảo mật thật nếu chưa có backend.
  localStorage.setItem(FM_SESSION_KEY, JSON.stringify({
    ...session,
    name: demo.name,
    role: demo.role,
  }));
}

// Helper: kiểm tra có quyền staff/admin không
function _isStaffOrAdmin(session) {
  return session?.role === 'staff' || session?.role === 'admin';
}

function _loadUsers() {
  try { return JSON.parse(localStorage.getItem(FM_USERS_KEY) || '[]'); } catch { return []; }
}

function getCustomerSession() {
  try { return JSON.parse(localStorage.getItem(FM_SESSION_KEY) || 'null'); } catch { return null; }
}

function isCustomerLoggedIn() {
  return getCustomerSession() !== null;
}

function requireCustomerAuth(msg) {
  if (getCustomerSession()) return true;
  showCustomerAuthModal('login');
  Utils.showToast(msg || 'Vui lòng đăng nhập hoặc đăng ký để chọn món.', 'warning');
  return false;
}

function customerLogout() {
  state.cart = [];
  Utils.clearCart();
  syncCartBadge();
  localStorage.removeItem(FM_SESSION_KEY);
  state.selectedTable = null;
  localStorage.removeItem(SELECTED_TABLE_KEY);
  _updateAuthChip();
  Utils.showToast('Bạn đã đăng xuất. Vui lòng đăng nhập để tiếp tục đặt món.', 'info');
  navigateTo('home');
}

function showCustomerAuthModal(view) {
  _ensureCustomerAuthModal();
  _switchAuthView(view || 'login');
  if (_customerAuthModal) _customerAuthModal.show();
}

function _switchAuthView(view) {
  const loginPanel = document.getElementById('auth-panel-login');
  const regPanel   = document.getElementById('auth-panel-register');
  const title      = document.getElementById('auth-modal-title');
  if (!loginPanel || !regPanel) return;
  const isReg = view === 'register';
  loginPanel.classList.toggle('d-none', isReg);
  regPanel.classList.toggle('d-none', !isReg);
  if (title) title.textContent = isReg ? 'Tạo tài khoản mới' : 'Đăng nhập để đặt hàng';
}

function _authFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) { el.textContent = msg; el.classList.remove('d-none'); }
  else      { el.textContent = '';  el.classList.add('d-none');    }
}

function _toggleAuthPw(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  const isHidden = input.type === 'password';
  input.type     = isHidden ? 'text' : 'password';
  icon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
}

function _handleCustomerLogin() {
  const idVal = (document.getElementById('auth-login-id')?.value || '').trim();
  const pwVal =  document.getElementById('auth-login-pw')?.value || '';
  _authFieldError('auth-login-id-err', '');
  _authFieldError('auth-login-pw-err', '');
  let valid = true;
  if (!idVal) { _authFieldError('auth-login-id-err', 'Vui lòng nhập email hoặc số điện thoại'); valid = false; }
  if (pwVal.length < 6) { _authFieldError('auth-login-pw-err', 'Mật khẩu phải ít nhất 6 ký tự'); valid = false; }
  if (!valid) return;

  const users = _loadUsers();
  const found = users.find(u => u.email === idVal || u.phone === idVal);

  if (found) {
    if (found.password !== pwVal) {
      _authFieldError('auth-login-pw-err', 'Mật khẩu không đúng');
      return;
    }
    const session = { name: found.name, email: found.email, role: found.role || 'customer', loginAt: Date.now() };
    localStorage.setItem(FM_SESSION_KEY, JSON.stringify(session));
  } else {
    _authFieldError('auth-login-id-err', 'Email hoặc số điện thoại chưa được đăng ký');
    return;
  }

  if (_customerAuthModal) _customerAuthModal.hide();
  _updateAuthChip();
  Utils.showToast('Đăng nhập thành công! Bạn có thể đặt hàng ngay 🎉');

  // Nếu nhân viên/admin và chưa chọn bàn → chuyển đến chọn bàn
  const session = getCustomerSession();
  if (_isStaffOrAdmin(session) && !state.selectedTable) {
    setTimeout(() => navigateTo('table'), 350);
  }
}

function _handleCustomerRegister() {
  const nameVal  = (document.getElementById('auth-reg-name')?.value  || '').trim();
  const emailVal = (document.getElementById('auth-reg-email')?.value || '').trim().toLowerCase();
  const phoneVal = (document.getElementById('auth-reg-phone')?.value || '').trim();
  const pwVal    =  document.getElementById('auth-reg-pw')?.value    || '';
  const pw2Val   =  document.getElementById('auth-reg-pw2')?.value   || '';
  const terms    =  document.getElementById('auth-reg-terms')?.checked;

  ['auth-reg-name-err','auth-reg-email-err','auth-reg-phone-err',
   'auth-reg-pw-err','auth-reg-pw2-err','auth-reg-terms-err'].forEach(id => _authFieldError(id, ''));

  let valid = true;
  if (nameVal.length < 3)                            { _authFieldError('auth-reg-name-err',  'Họ tên ít nhất 3 ký tự');        valid = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { _authFieldError('auth-reg-email-err', 'Email không đúng định dạng');     valid = false; }
  if (!/^[0-9]{10,11}$/.test(phoneVal))             { _authFieldError('auth-reg-phone-err', 'Số điện thoại 10-11 chữ số');    valid = false; }
  if (pwVal.length < 6)                              { _authFieldError('auth-reg-pw-err',    'Mật khẩu ít nhất 6 ký tự');     valid = false; }
  if (pwVal !== pw2Val)                              { _authFieldError('auth-reg-pw2-err',   'Mật khẩu nhập lại không khớp'); valid = false; }
  if (!terms)                                        { _authFieldError('auth-reg-terms-err', 'Vui lòng đồng ý điều khoản');   valid = false; }
  if (!valid) return;

  const users = _loadUsers();
  if (users.find(u => u.email === emailVal)) {
    _authFieldError('auth-reg-email-err', 'Email này đã được đăng ký rồi.');
    return;
  }

  users.push({ name: nameVal, email: emailVal, phone: phoneVal, password: pwVal, role: 'customer', registeredAt: Date.now() });
  localStorage.setItem(FM_USERS_KEY, JSON.stringify(users));

  // KHÔNG tự đăng nhập — chuyển về form đăng nhập và pre-fill email
  _switchAuthView('login');
  const loginIdEl = document.getElementById('auth-login-id');
  if (loginIdEl) loginIdEl.value = emailVal;

  Utils.showToast('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục đặt món.', 'success');
}

function _updateAuthChip() {
  const chip = document.getElementById('auth-chip');
  if (!chip) return;
  chip.innerHTML = '';
  const session = getCustomerSession();
  if (session) {
    chip.className = 'fm-auth-chip d-flex align-items-center gap-1';
    const nameEl = document.createElement('span');
    nameEl.className = 'fm-auth-name';
    // textContent — không XSS
    nameEl.textContent = _isStaffOrAdmin(session)
      ? `${session.role === 'admin' ? 'Admin' : 'NV'}: ${session.name}`
      : `Xin chào, ${session.name}`;
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn fm-auth-logout-btn';
    logoutBtn.title = 'Đăng xuất';
    logoutBtn.innerHTML = '<i class="bi bi-box-arrow-right"></i>';
    logoutBtn.addEventListener('click', customerLogout);
    chip.appendChild(nameEl);
    chip.appendChild(logoutBtn);
  } else {
    chip.className = 'fm-auth-chip d-flex align-items-center';
    const loginBtn = document.createElement('button');
    loginBtn.className = 'btn fm-auth-login-btn';
    loginBtn.innerHTML = '<i class="bi bi-person me-1"></i><span class="d-none d-md-inline">Đăng nhập</span>';
    loginBtn.addEventListener('click', () => showCustomerAuthModal('login'));
    chip.appendChild(loginBtn);
  }
  // Đồng bộ nút Chọn bàn theo role
  _updateTableChip();
}

function _ensureCustomerAuthModal() {
  if (document.getElementById('customerAuthModal') || _customerAuthModal) return;

  const el = document.createElement('div');
  el.className = 'modal fade';
  el.id = 'customerAuthModal';
  el.tabIndex = -1;
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('aria-labelledby', 'auth-modal-title');
  // HTML là static — không có user data, dùng innerHTML an toàn
  el.innerHTML = `
    <div class="modal-dialog modal-dialog-centered fm-auth-dialog">
      <div class="modal-content fm-modal fm-auth-modal">
        <div class="modal-header border-0 pb-1">
          <h5 class="fm-auth-modal-title" id="auth-modal-title">Đăng nhập để đặt hàng</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"
            style="filter:invert(1) opacity(.55)"></button>
        </div>
        <div class="modal-body pt-3 pb-4">

          <!-- Panel: Đăng nhập -->
          <div id="auth-panel-login">
            <div class="fm-auth-field mb-3">
              <label class="fm-auth-label">Email hoặc Số điện thoại</label>
              <input type="text" class="fm-auth-input" id="auth-login-id"
                placeholder="Email hoặc số điện thoại" autocomplete="username">
              <div class="fm-auth-error d-none" id="auth-login-id-err"></div>
            </div>
            <div class="fm-auth-field mb-3">
              <label class="fm-auth-label">Mật khẩu</label>
              <div class="position-relative">
                <input type="password" class="fm-auth-input pe-5" id="auth-login-pw"
                  placeholder="Ít nhất 6 ký tự" autocomplete="current-password">
                <button type="button" class="fm-pw-toggle" id="auth-login-pw-btn" aria-label="Hiện mật khẩu">
                  <i class="bi bi-eye" id="auth-login-pw-icon"></i>
                </button>
              </div>
              <div class="fm-auth-error d-none" id="auth-login-pw-err"></div>
            </div>
            <div class="mb-3 d-flex align-items-center gap-2">
              <input type="checkbox" id="auth-remember" class="form-check-input m-0">
              <label for="auth-remember" class="fm-auth-remember">Ghi nhớ tôi</label>
            </div>
            <button type="button" class="btn fm-btn-primary w-100 py-2 mb-3 fw-semibold" id="auth-login-btn">
              Đăng nhập
            </button>
            <p class="text-center small mb-0 fm-auth-switch-text">
              Chưa có tài khoản? <a href="#" class="fm-auth-link" id="auth-to-register">Đăng ký ngay</a>
            </p>
          </div>

          <!-- Panel: Đăng ký -->
          <div id="auth-panel-register" class="d-none">
            <div class="fm-auth-field mb-3">
              <label class="fm-auth-label">Họ và tên</label>
              <input type="text" class="fm-auth-input" id="auth-reg-name"
                placeholder="Ít nhất 3 ký tự" autocomplete="name">
              <div class="fm-auth-error d-none" id="auth-reg-name-err"></div>
            </div>
            <div class="fm-auth-field mb-3">
              <label class="fm-auth-label">Email</label>
              <input type="email" class="fm-auth-input" id="auth-reg-email"
                placeholder="example@email.com" autocomplete="email">
              <div class="fm-auth-error d-none" id="auth-reg-email-err"></div>
            </div>
            <div class="fm-auth-field mb-3">
              <label class="fm-auth-label">Số điện thoại</label>
              <input type="tel" class="fm-auth-input" id="auth-reg-phone"
                placeholder="10-11 chữ số" autocomplete="tel">
              <div class="fm-auth-error d-none" id="auth-reg-phone-err"></div>
            </div>
            <div class="fm-auth-field mb-3">
              <label class="fm-auth-label">Mật khẩu</label>
              <div class="position-relative">
                <input type="password" class="fm-auth-input pe-5" id="auth-reg-pw"
                  placeholder="Ít nhất 6 ký tự" autocomplete="new-password">
                <button type="button" class="fm-pw-toggle" id="auth-reg-pw-btn" aria-label="Hiện mật khẩu">
                  <i class="bi bi-eye" id="auth-reg-pw-icon"></i>
                </button>
              </div>
              <div class="fm-auth-error d-none" id="auth-reg-pw-err"></div>
            </div>
            <div class="fm-auth-field mb-3">
              <label class="fm-auth-label">Nhập lại mật khẩu</label>
              <input type="password" class="fm-auth-input" id="auth-reg-pw2"
                placeholder="Nhập lại mật khẩu" autocomplete="new-password">
              <div class="fm-auth-error d-none" id="auth-reg-pw2-err"></div>
            </div>
            <div class="mb-2 d-flex align-items-start gap-2">
              <input type="checkbox" id="auth-reg-terms" class="form-check-input flex-shrink-0" style="margin-top:3px">
              <label for="auth-reg-terms" class="fm-auth-remember">
                Tôi đồng ý với điều khoản sử dụng của FoodieMenu
              </label>
            </div>
            <div class="fm-auth-error d-none mb-2" id="auth-reg-terms-err"></div>
            <button type="button" class="btn fm-btn-primary w-100 py-2 mb-3 fw-semibold" id="auth-reg-btn">
              Tạo tài khoản
            </button>
            <p class="text-center small mb-0 fm-auth-switch-text">
              Đã có tài khoản? <a href="#" class="fm-auth-link" id="auth-to-login">Đăng nhập</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  _customerAuthModal = new bootstrap.Modal(el, { backdrop: true, keyboard: true });

  // Gắn event listeners — không dùng inline onclick
  el.querySelector('#auth-login-btn').addEventListener('click', _handleCustomerLogin);
  el.querySelector('#auth-reg-btn').addEventListener('click', _handleCustomerRegister);
  el.querySelector('#auth-to-register').addEventListener('click', e => { e.preventDefault(); _switchAuthView('register'); });
  el.querySelector('#auth-to-login').addEventListener('click', e => { e.preventDefault(); _switchAuthView('login'); });
  el.querySelector('#auth-login-pw-btn').addEventListener('click', () => _toggleAuthPw('auth-login-pw', 'auth-login-pw-icon'));
  el.querySelector('#auth-reg-pw-btn').addEventListener('click', () => _toggleAuthPw('auth-reg-pw', 'auth-reg-pw-icon'));
  el.querySelector('#auth-login-pw').addEventListener('keydown', e => { if (e.key === 'Enter') _handleCustomerLogin(); });
  el.querySelector('#auth-reg-pw2').addEventListener('keydown', e => { if (e.key === 'Enter') _handleCustomerRegister(); });
}
