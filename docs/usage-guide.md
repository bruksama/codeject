# Hướng dẫn sử dụng

Codeject ưu tiên thao tác nhanh trên điện thoại: đọc transcript, trả lời action card, và chỉ chuyển qua Terminal tab khi thật sự cần. Đi theo các recipe dưới đây để giữ luồng làm việc gọn.

## Tạo và dùng session

1. Mở Codeject và vào màn hình tạo session.
2. Chọn CLI program (`Claude Code`, `OpenAI Codex`, hoặc chương trình tùy chỉnh).
3. Đặt tên dễ nhận biết rồi lưu session.
4. Mở session vừa tạo trong màn hình chat.
5. Gửi prompt đầu tiên để kiểm tra runtime đã sẵn sàng.

> **Note:** Session được lưu ở host và có thể mở lại sau khi reload trang.

## Gửi prompt và xử lý action card

1. Nhập prompt trong composer và gửi.
2. Khi CLI yêu cầu xác nhận/chọn mục/nhập text, action card sẽ hiện trong transcript.
3. Trả lời trực tiếp trong card thay vì rời khỏi chat.
4. Nếu submit lỗi, kiểm tra trạng thái kết nối rồi gửi lại.
5. Theo dõi phản hồi final answer trong cùng transcript.

> **Warning:** Nếu UI báo cần terminal interaction, action card không đủ để hoàn tất thao tác hiện tại.

## Quản lý nhiều session

1. Tạo session riêng theo mục đích (ví dụ: refactor, debug, docs).
2. Dùng danh sách session để chuyển nhanh giữa các phiên.
3. Ưu tiên đặt tên ngắn, rõ nhiệm vụ để scan nhanh trên mobile.
4. Đóng hoặc xóa session không còn dùng để giảm nhiễu.

## Theo dõi nền bằng notification

1. Vào `Settings > Appearance > Notifications`.
2. Bật thông báo cho browser hiện tại khi được hỏi quyền.
3. Rời tab, Codeject sẽ báo khi cần approval, có reply, lỗi runtime, hoặc session về `idle`.
4. Nhấn notification để quay lại đúng session.

Chi tiết cấu hình xem [`docs/configuration.md`](./configuration.md).

## Truy cập remote từ điện thoại

1. Bật tunnel trong `Settings > Remote Access` (quick hoặc named).
2. Mở public URL trên thiết bị remote.
3. Lưu bearer key tại `Device Auth` trên thiết bị đó.
4. Dùng giao diện như local: xem session, chat, trả lời action card.

Chi tiết setup xem [`docs/deployment.md`](./deployment.md).

## Dừng runtime an toàn từ terminal

Khi chạy root `npm run dev`, `Ctrl+C` là luồng dừng chính thức và sẽ trigger cleanup cho web + server.

Nếu runtime script không dừng sạch, hoặc cần cleanup từ terminal khác, chạy:

```bash
npm run safe-stop
```

`safe-stop` sẽ:
- target các npm runtime process group trong phạm vi repository này,
- dùng signal escalation (`SIGINT` → `SIGTERM` → `SIGKILL`),
- kill các tmux session `codeject-*`,
- verify port `3500` và `4028` đã được giải phóng cho repo này.

## Dùng Terminal tab

1. Chuyển sang tab `Terminal` khi chat báo cần thao tác trực tiếp.
2. Đọc snapshot tmux dạng read-only để nắm ngữ cảnh.
3. Dùng input bar hoặc virtual keyboard để gửi Enter/Tab/Esc/arrows/Ctrl combos.
4. Quay lại tab `Chat` khi action đã hoàn tất.

Giới hạn hiện tại: Terminal tab chưa là terminal emulator đầy đủ, nên một số TUI toàn màn hình vẫn cần thao tác thủ công ở host.
