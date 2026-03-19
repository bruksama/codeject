# Hướng dẫn chạy và triển khai

Tài liệu này dành cho người muốn **chạy Codeject ổn định** trên máy cá nhân hoặc môi trường production đơn giản. Nếu bạn chỉ cần chạy thử lần đầu, xem `docs/getting-started.md` là đủ.

## Phát triển local

Yêu cầu:

- Node.js và npm tương thích với `packageManager`.
- `tmux`.
- `cloudflared` nếu muốn thử remote access.

Lệnh cơ bản:

- `npm run dev`
- `npm run lint`
- `npm run type-check`
- `npm run build`

Khi chạy `npm run dev` từ root:

- Web UI chạy trên `http://localhost:4028`
- REST API và WebSocket server chạy trên `http://localhost:3500`

## Chạy production local

Build:

- `npm run build`

Run:

- `npm start`

Mở ứng dụng tại `http://localhost:3500`. Server lắng nghe ở `PORT` hoặc `3500`.

## Biến môi trường

Repository hiện không ship `.env.example`. Server dùng `dotenv`, nên bạn có thể tạo file `.env` cục bộ hoặc export biến trực tiếp trong shell / service manager.

Các biến runtime đang được code đọc trực tiếp:

- `PORT`: đổi port server Express, mặc định `3500`
- `HOST`: host bind của server, mặc định `0.0.0.0`
- `CODEJECT_HOME`: đổi vị trí mặc định của `~/.codeject`
- `CODEJECT_TUNNEL_AUTOSTART`: đặt `1` để tự start tunnel khi server khởi động
- `CODEJECT_TUNNEL_BINARY`: đổi binary tunnel, mặc định `cloudflared`
- `CODEJECT_TUNNEL_TARGET_URL`: override target URL mà tunnel public trỏ tới; mặc định là `http://127.0.0.1:<PORT>`
- `NODE_ENV`: khi khác `production` thì server coi là development mode

## Lưu trữ dữ liệu

- `~/.codeject/config.json`
- `~/.codeject/sessions/*.json`

## Remote access

Remote access được cung cấp thông qua `cloudflared`.

Điều kiện:

- Host phải cài `cloudflared`.
- REST request không local phải dùng `Authorization: Bearer <key>`.
- WebSocket non-local dùng `?token=<key>` trong URL `/ws/:sessionId`.
- QR chỉ chứa public URL, không chứa secret.

Hai mode được hỗ trợ:

- `Quick`: không cần cấu hình Cloudflare trước, nhận URL `trycloudflare.com` mới mỗi lần start.
- `Named (token-based)`: dùng hostname cố định trên domain Cloudflare của bạn và tunnel token lưu trong Codeject.

### Named tunnel token-based

Chuẩn bị trên Cloudflare:

1. Tạo một named tunnel trong Cloudflare Zero Trust.
2. Tạo public hostname, ví dụ `codeject.example.com`, trỏ vào tunnel đó.
3. Lấy tunnel token cho tunnel vừa tạo.

Thiết lập trong Codeject:

1. Mở `Settings` → `Remote Access`.
2. Chọn mode `Named`.
3. Nhập hostname public, ví dụ `codeject.example.com`.
4. Dán tunnel token rồi bấm `Save named tunnel`.
5. Start tunnel như bình thường.

Ghi chú:

- Token được lưu local trong `~/.codeject/config.json`.
- Token không được trả lại qua API status và không được hiển thị lại trong UI.
- Auth Internet-facing vẫn dùng cùng API key hiện có của Codeject: REST qua bearer header, WebSocket qua `?token=`. Không dùng Cloudflare Access trong scope hiện tại.

## Ghi chú vận hành

- Production entrypoint là server Express trong `packages/server`.
- Frontend static được phục vụ từ `packages/web/out`.
- Mỗi session ứng dụng sở hữu một `tmux` runtime riêng.
