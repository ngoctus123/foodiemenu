/**
 * utils.js — Các hàm tiện ích dùng chung
 * Bao gồm: format tiền, validate form, toast, debounce, cart helpers
 */

const CART_KEY = 'fm_cart';

// SVG data-URI placeholder — hiển thị khi ảnh lỗi, không phụ thuộc file local
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23F5EDE0'/%3E%3Ccircle cx='200' cy='130' r='58' fill='%23EEE3D3' stroke='%23C8A882' stroke-width='3'/%3E%3Ccircle cx='200' cy='130' r='43' fill='none' stroke='%23C8A882' stroke-width='1.5' stroke-dasharray='5,4'/%3E%3Ctext x='200' y='218' text-anchor='middle' fill='%23C8A882' font-size='13' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";

const Utils = {

  /** Format số tiền sang định dạng Việt Nam: 65000 → "65.000đ" */
  formatPrice(n) {
    return new Intl.NumberFormat('vi-VN').format(Number(n)) + 'đ';
  },

  /** Validate dữ liệu form sản phẩm. Trả về mảng lỗi ([] = hợp lệ) */
  validateProduct(data) {
    const errors = [];
    if (!data.name || !String(data.name).trim())
      errors.push('Tên món không được để trống');
    if (!data.price || isNaN(data.price) || Number(data.price) <= 0)
      errors.push('Giá phải là số dương hợp lệ');
    if (!data.category)
      errors.push('Vui lòng chọn danh mục');
    return errors;
  },

  /**
   * Hiển thị toast notification
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   */
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const cfg = {
      success: { icon: '✅', bg: '#1A0A00' },
      error:   { icon: '❌', bg: '#C62828' },
      warning: { icon: '⚠️', bg: '#E65100' },
      info:    { icon: 'ℹ️', bg: '#01579B' },
    };
    const { icon, bg } = cfg[type] || cfg.success;

    const el = document.createElement('div');
    el.className = 'fm-toast';
    el.style.background = bg;

    // Dùng DOM API + textContent — tránh XSS khi message chứa tên món từ user data
    const iconSpan = document.createElement('span');
    iconSpan.className = 'fm-toast-icon';
    iconSpan.textContent = icon;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'fm-toast-msg';
    msgSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fm-toast-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => el.remove());

    el.append(iconSpan, msgSpan, closeBtn);
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  /**
   * Debounce: trì hoãn thực thi hàm sau khi người dùng ngừng gõ
   * @param {Function} fn
   * @param {number} delay  ms
   */
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // ── Cart helpers ─────────────────────────────────────

  /** Đọc giỏ hàng từ localStorage, normalize để chặn dữ liệu bị sửa */
  loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(i => i && typeof i === 'object' && Number.isFinite(Number(i.id)))
        .map(i => ({
          ...i,
          id:       Number(i.id),
          qty:      Math.max(1, Math.floor(Number(i.qty) || 1)),
          price:    Math.max(0, Number(i.price) || 0),
          name:     String(i.name     || ''),
          category: String(i.category || ''),
          image:    String(i.image    || ''),
        }));
    } catch {
      return [];
    }
  },

  /** Lưu giỏ hàng vào localStorage */
  saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  },

  /** Xóa giỏ hàng */
  clearCart() {
    localStorage.removeItem(CART_KEY);
  },

  // ── Misc helpers ──────────────────────────────────────

  /** Trả về emoji icon theo danh mục */
  getCategoryIcon(cat) {
    const map = {
      'Khai vị': '🥗', 'Món chính': '🍜', 'Bánh mặn': '🥟',
      'Bánh tráng miệng': '🍰', 'Tráng miệng': '🍮',
      'Đồ uống lạnh': '🧋', 'Đồ uống nóng': '☕', 'Set/Combo': '🎁',
      // Legacy
      'Phở': '🍜', 'Bún': '🍝', 'Cơm': '🍚',
      'Bánh': '🥖', 'Đồ uống': '☕',
    };
    return map[cat] || '🍽️';
  },

  /**
   * Sanitize URL ảnh để dùng trong src attribute.
   * Chỉ cho phép http/https — chặn javascript:, data:, và attribute injection.
   * Trả về URL đã escape hoặc fallback placeholder nếu không hợp lệ.
   */
  safeImgSrc(url, fallback = PLACEHOLDER_IMG) {
    const s = String(url || '').trim();
    if (!s) return fallback;
    // Whitelist: absolute http/https or relative paths only (no file:, blob:, data:, unknown schemes)
    if (!/^https?:\/\//i.test(s) && !/^[a-zA-Z0-9_./-]/.test(s)) return fallback;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(s) && !/^https?:/i.test(s)) return fallback;
    return this.escapeHtml(s);
  },

  /** Escape chuỗi để chèn an toàn vào HTML (text node hoặc attribute) */
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },
};

// Expose cho inline onerror handlers trong template strings
Utils.PLACEHOLDER = PLACEHOLDER_IMG;
