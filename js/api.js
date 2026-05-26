/**
 * api.js — Mock API tập trung tất cả hàm fetch/CRUD
 * Dữ liệu lưu trong localStorage, trả về Promise (giả lập async fetch thực)
 *
 * ⚠ Nếu thấy dữ liệu cũ, chạy lệnh sau trong DevTools Console để reset:
 *   localStorage.removeItem('fm_products')  rồi reload trang
 */

const STORAGE_KEY = 'fm_products';
const VERSION_KEY = 'fm_products_version';
const DATA_VERSION = 3; // tăng số này mỗi khi thay đổi schema/danh mục DEFAULT_PRODUCTS

const DEFAULT_PRODUCTS = [
  // ── KHAI VỊ ──────────────────────────────────────────
  {
    id: 1,
    name: 'Gỏi Cuốn Tôm Thịt',
    price: 45000,
    category: 'Khai vị',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDiDfaAc82y_656yac7nqD4nRFJwALoDOdaQ&s',
    available: true,
    description: 'Gỏi cuốn tươi mát, nhân tôm thịt giòn ngon',
    detail: 'Gỏi cuốn được làm từ bánh tráng tươi cuốn cùng tôm luộc, thịt heo, bún tươi, rau sống giòn mát. Chấm kèm tương đậu phộng béo ngậy hoặc nước mắm chua ngọt.',
    ingredients: 'Bánh tráng, tôm, thịt heo, bún, rau sống, rau thơm, dưa leo, cà rốt',
    tags: ['Bán chạy'],
  },
  {
    id: 2,
    name: 'Nem Rán Nhân Thập Cẩm',
    price: 50000,
    category: 'Khai vị',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpvpeEZ0KI9LqbAnw59rlnpUlvchk1qmc_xg&s',
    available: true,
    description: 'Nem rán vàng giòn, nhân thập cẩm thơm ngon (5 cái/phần)',
    detail: 'Nem rán bọc bánh tráng mỏng, chiên giòn vàng ươm. Nhân thịt heo xay, miến, nấm mộc nhĩ, trứng, cà rốt. Chấm nước mắm chua ngọt tỏi ớt.',
    ingredients: 'Bánh tráng, thịt heo, miến, nấm mộc nhĩ, trứng, cà rốt, hành tây',
    tags: [],
  },
  {
    id: 3,
    name: 'Nộm Bò Khô Xanh',
    price: 55000,
    category: 'Khai vị',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCro4gMesD3Z3cEms1KdATSW1srFYlH0K2cg&s',
    available: true,
    description: 'Nộm giòn chua cay, bò khô thơm đậm vị miền Trung',
    detail: 'Đu đủ xanh bào sợi, cà rốt, rau thơm, bò khô thái mỏng, đậu phộng rang giòn. Trộn nước mắm chua ngọt pha sả ớt.',
    ingredients: 'Đu đủ xanh, cà rốt, bò khô, đậu phộng, rau thơm, sả, ớt, nước mắm',
    tags: ['Món mới'],
  },
  {
    id: 4,
    name: 'Súp Cua Bắp',
    price: 45000,
    category: 'Khai vị',
    image: 'https://cdn.tgdd.vn/Files/2020/10/18/1300089/cach-nau-sup-cua-ngon-bo-duong-chuan-vi-don-gian-tai-nha-202205251250388279.jpg',
    available: true,
    description: 'Súp cua béo ngọt, bắp tươi hầm mềm thơm nức',
    detail: 'Nước dùng xương trong, thịt cua đồng tươi, bắp mỹ hầm mềm, trứng cút, nấm hương. Ăn nóng với rau mùi và ớt tươi.',
    ingredients: 'Thịt cua, bắp mỹ, trứng cút, nấm hương, tinh bột ngô, nước dùng xương',
    tags: [],
  },

  // ── MÓN CHÍNH ─────────────────────────────────────────
  {
    id: 5,
    name: 'Phở Bò Đặc Biệt',
    price: 75000,
    category: 'Món chính',
    image: 'https://bizweb.dktcdn.net/100/442/328/products/pho-bo-dac-biet-com-nieu-sai-gon.jpg?v=1721796376980',
    available: true,
    description: 'Nước dùng hầm xương 12 tiếng, thịt bò tươi mềm',
    detail: 'Xương bò, xương gà hầm 12 tiếng với quế, hồi, gừng nướng, sả. Bò tái, bò chín, gầu, gân đầy đủ. Bánh phở trắng mềm.',
    ingredients: 'Bánh phở, xương bò, thịt bò tái, bò chín, gầu, gân, hành lá, ngò gai, giá, chanh, ớt',
    tags: ['Bán chạy'],
  },
  {
    id: 6,
    name: 'Bún Bò Huế Cay',
    price: 70000,
    category: 'Món chính',
    image: 'https://i.ytimg.com/vi/A_o2qfaTgKs/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDLj67gTiQBsryAaEQJ6s5Fa07yWg',
    available: true,
    description: 'Cay nồng đặc trưng xứ Huế, bò chả lụa đậm đà',
    detail: 'Nước lèo đỏ đậm từ sả, mắm ruốc Huế, ớt đỏ. Thịt bò bắp chín mềm, chả lụa Huế. Bún sợi to, ăn kèm rau sống, giá, bắp chuối bào.',
    ingredients: 'Bún tươi, bắp bò, chả lụa Huế, sả, mắm ruốc, ớt, hành tây, rau sống',
    tags: ['Bán chạy'],
  },
  {
    id: 7,
    name: 'Cơm Tấm Sườn Bì Chả',
    price: 80000,
    category: 'Món chính',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS03D3gzDYzWws3V3jc8JkrrDVb4v0EREstEw&s',
    available: true,
    description: 'Cơm tấm Sài Gòn đủ món, sườn nướng than hoa thơm',
    detail: 'Cơm tấm dẻo thơm, sườn heo nướng than hoa mật ong, bì lợn da giòn, chả trứng hấp. Ăn kèm đồ chua, dưa leo. Nước mắm pha chua ngọt đặc trưng.',
    ingredients: 'Cơm tấm, sườn heo, bì lợn, trứng, chả, mỡ hành, đồ chua, nước mắm',
    tags: ['Bán chạy', 'Ưu đãi'],
  },
  {
    id: 8,
    name: 'Cơm Gà Hội An',
    price: 70000,
    category: 'Món chính',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMvTk4KFs119EdWgK2Xacjf460r7cOcRIyjA&s',
    available: true,
    description: 'Gà ta thả vườn xé phay, cơm vàng nghệ truyền thống',
    detail: 'Gà ta thả vườn luộc nguyên con giữ nguyên vị ngọt tự nhiên. Cơm nấu bằng nước luộc gà và nghệ tươi, dẻo thơm vàng óng. Gà xé phay trộn hành phi, rau răm.',
    ingredients: 'Gà ta, cơm, nghệ, gừng, hành phi, rau răm, hành lá, ớt',
    tags: [],
  },
  {
    id: 9,
    name: 'Bánh Đúc Nóng Thịt Nấm',
    price: 55000,
    category: 'Món chính',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3J670KkAS7pniJOzKhl-AQtwOjdJzNvFRGA&s',
    available: true,
    description: 'Bánh đúc mềm mịn, nhân thịt nấm béo ngậy chan nước dùng',
    detail: 'Bánh đúc Hà Nội trắng ngà mềm mịn chan nước dùng xương trong vắt. Nhân thịt heo xay xào cùng nấm hương, mộc nhĩ, hành phi thơm bùi.',
    ingredients: 'Bột gạo, thịt heo, nấm hương, mộc nhĩ, hành phi, nước mắm, tiêu',
    tags: ['Món mới'],
  },
  {
    id: 10,
    name: 'Bún Chả Hà Nội',
    price: 70000,
    category: 'Món chính',
    image: 'https://cdn11.dienmaycholon.vn/filewebdmclnew/public/userupload/files/kien-thuc/cach-lam-bun-cha-ha-noi/cach-lam-bun-cha-ha-noi-1.jpg',
    available: false,
    description: 'Chả nướng than hoa thơm lừng, nước chấm chuẩn Hà Nội',
    detail: 'Chả viên và chả miếng nướng trên than hoa đỏ rực thơm lừng. Nước chấm pha chua ngọt mặn từ nước mắm, chanh, tỏi ớt. Ăn kèm rau sống, bún tươi.',
    ingredients: 'Thịt heo, bún tươi, rau sống, tỏi, ớt, nước mắm, đường, chanh',
    tags: [],
  },

  // ── BÁNH MẶN ──────────────────────────────────────────
  {
    id: 11,
    name: 'Bánh Cuốn Nhân Thịt',
    price: 55000,
    category: 'Bánh mặn',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4e-62QHvRSMjgmN9BsSxGZnHpR8jzRk04lg&s',
    available: true,
    description: 'Bánh cuốn hấp mỏng mềm, nhân thịt mộc nhĩ thơm ngon',
    detail: 'Tráng tay từ bột gạo tươi, hấp mỏng mịn, nhân thịt heo xay xào mộc nhĩ. Chấm nước mắm pha thơm mùi hành phi, ăn kèm chả lụa.',
    ingredients: 'Bột gạo, thịt heo, mộc nhĩ, hành tây, hành phi, chả lụa, nước mắm',
    tags: ['Bán chạy'],
  },
  {
    id: 12,
    name: 'Bánh Xèo Miền Trung',
    price: 65000,
    category: 'Bánh mặn',
    image: 'https://www.huongnghiepaau.com/wp-content/uploads/2017/02/cach-lam-banh-xeo-mien-trung.jpg',
    available: true,
    description: 'Bánh xèo giòn rụm, nhân tôm thịt giá đỗ hấp dẫn',
    detail: 'Vỏ bánh giòn vàng từ bột gạo pha nghệ, nhân tôm sú tươi, thịt ba chỉ, giá đỗ. Cuốn cùng bánh tráng, rau sống, chấm nước mắm pha đậu phộng giã.',
    ingredients: 'Bột gạo, nghệ, tôm sú, thịt ba chỉ, giá đỗ, hành lá, rau sống, bánh tráng',
    tags: [],
  },
  {
    id: 13,
    name: 'Bánh Bột Lọc Trần',
    price: 45000,
    category: 'Bánh mặn',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_kC3nY-8C6mDj1fGUo57F6DviQKveEo98vA&s',
    available: true,
    description: 'Bánh Huế trong suốt, nhân tôm thịt thơm béo (6 cái)',
    detail: 'Đặc sản xứ Huế, vỏ bánh năng trong suốt mềm dẻo. Nhân tôm chấu và thịt heo xào gia vị Huế đậm đà. Chấm nước mắm Huế cay ngọt.',
    ingredients: 'Bột năng, tôm, thịt heo, dầu hào, tiêu, nước mắm',
    tags: ['Món mới'],
  },
  {
    id: 14,
    name: 'Bánh Giò Hà Nội',
    price: 35000,
    category: 'Bánh mặn',
    image: 'https://daylambanh.edu.vn/wp-content/uploads/2024/05/cach-lam-banh-gio-bang-bot-gao.jpg',
    available: true,
    description: 'Bánh giò bọc lá chuối, nhân thịt mộc nhĩ thơm mềm',
    detail: 'Bọc lá chuối tươi hấp nóng. Vỏ từ bột gạo, bột năng mịn mềm. Nhân thịt heo xay, mộc nhĩ, tiêu thơm. Ăn kèm chả lụa và nước mắm ớt.',
    ingredients: 'Bột gạo, bột năng, thịt heo, mộc nhĩ, lá chuối, tiêu, nước mắm',
    tags: [],
  },

  // ── BÁNH TRÁNG MIỆNG ───────────────────────────────────
  {
    id: 15,
    name: 'Bánh Flan Caramel',
    price: 35000,
    category: 'Bánh tráng miệng',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8wXb_ANn3IBMcOotnhn9pG9MAtS3FVqb8Hw&s',
    available: true,
    description: 'Flan mịn béo, caramel đắng ngọt tan chảy',
    detail: 'Tự làm mỗi ngày từ trứng, sữa tươi, kem tươi. Caramel màu hổ phách đặc trưng, đắng ngọt cân bằng. Flan mịn tan trong miệng, ướp lạnh 8 tiếng trước khi dùng.',
    ingredients: 'Trứng gà, sữa tươi, kem tươi, đường, vani',
    tags: ['Bán chạy'],
  },
  {
    id: 16,
    name: 'Bánh Da Lợn Lá Dứa',
    price: 30000,
    category: 'Bánh tráng miệng',
    image: 'https://cdn.tgdd.vn/2021/12/CookDish/cach-lam-banh-da-lon-dau-xanh-thom-ngon-tai-nha-avt-1200x676.jpg',
    available: true,
    description: 'Bánh da lợn thơm lá dứa, lớp dừa béo ngậy xen kẽ',
    detail: 'Nhiều lớp xanh trắng xen kẽ từ lá dứa và nước dừa. Mỗi lớp mỏng mịn, ngọt nhẹ, thơm mùi lá dứa tự nhiên. Bánh dẻo dai, ăn mát lạnh.',
    ingredients: 'Bột năng, bột gạo, nước dừa, lá dứa, đường, muối',
    tags: ['Món mới'],
  },
  {
    id: 17,
    name: 'Bánh Chuối Hấp Dừa',
    price: 30000,
    category: 'Bánh tráng miệng',
    image: 'https://www.huongnghiepaau.com/wp-content/uploads/2016/10/cach-lam-banh-chuoi-hap-nuoc-cot-dua.jpg',
    available: true,
    description: 'Bánh chuối dẻo ngọt, chan nước dừa béo ngậy',
    detail: 'Chuối xiêm chín ngọt nghiền nhuyễn trộn bột, hấp chín dẻo thơm. Chan nước cốt dừa tươi thêm chút muối. Rắc mè rang vàng thơm bùi.',
    ingredients: 'Chuối xiêm, bột năng, bột gạo, nước cốt dừa, đường, muối, mè',
    tags: [],
  },
  {
    id: 18,
    name: 'Bánh Bò Nướng',
    price: 25000,
    category: 'Bánh tráng miệng',
    image: 'https://daylambanh.edu.vn/wp-content/uploads/2024/04/cach-lam-banh-bo-bang-bot-gao.jpg',
    available: true,
    description: 'Bánh bò xốp nhẹ, nướng vàng thơm ngọt ngào',
    detail: 'Xốp nhẹ như bông, lỗ xốp đều từ men tự nhiên. Nướng vàng đều, vỏ giòn nhẹ, trong mềm bông. Vị ngọt thanh từ đường thốt nốt.',
    ingredients: 'Bột gạo, đường thốt nốt, nước cốt dừa, men nở, muối',
    tags: [],
  },

  // ── TRÁNG MIỆNG ────────────────────────────────────────
  {
    id: 19,
    name: 'Chè Bưởi Xanh',
    price: 35000,
    category: 'Tráng miệng',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeMMcgvy089g_FEsRKpE-tbWo4KSSAbLBZeQ&s',
    available: true,
    description: 'Bưởi tươi mùa hè, chè thanh mát ngọt dịu',
    detail: 'Múi bưởi da xanh tươi tách sợi, trộn bột sắn dây. Nước chè đường phèn, pandan. Chan nước cốt dừa béo, rắc mè. Mát lạnh giải nhiệt hoàn hảo.',
    ingredients: 'Bưởi da xanh, bột sắn dây, đường phèn, nước cốt dừa, lá dứa, mè',
    tags: ['Bán chạy'],
  },
  {
    id: 20,
    name: 'Chè Khúc Bạch',
    price: 45000,
    category: 'Tráng miệng',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBqVX3I9sCaL38TeUkjRaPKQcD9K5Hud3cIA&s',
    available: true,
    description: 'Chè Bắc trắng mịn, hạt lựu dứa thơm ngọt mát',
    detail: 'Thạch sữa trắng mịn cắt hình thoi, hạt lựu giòn sần sật, dứa tươi ngọt thơm, trân châu trắng. Nước chè trong vắt ngọt nhẹ từ đường phèn.',
    ingredients: 'Kem tươi, gelatin, hạt lựu, dứa, trân châu, đường phèn, nước lọc',
    tags: ['Bán chạy'],
  },
  {
    id: 21,
    name: 'Sữa Chua Nếp Cẩm',
    price: 40000,
    category: 'Tráng miệng',
    image: 'img/suachuanepcam.webp',
    available: true,
    description: 'Sữa chua dẻo béo, nếp cẩm tím đặc biệt',
    detail: 'Sữa chua tự làm mỗi ngày, béo mịn từ sữa tươi ủ men. Nếp cẩm hấp mềm dẻo, màu tím ngọt từ thiên nhiên. Vị chua ngọt béo bùi đặc biệt.',
    ingredients: 'Sữa tươi, men sữa chua, nếp cẩm, đường, muối',
    tags: ['Món mới'],
  },
  {
    id: 22,
    name: 'Tàu Hũ Nước Gừng',
    price: 30000,
    category: 'Tráng miệng',
    image: 'img/tauhu.jpg',
    available: true,
    description: 'Tàu hũ mềm mịn, nước gừng cay nhẹ ấm bụng',
    detail: 'Đậu phụ non tự làm từ đậu nành nguyên chất, trắng mềm tan. Nước gừng tươi, đường phèn, thêm chút cam thảo thơm. Ăn nóng lành mạnh.',
    ingredients: 'Đậu nành, bột thạch cao, gừng tươi, đường phèn, cam thảo',
    tags: [],
  },

  // ── ĐỒ UỐNG LẠNH ──────────────────────────────────────
  {
    id: 23,
    name: 'Trà Đào Cam Sả',
    price: 45000,
    category: 'Đồ uống lạnh',
    image: 'img/tra-dao-cam-sa__1__e962d6032789456081956f901689eb3e.jpg',
    available: true,
    description: 'Trà đào thơm mát, kết hợp cam sả tươi thanh',
    detail: 'Trà xanh Thái Nguyên, đào ngâm đường, cam vắt tươi và sả băm nhuyễn. Rót lên đá bào mịn, tươi mát giải nhiệt. Màu vàng hổ phách óng ánh.',
    ingredients: 'Trà xanh, đào ngâm đường, cam tươi, sả, đường, đá',
    tags: ['Bán chạy'],
  },
  {
    id: 24,
    name: 'Cà Phê Sữa Đá',
    price: 35000,
    category: 'Đồ uống lạnh',
    image: 'img/caphesua.jpg',
    available: true,
    description: 'Cà phê phin đậm đà, sữa đặc ngọt béo pha đá',
    detail: 'Cà phê robusta pha phin chậm rãi, đậm đặc. Sữa đặc ngọt béo dưới đáy ly. Đổ đá cục, khuấy tan và thưởng thức. Năng lượng cho cả ngày dài.',
    ingredients: 'Cà phê robusta, sữa đặc, đá cục',
    tags: ['Bán chạy'],
  },
  {
    id: 25,
    name: 'Nước Sấu Đường Phèn',
    price: 30000,
    category: 'Đồ uống lạnh',
    image: 'img/nuocsau.jpg',
    available: true,
    description: 'Nước sấu Hà Nội chua ngọt mát lạnh, giải nhiệt',
    detail: 'Sấu xanh ngâm đường phèn theo kiểu Hà Nội truyền thống. Vị chua nhẹ từ sấu tươi, ngọt thanh từ đường phèn. Uống mát lịm, rất Hà Nội.',
    ingredients: 'Quả sấu, đường phèn, muối, nước lọc, đá cục',
    tags: [],
  },
  {
    id: 26,
    name: 'Sinh Tố Xoài Tươi',
    price: 50000,
    category: 'Đồ uống lạnh',
    image: 'img/stxoai.jpg',
    available: true,
    description: 'Xoài cát Hòa Lộc chín ngọt, xay kem béo thơm',
    detail: 'Xoài cát Hòa Lộc chín vàng ngọt lịm, xay cùng sữa tươi, kem vanilla, đá viên. Màu vàng ươm, thơm mùi xoài nồng nàn.',
    ingredients: 'Xoài cát Hòa Lộc, sữa tươi, kem vanilla, đường, đá viên',
    tags: ['Món mới'],
  },

  // ── ĐỒ UỐNG NÓNG ──────────────────────────────────────
  {
    id: 27,
    name: 'Trà Gừng Mật Ong',
    price: 35000,
    category: 'Đồ uống nóng',
    image: 'img/gungmatong.webp',
    available: true,
    description: 'Trà gừng ấm bụng, mật ong rừng nguyên chất ngọt dịu',
    detail: 'Gừng già đập dập đun sôi 10 phút chiết hết tinh dầu. Thêm 2 thìa mật ong rừng Tây Bắc nguyên chất và lát chanh tươi. Nóng ấm, tốt cho tiêu hóa.',
    ingredients: 'Gừng tươi, mật ong rừng, chanh, nước lọc',
    tags: [],
  },
  {
    id: 28,
    name: 'Trà Sen Hà Nội',
    price: 40000,
    category: 'Đồ uống nóng',
    image: 'img/trasen.jpg',
    available: true,
    description: 'Trà sen Tây Hồ ướp bằng sen bách diệp, tinh tế',
    detail: 'Trà Thái Nguyên thượng hạng ướp cùng nhụy sen bách diệp theo phương pháp truyền thống Tây Hồ. Pha nước 85°C, hãm 3 phút. Uống không đường.',
    ingredients: 'Trà xanh Thái Nguyên, nhụy sen bách diệp, nước 85°C',
    tags: ['Ưu đãi'],
  },
  {
    id: 29,
    name: 'Cà Phê Trứng Nóng',
    price: 55000,
    category: 'Đồ uống nóng',
    image: 'img/cftrungmuoi.jpg',
    available: true,
    description: 'Đặc sản Hà Nội, lớp kem trứng béo thơm phủ cà phê đen',
    detail: 'Cà phê đen đậm đà ở dưới. Phía trên là lớp kem trứng đánh bông từ lòng đỏ trứng gà, sữa đặc, vani. Uống nóng, khuấy nhẹ hoặc để nguyên từng lớp.',
    ingredients: 'Cà phê robusta, lòng đỏ trứng gà, sữa đặc, vani, đường',
    tags: ['Bán chạy'],
  },
  {
    id: 30,
    name: 'Cacao Nóng Kem Tươi',
    price: 45000,
    category: 'Đồ uống nóng',
    image: 'img/cfkem.jpg',
    available: true,
    description: 'Cacao nguyên chất đắng ngọt, kem tươi tan chảy',
    detail: 'Cacao 100% đun sôi với sữa tươi nguyên kem. Thêm chút muối cân bằng vị đắng. Phủ kem tươi đánh bông mịn, rắc bột cacao. Ấm áp những ngày mưa.',
    ingredients: 'Bột cacao nguyên chất, sữa tươi nguyên kem, kem tươi, đường, muối',
    tags: ['Món mới'],
  },

  // ── SET / COMBO ────────────────────────────────────────
  {
    id: 31,
    name: 'Set Đôi Lãng Mạn',
    price: 160000,
    category: 'Set/Combo',
    image: 'img/setcapdoi.jpg',
    available: true,
    description: 'Set dành cho 2 người: 2 món chính + 2 đồ uống + 1 tráng miệng',
    detail: 'Set lý tưởng cho bữa ăn đôi lứa hoặc bạn bè. Tiết kiệm 20% so với order lẻ. Tự chọn món theo sở thích.',
    ingredients: '2 món chính + 2 đồ uống + 1 tráng miệng (tự chọn)',
    tags: ['Ưu đãi'],
    comboInfo: { serves: 2, savings: '20%', includes: ['2 Món chính tự chọn', '2 Đồ uống theo mùa', '1 Tráng miệng chia đôi'] },
  },
  {
    id: 32,
    name: 'Set Gia Đình Vui Vẻ',
    price: 320000,
    category: 'Set/Combo',
    image: 'img/setgiadinh.webp',
    available: true,
    description: 'Set dành cho 4-5 người: 2 khai vị + 4 món chính + 4 đồ uống',
    detail: 'Set gia đình đầy đủ cho 4-5 người. Phục vụ riêng cho từng người. Tiết kiệm 25% so với gọi lẻ.',
    ingredients: '2 Khai vị + 4 Món chính + 4 Đồ uống + 1 Bánh tráng miệng',
    tags: ['Ưu đãi', 'Bán chạy'],
    comboInfo: { serves: 5, savings: '25%', includes: ['2 Khai vị chia sẻ', '4 Món chính tự chọn', '4 Đồ uống', '1 Bánh tráng miệng'] },
  },
  {
    id: 33,
    name: 'Set Họp Lớp Hội Tụ',
    price: 240000,
    category: 'Set/Combo',
    image: 'img/sethoplop.jpg',
    available: true,
    description: 'Set 3-4 người: 2 khai vị + 3 món chính + 3 đồ uống',
    detail: 'Set dành cho nhóm bạn họp lớp, bạn thân. Thêm dịch vụ chụp ảnh kỷ niệm miễn phí tại bàn. Tiết kiệm 22%.',
    ingredients: '2 Khai vị + 3 Món chính + 3 Đồ uống',
    tags: ['Ưu đãi'],
    comboInfo: { serves: 4, savings: '22%', includes: ['2 Khai vị chia sẻ', '3 Món chính đa dạng', '3 Đồ uống tự chọn'] },
  },
  {
    id: 34,
    name: 'Set Văn Phòng Nhanh',
    price: 195000,
    category: 'Set/Combo',
    image: 'img/comvanphong.jpg',
    available: true,
    description: 'Set 3 người, phục vụ nhanh trong 20 phút cho giờ trưa',
    detail: '3 phần cơm hoặc phở tự chọn, 3 đồ uống đóng ly. Ưu tiên phục vụ trong 20 phút. Tiết kiệm 18%.',
    ingredients: '3 Món chính (Cơm/Phở) + 3 Đồ uống đóng ly',
    tags: ['Bán chạy', 'Ưu đãi'],
    comboInfo: { serves: 3, savings: '18%', includes: ['3 Món chính tự chọn', '3 Đồ uống đóng ly'] },
  },
];

