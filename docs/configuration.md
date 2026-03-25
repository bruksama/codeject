# Cấu hình

Cấu hình đúng giúp bạn giữ trải nghiệm ổn định giữa local và remote mà không phải sửa code. Tách riêng phần này giúp tài liệu triển khai và xử lý sự cố không bị lặp nội dung.

## Biến môi trường


| Biến                         | Mặc định                  | Mô tả                                                                 |
| ---------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `PORT`                       | `3500`                    | Port server Express                                                   |
| `HOST`                       | `0.0.0.0`                 | Host bind của server                                                  |
| `CODEJECT_HOME`              | `~/.codeject`             | Thư mục lưu config/session                                            |
| `CODEJECT_TUNNEL_AUTOSTART`  | `0`                       | Bật mặc định auto-start cho named tunnel khi config local chưa ghi đè |
| `CODEJECT_TUNNEL_BINARY`     | `cloudflared`             | Binary tunnel                                                         |
| `CODEJECT_TUNNEL_TARGET_URL` | `http://127.0.0.1:<PORT>` | URL nội bộ mà tunnel forward tới                                      |
| `NODE_ENV`                   | `development`             | Bật/tắt các nhánh behavior theo môi trường                            |


## Cài đặt giao diện

### Font Size

Đổi trong `Settings > Appearance > Font Size`. Giá trị được lưu theo từng browser và áp dụng toàn app ngay lập tức.

### Accent Color

Đổi trong `Settings > Appearance > Accent Color`. Màu nhấn chỉ ảnh hưởng browser hiện tại.

### Notifications

Bật trong `Settings > Appearance > Notifications`.

> **Note:** Nếu permission bị revoke ngoài app, trạng thái bật cũ sẽ tự clear khi app focus lại.

## CLI Programs

1. Mở màn hình quản lý CLI programs.
2. Thêm hoặc sửa command theo tool bạn dùng.
3. Lưu cấu hình rồi tạo session mới với program đó.

## Remote access settings

- `Quick`: URL tạm, start thủ công.
- `Named`: hostname cố định + token, hỗ trợ `Auto-start`.
- `Device Auth`: lưu bearer key theo từng thiết bị remote.

> **Warning:** `Reset Local Settings` trên một thiết bị sẽ xóa luôn bearer key đã lưu ở thiết bị đó.

