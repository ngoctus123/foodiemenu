/**
 * main.js — Logic trang khách hàng (index.html)
 * Quản lý: điều hướng trang, hiển thị sản phẩm, tìm kiếm/lọc, giỏ hàng
 */

// ── Hằng số ───────────────────────────────────────────
const CATEGORIES = ['Tất cả', 'Phở', 'Bún', 'Cơm', 'Bánh', 'Đồ uống', 'Tráng miệng'];

// ── Trạng thái ứng dụng ───────────────────────────────
const state = {
  products: [],       // tất cả sản phẩm gốc
  cart: [],           // giỏ hàng
  page: 'home',       // trang hiện tại: 'home' | 'menu' | 'cart'
  category: 'Tất cả', // bộ lọc danh mục
  search: '',         // từ khóa tìm kiếm
};

// ── Khởi tạo ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  state.cart = Utils.loadCart();
  await loadProducts();
  renderHome();
  syncCartBadge();
  setNavActive('home');
});

// Delegation listener — tránh truyền object qua inline onclick
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add-id]');
  if (!btn) return;
  const product = state.products.find(p => p.id === Number(btn.dataset.addId));
  if (product) addToCart(product);
});

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
  ['home', 'menu', 'cart'].forEach(p => {
    const el = document.getElementById(`view-${p}`);
    if (el) el.classList.toggle('d-none', p !== page);
  });
  setNavActive(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'home') renderHome();
  else if (page === 'menu') renderMenu();
  else if (page === 'cart') renderCart();
}

function setNavActive(page) {
  ['home', 'menu'].forEach(p => {
    const btn = document.getElementById(`nav-${p}`);
    if (btn) btn.classList.toggle('active', p === page);
  });
}

// ── Trang Chủ ─────────────────────────────────────────
function renderHome() {
  const el = document.getElementById('view-home');
  if (!el) return;

  const featured = state.products.slice(0, 6);

  el.innerHTML = `
    <!-- Hero -->
    <section class="fm-hero">
      <div class="fm-hero-bg"></div>
      <div class="container position-relative text-center py-2">
        <h1 class="fm-hero-title">Thực đơn <em>ngon</em><br>giao tận nơi</h1>
        <p class="fm-hero-sub">Khám phá hàng trăm món ăn đậm đà hương vị Việt Nam<br>từ phở, bún đến cơm và đồ uống đặc sắc</p>
        <div class="fm-search-hero mx-auto">
          <i class="bi bi-search fm-si"></i>
          <input class="fm-sinput" placeholder="Tìm kiếm món ăn yêu thích..."
            oninput="heroSearch(this.value)" autocomplete="off">
        </div>
      </div>
    </section>

    <div class="container-xl py-5 px-3 px-md-4">

      <!-- Feature cards -->
      <div class="row g-3 mb-5">
        ${[
          { ico: '🍜', h: 'Hương vị chuẩn vị', t: 'Công thức gia truyền, nguyên liệu tươi mỗi ngày' },
          { ico: '🚀', h: 'Giao hàng nhanh',   t: '30 phút có mặt tại địa chỉ của bạn' },
          { ico: '💳', h: 'Thanh toán dễ',      t: 'Nhận nhiều hình thức thanh toán tiện lợi' },
          { ico: '⭐', h: 'Đánh giá 5 sao',     t: 'Hơn 10.000 khách hàng hài lòng mỗi tháng' },
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
      <h2 class="fm-section-title">Danh mục</h2>
      <p class="text-muted small mb-3">Chọn món theo sở thích</p>
      <div class="d-flex flex-wrap gap-2 mb-5">
        ${['Phở','Bún','Cơm','Bánh','Đồ uống','Tráng miệng'].map(c => `
          <button class="btn fm-cat-pill" onclick="goToCategory('${c}')">
            ${Utils.getCategoryIcon(c)} ${c}
          </button>
        `).join('')}
      </div>

      <!-- Món nổi bật -->
      <h2 class="fm-section-title">Món nổi bật</h2>
      <p class="text-muted small mb-3">Được yêu thích nhất tháng này</p>
      <div class="row g-3">
        ${featured.map(p => `<div class="col-6 col-md-4 col-xl-3">${buildProductCard(p)}</div>`).join('')}
      </div>

      <div class="text-center mt-5">
        <button class="btn fm-btn-primary px-4 py-2 fs-6" onclick="navigateTo('menu')">
          Xem tất cả thực đơn <i class="bi bi-arrow-right ms-1"></i>
        </button>
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
      <div class="d-flex flex-wrap gap-2 mb-4" id="cat-pills">
        ${CATEGORIES.map(c => `
          <button class="btn fm-cat-pill ${state.category === c ? 'active' : ''}"
            onclick="filterByCategory('${c}')">${c}</button>
        `).join('')}
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

function applyFilters() {
  const grid = document.getElementById('product-grid');
  const countEl = document.getElementById('menu-count');
  if (!grid) return;

  const q = state.search.toLowerCase();
  const filtered = state.products.filter(p => {
    const matchCat = state.category === 'Tất cả' || p.category === state.category;
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (countEl) countEl.textContent = `${filtered.length} món ăn`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="fm-empty text-center py-5">
          <div class="fm-empty-ico">🔍</div>
          <h5 class="fw-bold mt-3 mb-1">Không tìm thấy món ăn</h5>
          <p class="text-muted">Thử từ khóa khác hoặc chọn danh mục khác</p>
          <button class="btn fm-btn-outline mt-2" onclick="clearSearch();filterByCategory('Tất cả')">
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

// ── Product Card HTML builder ──────────────────────────
function buildProductCard(p) {
  const name     = Utils.escapeHtml(p.name);
  const category = Utils.escapeHtml(p.category);
  const desc     = Utils.escapeHtml(p.description);

  // data-add-id: tránh truyền JSON object qua onclick (dễ vỡ HTML, mở đường injection)
  const addBtn = p.available
    ? `<button class="btn fm-add-btn" data-add-id="${p.id}">＋ Thêm</button>`
    : `<span class="fm-sold-badge">Hết món</span>`;

  return `
    <div class="fm-card h-100">
      <div class="fm-card-img">
        <img src="${Utils.safeImgSrc(p.image)}" alt="${name}" loading="lazy">
        ${!p.available ? '<div class="fm-sold-overlay"><span>Hết món</span></div>' : ''}
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
  state.cart = state.cart
    .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
    .filter(i => i.qty > 0);
  Utils.saveCart(state.cart);
  syncCartBadge();
  renderCart();
}

