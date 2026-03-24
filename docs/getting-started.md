# Bắt đầu với Codeject

## Tài liệu này dành cho ai

- **Lập trình viên** đang dùng các CLI coding assistant (Claude Code, Codex, shell, …).
- Muốn **xem và điều khiển** các session đó từ trình duyệt, ưu tiên trên **điện thoại**.

Nếu bạn mới clone repository và muốn chạy Codeject lần đầu, hãy đọc từ đầu đến cuối tài liệu này.

## Yêu cầu hệ thống

- **Node.js + npm** tương thích với `packageManager` trong `package.json`.
- **tmux** đã cài trên máy host (bắt buộc để chạy terminal runtime).
- **cloudflared** (tùy chọn) nếu bạn muốn bật remote access qua Cloudflare Tunnel.

## Cài đặt

1. Clone repository:
   - `git clone <repo-url>`
   - `cd codeject`
2. Cài đặt dependencies:
   - `npm install`

## Chạy Codeject lần đầu

### Chạy ở chế độ phát triển

1. Chạy lệnh:
   - `npm run dev`
2. Mở trình duyệt tại:
   - `http://localhost:4028`
3. Backend local vẫn chạy riêng tại:
   - `http://localhost:3500`

Trong chế độ này, frontend Next.js và backend Express/WebSocket chạy song song. UI dev dùng port `4028`, còn API/WebSocket dùng port `3500`.

### Chạy ở chế độ production local

1. Build toàn bộ workspace:
   - `npm run build`
2. Khởi động server:
   - `npm start`
3. Mở trình duyệt tại:
   - `http://localhost:3500`
4. Mặc định server lắng nghe ở:
   - `PORT` (nếu đặt) hoặc `3500`

## Tạo và dùng session đầu tiên

1. Mở UI tại `http://localhost:4028` nếu đang chạy dev, hoặc `http://localhost:3500` nếu đang chạy bản build.
2. Tạo một **session mới**:
   - Chọn chương trình CLI (Claude Code, Codex, hoặc shell).
   - Lưu session để có thể khôi phục sau này.
3. Mở session vừa tạo:
   - Gửi prompt qua **chat surface**.
   - Khi CLI chờ approval, chọn option, hoặc nhập liệu, trả lời ngay trong **action card** của chat.

## Tùy biến giao diện

Trong màn hình `Settings`, phần `Appearance` hiện cho phép:

- đổi `Font Size` giữa các mức nhỏ, vừa, lớn
- đổi `Accent Color`
- bật `Notifications` theo kiểu opt-in cho browser hiện tại

`Font Size` áp dụng ngay khi bạn đổi và affect toàn bộ typography của app, gồm cả khoảng trống chat transcript/composer để bề mặt đọc theo đúng scale đã chọn.

Các tùy chọn này được lưu cục bộ trong trình duyệt hiện tại qua browser storage, nên mỗi trình duyệt hoặc thiết bị có thể giữ mức chữ, màu nhấn, và notification preference riêng.

Với `Notifications`:

- mặc định là **tắt**
- chỉ xin permission khi bạn chủ động bật
- nếu browser không support hoặc user bấm deny, toggle sẽ tự quay về off
- nếu bạn revoke permission ngoài app, Codeject sẽ tự clear trạng thái enabled cũ khi app focus/visible lại
- trên iPhone/iPad Safari, browser notification chỉ hoạt động sau khi thêm app vào Home Screen

Nếu cần đưa giao diện local về mặc định, vào `Settings` và dùng `Reset Local Settings`.

## Remote access (tùy chọn)

Nếu host đã cài `cloudflared`, bạn có thể bật remote access để truy cập Codeject từ điện thoại:

- UI cung cấp điều khiển để:
  - Chọn `Quick` hoặc `Named`.
  - Bật / tắt / restart Cloudflare Tunnel.
  - Xem public URL và QR code.
  - Với `Named`, lưu hostname + token và tùy chọn bật `Auto-start` để server tự start tunnel sau mỗi lần boot.
  - Với thiết bị remote, lưu bearer key vào `Device Auth` để browser đó tự gửi auth cho REST/WebSocket.
- `Quick` phù hợp khi cần chạy nhanh, không cần domain riêng.
- `Named` phù hợp khi bạn đã có tunnel token và hostname trên Cloudflare.
- Lưu ý:
  - Request **không local** bắt buộc phải gửi `Authorization: Bearer <key>`.
  - QR chỉ chứa public URL, **không chứa secret**.
  - `Auto-start` chỉ áp dụng cho `Named`; quick tunnel vẫn phải start thủ công.
  - Notification over tunnel vẫn phụ thuộc browser support; trên iPhone/iPad Safari vẫn cần Add to Home Screen trước.

Chi tiết thêm xem trong `docs/deployment-guide.md` và `docs/usage-recipes.md`.

## Lỗi thường gặp

- **Không có `tmux`**:
  - Triệu chứng: server log báo lỗi liên quan tới `tmux`, session không tạo được.
  - Cách xử lý: cài `tmux` trên host rồi chạy lại.
- **Port 3500 hoặc 4028 đã dùng**:
  - Triệu chứng: `npm run dev` không khởi động đủ cả web và server, hoặc server báo lỗi port in use.
  - Cách xử lý: đổi `PORT` cho backend nếu `3500` bị chiếm; nếu `4028` bị chiếm thì cập nhật script dev của web hoặc giải phóng port đó trước khi chạy lại.
- **Cloudflared chưa cài**:
  - Triệu chứng: chức năng tunnel báo lỗi khi start.
  - Cách xử lý: cài `cloudflared` hoặc tắt remote access.
