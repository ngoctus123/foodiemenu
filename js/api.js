/**
 * api.js — Mock API tập trung tất cả hàm fetch/CRUD
 * Dữ liệu lưu trong localStorage, trả về Promise (giả lập async fetch thực)
 */

const STORAGE_KEY = 'fm_products';

const DEFAULT_PRODUCTS = [
  { id: 1,  name: 'Phở Bò Đặc Biệt',   price: 65000, category: 'Phở',         image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80', available: true,  description: 'Nước dùng hầm xương 12 tiếng, thịt bò tươi' },
  { id: 2,  name: 'Phở Gà Ta',          price: 55000, category: 'Phở',         image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80', available: true,  description: 'Gà ta thả vườn, vị ngọt tự nhiên' },
  { id: 3,  name: 'Bún Bò Huế',         price: 60000, category: 'Bún',         image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80', available: true,  description: 'Cay nồng đặc trưng miền Trung' },
  { id: 4,  name: 'Bún Chả Hà Nội',     price: 65000, category: 'Bún',         image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80', available: false, description: 'Chả nướng than hoa thơm lừng' },
  { id: 5,  name: 'Cơm Tấm Sườn Bì',   price: 70000, category: 'Cơm',         image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80', available: true,  description: 'Sườn bì chả trứng hấp đầy đủ' },
  { id: 6,  name: 'Cơm Gà Hội An',      price: 65000, category: 'Cơm',         image: 'https://images.unsplash.com/photo-1604908177453-7462950a6a3b?w=400&q=80', available: true,  description: 'Gà xé phay cơm vàng truyền thống' },
  { id: 7,  name: 'Bánh Mì Thịt Nướng', price: 35000, category: 'Bánh',        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', available: true,  description: 'Bánh giòn, nhân thịt nướng mật ong' },
  { id: 8,  name: 'Bánh Cuốn Nóng',     price: 45000, category: 'Bánh',        image: 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80', available: false, description: 'Bánh cuốn nhân thịt mộc nhĩ' },
  { id: 9,  name: 'Cà Phê Trứng',       price: 45000, category: 'Đồ uống',     image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80', available: true,  description: 'Đặc sản Hà Nội, béo ngậy thơm ngon' },
  { id: 10, name: 'Trà Đào Cam Sả',     price: 40000, category: 'Đồ uống',     image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', available: true,  description: 'Thanh mát, thơm nức mũi' },
  { id: 11, name: 'Chè Bưởi Xanh',      price: 35000, category: 'Tráng miệng', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80', available: true,  description: 'Thanh mát, bưởi tươi mùa hè' },
  { id: 12, name: 'Bánh Flan Caramel',  price: 30000, category: 'Tráng miệng', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80', available: false, description: 'Mịn màng, vị caramel đắng ngọt' },
];

// ── Private helpers ───────────────────────────────────

function _getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return structuredClone(DEFAULT_PRODUCTS);
    }
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_PRODUCTS);
  }
}

function _setData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Public API ────────────────────────────────────────

const API = {

  /**
   * GET /products  — Lấy danh sách món ăn, hỗ trợ filter
   * @param {{ category?: string, search?: string }} filters
   * @returns {Promise<Array>}
   */
  getProducts(filters = {}) {
    return new Promise(resolve => {
      setTimeout(() => {
        let data = _getData();
        if (filters.category && filters.category !== 'Tất cả') {
          data = data.filter(p => p.category === filters.category);
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          data = data.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          );
        }
        resolve(data);
      }, 80);
    });
  },

  /**
   * GET /products/:id  — Lấy một món ăn theo id
   * @returns {Promise<Object>}
   */
  getProduct(id) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const product = _getData().find(p => p.id === Number(id));
        product ? resolve(product) : reject(new Error('Không tìm thấy món ăn'));
      }, 80);
    });
  },

  /**
   * POST /products  — Thêm món ăn mới
   * @returns {Promise<Object>}  sản phẩm vừa tạo (có id)
   */
  createProduct(data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const products = _getData();
          const newProduct = {
            ...data,
            id: Date.now(),
            price: Number(data.price),
            available: data.available !== undefined ? Boolean(data.available) : true,
          };
          _setData([...products, newProduct]);
          resolve(newProduct);
        } catch (e) {
          reject(new Error('Lỗi khi thêm món ăn'));
        }
      }, 150);
    });
  },

  /**
   * PUT /products/:id  — Cập nhật thông tin món ăn
   * @returns {Promise<Object>}  sản phẩm sau khi cập nhật
   */
  updateProduct(id, data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const products = _getData();
        const idx = products.findIndex(p => p.id === Number(id));
        if (idx === -1) { reject(new Error('Không tìm thấy món ăn')); return; }
        const updated = {
          ...products[idx],
          ...data,
          id: Number(id),
          price: Number(data.price ?? products[idx].price),
        };
        products[idx] = updated;
        _setData(products);
        resolve(updated);
      }, 150);
    });
  },

  /**
   * DELETE /products/:id  — Xóa món ăn
   * @returns {Promise<{ success: true, id: number }>}
   */
  deleteProduct(id) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const products = _getData();
        const filtered = products.filter(p => p.id !== Number(id));
        if (filtered.length === products.length) {
          reject(new Error('Không tìm thấy món ăn'));
          return;
        }
        _setData(filtered);
        resolve({ success: true, id: Number(id) });
      }, 150);
    });
  },

  /** Reset về dữ liệu mặc định (dùng khi dev/test) */
  resetData() {
    _setData(DEFAULT_PRODUCTS);
    return Promise.resolve(structuredClone(DEFAULT_PRODUCTS));
  },
};
