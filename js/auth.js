/**
 * auth.js — Xác thực người dùng cho trang admin
 *
 * ⚠️  DEMO ONLY: Tài khoản hard-coded KHÔNG phù hợp production.
 * Trong production, thay Auth.login() bằng API thật:
 *   POST /api/auth/login  →  server trả JWT hoặc session cookie
 *   Tuyệt đối không lưu mật khẩu dạng plaintext ở client-side.
 */

const Auth = {
  SESSION_KEY: 'fm_admin_auth',

  // Chỉ dùng cho demo — xóa khi tích hợp backend
  _DEMO_USER: 'admin',
  _DEMO_PASS: 'admin123',

  isLoggedIn() {
    return !!sessionStorage.getItem(this.SESSION_KEY);
  },

  /**
   * Kiểm tra thông tin đăng nhập
   * Production: thay nội dung hàm này bằng:
   *   const res = await fetch('/api/auth/login', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ username, password }),
   *   });
   *   if (!res.ok) return false;
   *   const { token } = await res.json();
   *   sessionStorage.setItem(this.SESSION_KEY, token);
   *   return true;
   */
  async login(username, password) {
    // Giả lập độ trễ mạng để UX tự nhiên hơn
    await new Promise(r => setTimeout(r, 380));

    if (username === this._DEMO_USER && password === this._DEMO_PASS) {
      sessionStorage.setItem(
        this.SESSION_KEY,
        JSON.stringify({ username, loginAt: Date.now() })
      );
      return true;
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },
};

// ── Auth Gate: chạy ngay khi DOM sẵn sàng ───────────
document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('login-screen');
  const adminApp    = document.getElementById('admin-app');
  const loginForm   = document.getElementById('login-form');
  const loginError  = document.getElementById('login-error');
  const logoutBtn   = document.getElementById('logout-btn');

  function showLogin() {
    // Reset submit button — tránh kẹt disabled/spinner khi logout rồi login lại
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Đăng nhập';

    loginScreen.classList.remove('d-none');
    adminApp.classList.add('d-none');
  }

  function showAdmin() {
    loginScreen.classList.add('d-none');
    adminApp.classList.remove('d-none');
  }

  // ── Kiểm tra session khi tải trang ──────────────
  if (Auth.isLoggedIn()) {
    showAdmin();
    initAdmin();
  } else {
    showLogin();
  }

  // ── Xử lý submit form đăng nhập ─────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username  = document.getElementById('login-username').value.trim();
    const password  = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    loginError.classList.add('d-none');
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Đang đăng nhập…';

    const ok = await Auth.login(username, password);

    if (ok) {
      showAdmin();
      initAdmin();
    } else {
      loginError.classList.remove('d-none');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng nhập';
    }
  });

  // ── Xử lý đăng xuất ─────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      loginForm.reset();
      loginError.classList.add('d-none');
      showLogin();
    });
  }
});
