# Xử lý sự cố

Sửa nhanh theo mẫu triệu chứng → cách sửa để giảm thời gian gián đoạn khi đang chạy session. Nếu lỗi không nằm trong danh sách này, kiểm tra `npm run build` và log server trước khi debug sâu.

## `tmux` không có

**Triệu chứng:** Tạo session thất bại hoặc log server báo không tìm thấy `tmux`.

**Cách sửa:** Cài `tmux` trên host rồi chạy lại server.

## Port đã bị dùng

**Triệu chứng:** `npm run dev` hoặc `npm start` báo `EADDRINUSE`.

**Cách sửa:** Giải phóng port đang chiếm hoặc đổi `PORT` trước khi chạy lại.

## WebSocket không kết nối

**Triệu chứng:** Chat không nhận update, trạng thái session liên tục reconnect.

**Cách sửa:** Kiểm tra server đang chạy ở `:3500`, kiểm tra bearer key cho remote, rồi reconnect session.

## Notification không hoạt động

**Triệu chứng:** Không có thông báo khi tab unfocused.

**Cách sửa:** Bật lại tại `Settings > Appearance > Notifications`, cấp quyền browser, và với iPhone/iPad Safari phải Add to Home Screen trước.

## Remote access lỗi 401

**Triệu chứng:** Truy cập qua tunnel bị từ chối với 401.

**Cách sửa:** Lưu lại bearer key mới trong `Settings > Remote Access > Device Auth` trên thiết bị remote rồi mở lại session.