function removeFromCart(id) {
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
        <!-- Danh sách món -->
        <div class="col-lg-8">
          ${cart.map(item => `
            <div class="fm-cart-item">
              <img src="${Utils.safeImgSrc(item.image)}" alt="${Utils.escapeHtml(item.name)}">
              <div class="flex-grow-1 overflow-hidden">
                <div class="fw-bold text-truncate">${Utils.escapeHtml(item.name)}</div>
                <div class="text-muted small">${Utils.escapeHtml(item.category)}</div>
                <div class="fm-qty-ctrl mt-2">
                  <button class="fm-qty-btn" onclick="updateQty(${item.id}, -1)">−</button>
                  <span class="fm-qty-val">${item.qty}</span>
                  <button class="fm-qty-btn" onclick="updateQty(${item.id}, +1)">+</button>
                </div>
              </div>
              <div class="text-end flex-shrink-0">
                <div class="fm-price mb-2">${Utils.formatPrice(item.price * item.qty)}</div>
                <button class="fm-remove-btn" onclick="removeFromCart(${item.id})" title="Xóa">
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Tóm tắt đơn hàng -->
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
          </div>
        </div>
      </div>
    </div>
  `;
}

function placeOrder() {
  const btn = document.getElementById('order-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...`;
  }
  setTimeout(() => {
    state.cart = [];
    Utils.clearCart();
    syncCartBadge();
    const el = document.getElementById('view-cart');
    if (el) el.innerHTML = `
      <div class="container-xl py-5 px-3">
        <div class="fm-empty text-center py-5">
          <div class="fm-empty-ico">✅</div>
          <h4 class="fw-bold mt-3 mb-2">Đặt hàng thành công!</h4>
          <p class="text-muted mb-4">Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ giao trong 30 phút.</p>
          <button class="btn fm-btn-primary px-4" onclick="navigateTo('menu')">Đặt thêm món</button>
        </div>
      </div>`;
    Utils.showToast('Đặt hàng thành công! 🎉');
  }, 1600);
}