// ── Private helpers ───────────────────────────────────

function _getData() {
  try {
    const raw            = localStorage.getItem(STORAGE_KEY);
    const storedVersion  = localStorage.getItem(VERSION_KEY);

    // Không có data hoặc version cũ → seed lại DEFAULT_PRODUCTS
    if (!raw || storedVersion !== String(DATA_VERSION)) {
      _seedDefaults();
      return structuredClone(DEFAULT_PRODUCTS);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) { _seedDefaults(); return structuredClone(DEFAULT_PRODUCTS); }
    return parsed.filter(p => p && Number.isFinite(Number(p.id)) && p.name != null).map(p => ({
      ...p,
      id:          Number(p.id),
      name:        String(p.name        || ''),
      price:       Math.max(0, Number(p.price)    || 0),
      category:    String(p.category    || ''),
      description: String(p.description || ''),
      image:       String(p.image       || ''),
      available:   Boolean(p.available),
      tags:        Array.isArray(p.tags) ? p.tags.map(String) : [],
    }));
  } catch {
    // JSON hỏng — khôi phục sạch
    _seedDefaults();
    return structuredClone(DEFAULT_PRODUCTS);
  }
}

function _seedDefaults() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
  localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
}

function _setData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Bàn (Tables) ──────────────────────────────────────
const TABLES_KEY = 'fm_tables';

