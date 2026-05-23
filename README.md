# 🍜 FoodieMenu

> Ứng dụng thực đơn online đậm chất Việt Nam — giao diện khách hàng & quản trị Admin

---

## 📁 Cấu trúc thư mục

```
FoodieMenu/
├── index.html          → Trang chủ – hiển thị sản phẩm (Public)
├── admin.html          → Trang quản trị – CRUD sản phẩm (Admin)
├── css/
│   └── style.css       → CSS tùy chỉnh thêm ngoài Bootstrap 5
├── js/
│   ├── api.js          → Tập trung tất cả hàm gọi MockAPI (fetch)
│   ├── main.js         → Logic trang khách hàng (index.html)
│   ├── admin.js        → Logic trang quản trị (admin.html)
│   └── utils.js        → Các hàm tiện ích (validation, format tiền, v.v.)
├── img/                → Ảnh tĩnh sử dụng trong giao diện (logo, v.v.)
└── README.md           → Mô tả dự án, hướng dẫn chạy
```

---

## 🚀 Hướng dẫn chạy

### Cách 1 — Mở trực tiếp (không cần server)
```
Mở file index.html bằng trình duyệt Chrome / Edge / Firefox
```
> ⚠️ Một số trình duyệt chặn `localStorage` khi mở file `file://`. Nếu gặp lỗi, dùng Cách 2.

### Cách 2 — Dùng Live Server (VS Code)
1. Cài extension **Live Server** trong VS Code
2. Click chuột phải vào `index.html` → **Open with Live Server**
3. Trình duyệt tự mở tại `http://127.0.0.1:5500`

### Cách 3 — Dùng Python HTTP Server
```bash
cd FoodieMenu
python -m http.server 3000
# Truy cập: http://localhost:3000
```

---

## ✨ Tính năng

### Trang Khách hàng (`index.html`)
| Tính năng | Mô tả |
|-----------|-------|
| 🏠 Trang chủ | Hero section, 4 feature cards, shortcut danh mục, 6 món nổi bật |
| 🍜 Thực đơn | Lưới sản phẩm responsive, tìm kiếm real-time, lọc theo danh mục |
| 🔴 Hết món | Badge "Hết món" overlay + nút disabled động khi `available = false` |
| 🛒 Giỏ hàng | Tăng/giảm/xóa số lượng, order summary, đặt hàng mock |
| 💾 Persist | Giỏ hàng lưu `localStorage`, không mất khi reload |

### Trang Admin (`admin.html`)
| Tính năng | Mô tả |
|-----------|-------|
| 📊 Thống kê | 4 stat cards: tổng món, còn phục vụ, hết món, số danh mục |
| ➕ Thêm món | Modal form với preview ảnh realtime |
| ✏️ Sửa món | Điền sẵn dữ liệu, cập nhật toàn bộ trường |
| 🗑️ Xóa món | Confirm modal trước khi xóa |
| 🔄 Trạng thái | Toggle "Còn phục vụ" / "Hết món" ngay trong form |

---

## 🛠️ Công nghệ sử dụng

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| HTML5 | — | Cấu trúc trang |
| Bootstrap | 5.3.2 | Grid, components, modal |
| Bootstrap Icons | 1.11.3 | Icon set |
| Google Fonts | — | Playfair Display + DM Sans |
| Vanilla JS (ES6+) | — | Logic ứng dụng |
| localStorage | Web API | Mock database |

---

## 📦 Mock API (`js/api.js`)

Tất cả thao tác dữ liệu đều đi qua `API`:

```js
API.getProducts({ category, search })  // GET danh sách (có filter)
API.getProduct(id)                     // GET một sản phẩm
API.createProduct(data)                // POST thêm mới
API.updateProduct(id, data)            // PUT cập nhật
API.deleteProduct(id)                  // DELETE xóa
API.resetData()                        // Reset về dữ liệu mặc định
```

Mỗi hàm trả về `Promise` — có thể swap sang `fetch()` thực tế bằng cách thay phần thân hàm, **không cần đổi code ở main.js hay admin.js**.

---

## 🎨 Design System

```css
--fm-primary:      #E85D04   /* cam chủ đạo   */
--fm-primary-dark: #C24A02   /* cam tối hover  */
--fm-amber:        #F48C06   /* vàng nhấn      */
--fm-cream:        #FFFBF5   /* nền kem        */
--fm-dark:         #1A0A00   /* nâu tối navbar */
--fm-muted:        #7A5C3F   /* chữ phụ        */
```

---

## 📝 Ghi chú phát triển

- **Thêm API thật**: Thay nội dung trong `js/api.js`, giữ nguyên signature các hàm.
- **Thêm danh mục**: Cập nhật mảng `CATEGORIES` trong `main.js` và options trong `admin.html`.
- **Upload ảnh**: Tích hợp Cloudinary / S3 vào trường `f-image` trong modal admin.
- **Auth admin**: Thêm kiểm tra session/token ở đầu `admin.js`.
