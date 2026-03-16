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

## Chạy production local

Build:

- `npm run build`

Run:

- `npm start`

Mặc định server lắng nghe ở `PORT` hoặc `3500`.

## Biến môi trường

File mẫu:

- `.env.example`

Biến hỗ trợ:

- `PORT`
- `HOST`
- `CODEJECT_HOME` để đổi vị trí mặc định của `~/.codeject`

## Lưu trữ dữ liệu

- `~/.codeject/config.json`
- `~/.codeject/sessions/*.json`

## Remote access

Remote access được cung cấp thông qua `cloudflared`.

Điều kiện:

- Host phải cài `cloudflared`.
- Request không local phải dùng bearer key.
- QR chỉ chứa public URL, không chứa secret.

## Ghi chú vận hành

- Production entrypoint là server Express trong `packages/server`.
- Frontend static được phục vụ từ `packages/web/out`.
- Mỗi session ứng dụng sở hữu một `tmux` runtime riêng.
