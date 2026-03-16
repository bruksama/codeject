# Tiêu chuẩn code

## Nguyên tắc chung

- ưu tiên thay đổi nhỏ, trực tiếp, dễ đọc
- tránh thêm abstraction sớm khi chưa cần
- tái sử dụng `@codeject/shared` thay vì định nghĩa lại type
- direct dependency phải exact-pinned
- không chạy `npm install` nếu file dependency không đổi
- giữ `package-lock.json` là nguồn sự thật

## Tổ chức mã nguồn

- `packages/web/src`: frontend
- `packages/server/src`: backend
- `packages/shared/src`: shared types
- `docs/`: tài liệu chính thức

## Frontend

- giữ hướng mobile-first và visual language hiện có
- tôn trọng App Router conventions
- giữ khả năng static export
- không đưa thêm component library xung đột với UI hiện tại
- nếu một file giao diện tiếp tục phình to, tách nhỏ theo component hoặc hook

## Backend

- tách rõ config, middleware, route, service, websocket
- route handler phải mỏng
- persistence logic nằm trong service
- runtime state và transcript sync phải có fallback an toàn
- terminal vẫn là recovery path cuối cùng

## Kiểm tra sau thay đổi

Toàn repo:

- `npm run lint`
- `npm run type-check`
- `npm run build`

Khi chỉ sửa web:

- `npm run lint -w @codeject/web`
- `npm run type-check -w @codeject/web`
- `npm run build -w @codeject/web`

Khi chỉ sửa server:

- `npm run type-check -w @codeject/server`
- `npm run build -w @codeject/server`

## Tiêu chuẩn tài liệu

- tài liệu phải phản ánh hệ thống đang chạy, không phải kế hoạch cũ
- ưu tiên câu ngắn, dễ quét, dễ đọc
- khi kiến trúc hoặc trạng thái thay đổi, cập nhật `README.md` và `docs/`