const DEFAULT_TABLES = Array.from({ length: 10 }, (_, i) => ({
  id: `tbl-${String(i + 1).padStart(2, '0')}`,
  name: `Bàn ${String(i + 1).padStart(2, '0')}`,
  status: 'empty',   // 'empty' | 'reserved' | 'serving'
  visible: true,
}));

function _getTables() {
  try {
    const raw = localStorage.getItem(TABLES_KEY);
    if (!raw) { _seedTables(); return structuredClone(DEFAULT_TABLES); }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) { _seedTables(); return structuredClone(DEFAULT_TABLES); }
    return parsed.filter(t => t && t.id != null && t.name != null).map(t => ({
      ...t,
      id:      String(t.id),
      name:    String(t.name   || ''),
      status:  t.status === 'serving' ? 'serving' : t.status === 'reserved' ? 'reserved' : 'empty',
      visible: Boolean(t.visible),
    }));
  } catch {
    _seedTables();
    return structuredClone(DEFAULT_TABLES);
  }
}

function _seedTables() {
  localStorage.setItem(TABLES_KEY, JSON.stringify(DEFAULT_TABLES));
}

function _setTables(data) {
  localStorage.setItem(TABLES_KEY, JSON.stringify(data));
}

// ── Đặt bàn (Reservations) ────────────────────────────
const RESERVATIONS_KEY = 'fm_reservations';

