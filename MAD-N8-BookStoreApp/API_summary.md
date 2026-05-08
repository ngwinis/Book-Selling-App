# Tổng hợp API Backend — BookStoreApp

> Tài liệu này được rút gọn từ `API_instructions.md`. Tổng cộng **38 API** chia thành **6 nhóm chức năng**.
> Base URL mặc định: `http://localhost:3000/api`

---

## I. Xác thực (AUTH) — 5 API

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 1 | Đăng ký | POST | `/auth/register` | `{ email, password, confirmPassword }` | 201 — Tạo tài khoản, gửi OTP qua email |
| 2 | Đăng nhập | POST | `/auth/login` | `{ email, password }` | `{ token, user }` — Lưu token để dùng cho mọi request sau |
| 3 | Quên mật khẩu | POST | `/auth/forgot-password` | `{ email }` | 200 — Gửi OTP đến email |
| 4 | Xác minh OTP | POST | `/auth/verify-otp` | `{ email, otpCode }` | `{ resetToken }` — Token tạm (15 phút) dùng để đặt lại mật khẩu |
| 5 | Đổi mật khẩu | POST | `/auth/change-password` | **Trường hợp 1** (đổi thường): Header Bearer Token + `{ oldPassword, newPassword, confirmPassword }`. **Trường hợp 2** (quên MK): `{ newPassword, confirmPassword, resetToken }` | 200 — Mật khẩu đã cập nhật |

### Luồng hoạt động:
- **Đăng ký**: Gọi API 1 → Hệ thống gửi OTP → Người dùng xác minh (API 4) → Hoàn tất.
- **Quên MK**: Gọi API 3 → Nhập OTP (API 4) → Nhận `resetToken` → Đặt MK mới (API 5 kèm resetToken).
- **Đổi MK nội bộ**: Đăng nhập rồi → Gọi API 5 kèm Bearer Token + mật khẩu cũ.

---

## II. Sách & Danh mục (BOOK + REVIEW) — 11 API

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 6 | Tất cả danh mục | GET | `/books/categories` | — | Mảng danh mục `[{ categoryID, categoryName }]` |
| 7 | Danh sách sách (phân trang + lọc) | GET | `/books` | Query: `page`, `limit` (mặc định 20), `categoryId` (tùy chọn) | `{ data: [...], pagination: {...} }` |
| 8 | Sách "Dành riêng cho bạn" | GET | `/books/for-you` | — | Mảng 20 sách (ngẫu nhiên / mới nhất) |
| 9 | Chi tiết 1 cuốn sách | GET | `/books/:id` | Nên kèm Bearer Token để ghi lịch sử xem | `{ book, avgRating, top3Reviews, similarBooks }` |
| 10 | Tìm kiếm bằng text | GET | `/books/search` | Query: `q` (chuỗi tìm), `page` | Giống API 7, lọc theo tên sách |
| 11 | Thông tin tác giả | GET | `/books/author/:id` | — | `{ authorName, biography }` |
| 12 | Sách của tác giả | GET | `/books/author/:id/books` | — | Mảng sách của tác giả |
| 13 | Sách của nhà xuất bản | GET | `/books/publisher/:id/books` | — | Mảng sách của NXB |
| 14 | Tất cả đánh giá của 1 sách | GET | `/review/book/:bookId` | — | Mảng review `[{ rating, comment, customerName }]` |
| 15 | Gửi đánh giá | POST | `/review` | Header Bearer Token + `{ bookId, rating, comment }` | 201 — Đánh giá đã được lưu |
| 16 | AI: Giọng nói / Hình ảnh / Chatbot | POST | `/ai/...` | `multipart/form-data` (file audio hoặc ảnh) | Kết quả nhận dạng hoặc trả lời chatbot |

### Ghi chú quan trọng:
- **API 9** (Chi tiết sách): Trả về 4 khối dữ liệu cùng lúc — thông tin sách, điểm trung bình, 3 review mới nhất, và tối đa 12 sách tương tự. Nếu gửi kèm Token thì Backend tự ghi vào bảng `ViewHistory`.
- **API 10**: Nên dùng kỹ thuật **debounce** (~400ms) trước khi gọi để tránh gửi request liên tục khi người dùng đang gõ.

---

## III. Giỏ hàng (CART) — 4 API

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 17 | Xem giỏ hàng | GET | `/cart` | Query: `customerId` | `{ cartID, items: [...], totalAmount }` — Mỗi item kèm tên sách, giá, URL ảnh |
| 18 | Thêm sách vào giỏ | POST | `/cart/add` | `{ customerId, bookId, quantity }` | 200 — Nếu sách đã có trong giỏ thì tự cộng dồn số lượng |
| 19 | Cập nhật số lượng | PUT | `/cart/item/:cartItemId` | `{ quantity }` — Gửi `quantity: 0` thì Backend tự xóa | 200 — Số lượng đã cập nhật |
| 20 | Xóa 1 ô sản phẩm | DELETE | `/cart/item/:cartItemId` | — | 200 — Sản phẩm đã bị xóa khỏi giỏ |

### Ghi chú:
- `:cartItemId` là ID của **dòng trong bảng CartItem**, không phải ID cuốn sách.
- Nên dùng **debounce** (~1 giây) cho nút tăng/giảm số lượng trước khi gọi API 19 để tránh spam request.

---

## IV. Hồ sơ cá nhân (PROFILE) — 10 API

### Thông tin cá nhân

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 21 | Xem thông tin | GET | `/profile` | Query: `customerId` | `{ fullName, email, phoneNumber }` |
| 22 | Cập nhật thông tin | PUT | `/profile` | `{ customerId, fullName, phoneNumber }` | 200 — Đã cập nhật |

