# Tổng quan sản phẩm

## Sản phẩm là gì

Codeject là một ứng dụng web mobile-first để điều khiển các CLI coding assistant đang chạy trên máy tính cá nhân. Người dùng có thể tạo session, gán session với chương trình CLI, xem transcript dạng chat và chuyển sang terminal khi cần thao tác trực tiếp.

## Vấn đề giải quyết

CLI coding assistant rất mạnh nhưng khó theo dõi trên điện thoại. Codeject đặt một lớp giao diện gọn nhẹ lên trên backend local để người dùng:

- xem session đang chạy từ điện thoại
- gửi prompt nhanh bằng chat surface
- quay lại terminal để xử lý approval, menu, hay TUI phức tạp
- mở remote access mà không phải mở nhiều cổng

## Người dùng mục tiêu

- lập trình viên cá nhân dùng Claude Code, Codex, hoặc CLI tương tự
- người đang giám sát một session dài và không muốn ngồi trước máy liên tục
- người muốn một giao diện chung cho nhiều công cụ CLI

## Giá trị chính

- một backend duy nhất
- một UI tối ưu cho màn hình điện thoại
- session bền vững qua reload và reconnect
- terminal runtime được giữ sống bằng `tmux`
- remote access có sẵn nếu host có `cloudflared`

## Yêu cầu chức năng

- tạo, sửa, xóa session
- quản lý danh sách chương trình CLI
- stream nội dung session qua WebSocket
- đổi qua lại giữa chat và terminal
- lưu trạng thái xuống đĩa
- xác thực bearer cho truy cập không local

## Yêu cầu kỹ thuật

- frontend static được Express phục vụ
- backend REST + WebSocket trong cùng một process Node.js
- runtime terminal dựa trên `tmux`
- shared types dùng chung giữa frontend và backend
- dữ liệu local nằm trong `~/.codeject`

## Trạng thái hiện tại

Ứng dụng đã sẵn sàng để sử dụng.

Đã hoàn thành:

- monorepo và workspace
- backend route, auth, persistence, WebSocket
- `tmux` terminal bridge và reconnect-safe runtime ownership
- hybrid chat-terminal UX
- transcript parser cho Claude và Codex
- tunnel lifecycle và remote access controls

## Phi mục tiêu hiện tại

- mô hình multi-user
- SaaS cloud-hosted
- SSR phức tạp
- thay terminal bằng một chat model "chuẩn" hoàn toàn