function _getReservations() {
  try {
    const raw = localStorage.getItem(RESERVATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function _setReservations(data) {
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(data));
}

// ── Lịch sử đơn hàng (Order History) ─────────────────
const ORDER_HISTORY_KEY = 'fm_order_history';

function _getHistory() {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function _setHistory(data) {
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(data));
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
            (p.description || '').toLowerCase().includes(q)
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
   * @returns {Promise<Object>}
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
            tags: Array.isArray(data.tags) ? data.tags : [],
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
   * @returns {Promise<Object>}
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
          tags: Array.isArray(data.tags) ? data.tags : (products[idx].tags || []),
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

  /** Reset về dữ liệu mặc định */
  resetData() {
    _seedDefaults();
    return Promise.resolve(structuredClone(DEFAULT_PRODUCTS));
  },

  /** Trả về version hiện tại (để admin hiển thị) */
  getDataVersion() {
    return DATA_VERSION;
  },

  // ── Tables API ─────────────────────────────────────────

  getTables() {
    return new Promise(resolve => setTimeout(() => resolve(_getTables()), 50));
  },

  getVisibleTables() {
    return new Promise(resolve =>
      setTimeout(() => resolve(_getTables().filter(t => t.visible)), 50)
    );
  },

  addTable(name) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const tables = _getTables();
          const newTable = { id: `tbl-${Date.now()}`, name: String(name).trim(), status: 'empty', visible: true };
          _setTables([...tables, newTable]);
          resolve(newTable);
        } catch { reject(new Error('Lỗi khi thêm bàn')); }
      }, 100);
    });
  },

  updateTable(id, data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const tables = _getTables();
          const idx = tables.findIndex(t => t.id === id);
          if (idx === -1) { reject(new Error('Không tìm thấy bàn')); return; }
          tables[idx] = { ...tables[idx], ...data, id };
          _setTables(tables);
          resolve(tables[idx]);
        } catch (e) { reject(e); }
      }, 100);
    });
  },

  deleteTable(id) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const tables = _getTables();
          const table = tables.find(t => t.id === id);
          if (!table) { reject(new Error('Không tìm thấy bàn')); return; }
          if (table.status === 'reserved' || table.status === 'serving') {
            reject(new Error('Không thể xóa bàn đang đặt hoặc đang phục vụ.'));
            return;
          }
          const filtered = tables.filter(t => t.id !== id);
          _setTables(filtered);
          try {
            const saved = JSON.parse(localStorage.getItem('fm_selected_table') || 'null');
            if (saved?.id === id) localStorage.removeItem('fm_selected_table');
          } catch {
            localStorage.removeItem('fm_selected_table');
          }
          resolve({ success: true, id });
        } catch (e) { reject(e); }
      }, 100);
    });
  },

  resetTables() {
    try {
      _seedTables();
      return Promise.resolve(structuredClone(DEFAULT_TABLES));
    } catch (e) {
      return Promise.reject(e);
    }
  },

  // ── Order History API ──────────────────────────────────

  addOrder(orderData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const history = _getHistory();
          const order = { ...orderData, id: `ord-${Date.now()}`, time: new Date().toISOString(), status: 'pending' };
          _setHistory([order, ...history]);
          resolve(order);
        } catch (e) { reject(e); }
      }, 100);
    });
  },

  getOrders(tableId = null, customerEmail = null) {
    return new Promise(resolve => {
      setTimeout(() => {
        let orders = _getHistory();
        if (tableId)      orders = orders.filter(o => o.tableId === tableId);
        if (customerEmail) orders = orders.filter(o => o.customerEmail === customerEmail);
        resolve(orders);
      }, 50);
    });
  },

  // ── Reservations API ──────────────────────────────

  getReservations(date = null) {
    return new Promise(resolve => {
      setTimeout(() => {
        let list = _getReservations().filter(r => r && r.id);
        if (date) list = list.filter(r => r.date === date);
        const statusOrder = { pending: 0, reserved: 1, seated: 2, completed: 3, cancelled: 4 };
        list.sort((a, b) => {
          const d = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
          return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
        });
        resolve(list);
      }, 50);
    });
  },

  updateReservation(id, data) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const list = _getReservations();
          const idx = list.findIndex(r => r.id === id);
          if (idx === -1) { reject(new Error('Không tìm thấy đặt bàn')); return; }
          list[idx] = { ...list[idx], ...data };
          _setReservations(list);
          resolve(list[idx]);
        } catch (e) { reject(e); }
      }, 80);
    });
  },

  updateOrderStatus(orderId, status) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const history = _getHistory();
          const idx = history.findIndex(o => o.id === orderId);
          if (idx === -1) { reject(new Error('Không tìm thấy đơn')); return; }
          history[idx] = { ...history[idx], status };
          _setHistory(history);
          resolve(history[idx]);
        } catch (e) { reject(e); }
      }, 100);
    });
  },
};