### Địa chỉ giao hàng

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 23 | Xem tất cả địa chỉ | GET | `/profile/address` | Query: `customerId` | Mảng địa chỉ |
| 24 | Thêm địa chỉ | POST | `/profile/address` | `{ customerId, receiverName, addressString }` | 201 — Đã tạo |
| 25 | Sửa địa chỉ | PUT | `/profile/address/:addressId` | `{ receiverName, addressString }` | 200 — Đã sửa |
| 26 | Xóa địa chỉ | DELETE | `/profile/address/:addressId` | — | 200 — Đã xóa |

### Phương thức thanh toán

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 27 | Xem tất cả PT thanh toán | GET | `/profile/payment` | Query: `customerId` | Mảng phương thức |
| 28 | Thêm PT thanh toán | POST | `/profile/payment` | `{ customerId, paymentMethod }` (VD: `"Visa - 1234"`) | 201 — Đã tạo |
| 29 | Sửa PT thanh toán | PUT | `/profile/payment/:paymentId` | `{ paymentMethod, status }` | 200 — Đã sửa |
| 30 | Xóa PT thanh toán | DELETE | `/profile/payment/:paymentId` | — | 200 — Đã xóa |

---

## V. Dữ liệu Thanh toán (CHECKOUT DATA) — 3 API

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 31 | Danh sách voucher khả dụng | GET | `/checkout-data/vouchers` | — | Mảng voucher (chỉ trả ra voucher còn hạn và còn lượt sử dụng) |
| 32 | Danh sách đơn vị vận chuyển | GET | `/checkout-data/shipments` | — | `[{ shipmentMethod, estimatedDate, status }]` |
| 33 | Kiểm tra tính hợp lệ voucher | POST | `/checkout-data/vouchers/validate` | `{ voucherCode, totalAmount }` | Hợp lệ: `{ isValid: true, finalAmount }`. Không hợp lệ (đơn chưa đủ minOrder): `400 { isValid: false }` |

### Cách tính tiền voucher:
- Voucher kiểu **Percent** (%) → `finalAmount = totalAmount - (totalAmount × discountValue / 100)`
- Voucher kiểu **Fixed** (cứng) → `finalAmount = totalAmount - discountValue`
- Nếu `totalAmount < minOrderValue` của voucher → Từ chối (400).

---

## VI. Đơn hàng (ORDER) — 5 API

| # | Chức năng | Method | Endpoint | Body / Query | Response chính |
|---|-----------|--------|----------|--------------|----------------|
| 34 | Tạo đơn từ giỏ hàng | POST | `/order/checkout` | `{ customerId, addressId, paymentId, shipmentId, voucherId }` (`voucherId` có thể `null`) | `{ orderId }` — Giỏ hàng bị xóa trắng, voucher trừ 1 lượt |
| 35 | Mua ngay (không qua giỏ) | POST | `/order/buy-now` | Giống API 34 + thêm `{ bookId, quantity }` | `{ orderId }` — Tạo đơn riêng, giỏ hàng không bị ảnh hưởng |
| 36 | Lịch sử đơn hàng | GET | `/order` | Query: `customerId`, `status` (tùy chọn: `"Chờ thanh toán"`, `"Đang xử lý"`, `"Đang giao"`, `"Hoàn tất"`, `"Đã hủy"`) | Mảng đơn hàng kèm thông tin sách, ảnh |
| 37 | Chi tiết 1 đơn hàng | GET | `/order/:orderId` | — | Toàn bộ thông tin: sách, địa chỉ, vận chuyển, voucher, tổng tiền |
| 38 | Hủy đơn hàng | PUT | `/order/:orderId/cancel` | — | 200 — Chỉ hủy được khi trạng thái là `"Chờ thanh toán"` hoặc `"Đang xử lý"`. Voucher (nếu có) được hoàn lại 1 lượt |

---

## Quy tắc chung khi gọi API

### Xác thực (Authentication)
- Sau khi đăng nhập (API 2), lưu `token` vào bộ nhớ cục bộ.
- Mọi request sau đó phải kèm header: `Authorization: Bearer <token>`.
- Nếu nhận mã lỗi **401**, xóa token và điều hướng về màn hình Đăng nhập.

### Xử lý lỗi
- Mã **400**: Request không hợp lệ (thiếu trường, sai dữ liệu) → Hiển thị `error.message` cho người dùng qua Toast/Snackbar.
- Mã **401**: Token hết hạn hoặc không có → Đăng xuất.
- Mã **500**: Lỗi server → Hiển thị thông báo lỗi chung.

### Ánh xạ API → Màn hình ứng dụng

| Màn hình | API sử dụng |
|----------|-------------|
| Đăng nhập | 2 |
| Đăng ký | 1, 4 |
| Quên mật khẩu | 3, 4, 5 |
| Trang chủ | 6 (danh mục) + 8 (gợi ý) |
| Danh sách sách theo danh mục | 7 |
| Chi tiết sách | 9 |
| Tất cả đánh giá | 14 |
| Tìm kiếm | 10, 16 |
| Giỏ hàng | 17, 18, 19, 20 |
| Thanh toán (Checkout) | 23, 27, 31, 32, 33, 34 |
| Mua ngay | 35 |
| Lịch sử đơn hàng | 36 |
| Chi tiết đơn hàng | 37, 38 |
| Cập nhật thông tin | 21, 22 |
| Quản lý địa chỉ | 23, 24, 25, 26 |
| Phương thức thanh toán | 27, 28, 29, 30 |
| Đổi mật khẩu | 5 |
| Chatbot | 16 |
