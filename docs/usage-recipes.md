# Các kịch bản sử dụng Codeject

Tài liệu này tổng hợp một số cách dùng Codeject trong thực tế. Mỗi kịch bản gồm vài bước ngắn gọn, tập trung vào thao tác hơn là chi tiết kỹ thuật.

## 1. Điều khiển Claude Code trên máy local từ điện thoại

1. Đảm bảo bạn đã:
   - Cài `tmux` trên máy chạy Claude Code.
   - Chạy Codeject theo hướng dẫn trong `docs/getting-started.md`.
2. Tạo một session mới trong Codeject:
   - Chọn chương trình CLI tương ứng với Claude Code.
   - Lưu session.
3. Gửi prompt cho Claude Code:
   - Sử dụng **chat surface** để gửi và xem trả lời.
4. Khi Claude yêu cầu thao tác phím hoặc approval:
   - Chuyển sang **terminal surface**.
   - Nhập lệnh hoặc phím tắt cần thiết.

## 2. Quản lý nhiều session CLI song song

1. Tạo session riêng cho từng công cụ:
   - Ví dụ: một session cho Claude Code, một session cho Codex, một session cho shell.
2. Sử dụng màn hình **danh sách session** để:
   - Xem trạng thái từng session.
   - Nhanh chóng vào lại session đang quan trọng.
3. Trong mỗi session:
   - Dùng chat cho luồng tương tác chính.
   - Quay về terminal khi cần xử lý sâu.

## 3. Bật remote access qua Cloudflare Tunnel

1. Đảm bảo host đã cài `cloudflared`.
2. Trong Codeject, mở phần điều khiển remote access:
   - Chọn `Quick` nếu chỉ cần URL tạm.
   - Hoặc chọn `Named`, nhập hostname + token nếu muốn dùng domain riêng.
   - Start Cloudflare Tunnel.
   - Lấy public URL và/hoặc quét QR code.
3. Trên điện thoại:
   - Mở trình duyệt tới public URL.
   - Đăng nhập bằng bearer key nếu được yêu cầu.
4. Sử dụng giao diện như trên desktop:
   - Xem danh sách session.
   - Vào từng session để điều khiển.

Lưu ý bảo mật:

- Chỉ chia sẻ URL cho những người được phép truy cập.
- Bearer key không nằm trong QR; mỗi thiết bị cần được cấu hình key riêng.

## 4. Khôi phục lại session đang chạy

1. Mở Codeject trên trình duyệt.
2. Vào màn hình danh sách session:
   - Tìm session bạn đã tạo trước đó (Codeject lưu xuống `~/.codeject/sessions`).
3. Mở lại session:
   - Chat và terminal sẽ gắn lại vào runtime `tmux` tương ứng.

## 5. Dừng và dọn dẹp

1. Khi không cần dùng nữa:
   - Dừng các session không còn cần thiết trong UI.
   - Dừng Cloudflare Tunnel nếu đang bật.
2. Nếu muốn xóa toàn bộ dữ liệu:
   - Xóa thư mục `~/.codeject` (hoặc thư mục được trỏ bởi `CODEJECT_HOME`).
   - Lưu ý: thao tác này sẽ xóa toàn bộ config và session đã lưu.
