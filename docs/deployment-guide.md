# Hướng dẫn chạy và triển khai

## Phát triển local

Yêu cầu:

- Node.js và npm tương thích với `packageManager`
- `tmux`
- `cloudflared` nếu muốn thử remote access

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

Bien ho tro:

- `PORT`
- `HOST`
- `CODEJECT_HOME` để đổi vị trí mặc định của `~/.codeject`

## Lưu trữ dữ liệu

- `~/.codeject/config.json`
- `~/.codeject/sessions/*.json`

## Remote access

Remote access đã có sẵn thông qua `cloudflared`.

Điều kiện:

- host phải cài `cloudflared`
- request không local phải dùng bearer key
- QR chỉ chứa public URL, không chứa secret

## Ghi chú vận hành

- production entrypoint là server Express trong `packages/server`
- frontend static được phục vụ từ `packages/web/out`
- mỗi session ứng dụng sở hữu một `tmux` runtime riêng
