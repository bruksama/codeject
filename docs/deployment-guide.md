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
- `npm run test`

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
- `CODEJECT_TUNNEL_AUTOSTART`: đặt `1` để default `autoStart` là bật khi config local chưa ghi đè; chỉ có hiệu lực thực tế cho named tunnel
- `CODEJECT_TUNNEL_BINARY`: đổi binary tunnel, mặc định `cloudflared`
- `CODEJECT_TUNNEL_TARGET_URL`: override target URL mà tunnel public trỏ tới; mặc định là `http://127.0.0.1:<PORT>`
- `NODE_ENV`: khi khác `production` thì server coi là development mode

## Verification và hardening

Verification tối thiểu trước khi ship thay đổi:

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `npm run test`

WebSocket boundary hiện có runtime validation dùng shared Zod schemas:

- server validate incoming client frames trước khi xử lý command
- frame client sai schema sẽ bị reject với `terminal:error` và không đi tiếp vào terminal execution
- development mode của server assert outgoing server frame trước khi gửi
- web client cũng validate incoming server frames; nếu frame là JSON hợp lệ nhưng sai schema, client coi đó là transport failure và reconnect thay vì tiếp tục với state hỏng

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
- Browser notification không phụ thuộc tunnel, nhưng muốn dùng notification trên thiết bị remote vẫn cần browser support + permission thật ở thiết bị đó.
- Trên iPhone/iPad Safari, notification yêu cầu app được Add to Home Screen trước.

Hai mode được hỗ trợ:

- `Quick`: không cần cấu hình Cloudflare trước, nhận URL `trycloudflare.com` mới mỗi lần start.
- `Named (token-based)`: dùng hostname cố định trên domain Cloudflare của bạn và tunnel token lưu trong Codeject.

`Auto-start` chỉ khả dụng cho `Named (token-based)`. Khi bật, server sẽ tự khởi động tunnel lúc bootstrap; quick tunnel vẫn là luồng manual-only vì URL luôn ephemeral.

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
- Mỗi thiết bị remote lưu bearer key riêng trong browser `localStorage`; QR hoặc public URL không mang theo secret đó.

## Ghi chú vận hành

- Production entrypoint là server Express trong `packages/server`.
- Frontend static được phục vụ từ `packages/web/out`.
- Mỗi session ứng dụng sở hữu một `tmux` runtime riêng.
- API tunnel hiện có thêm `PUT /api/tunnel/auto-start` để bật/tắt named-tunnel auto-start từ UI.
- `AppSettings.notifications` là preference frontend-only, lưu trong browser storage chứ không nằm trong `~/.codeject/config.json`.
