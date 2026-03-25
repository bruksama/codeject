# Triển khai

Triển khai đúng ngay từ đầu giúp tránh lỗi kết nối giữa web, API, và runtime `tmux`. Tách rõ môi trường development với production giúp debug nhanh hơn khi có sự cố.

## Development

```bash
npm run dev
```

- UI: `http://localhost:4028`
- API + WebSocket: `http://localhost:3500`

## Production local

```bash
npm run build
npm start
curl -f http://localhost:3500/api/health
```

Mở ứng dụng tại `http://localhost:3500`.

## Remote Access

### Quick tunnel

1. Cài `cloudflared` trên host.
2. Mở `Settings > Remote Access` và chọn `Quick`.
3. Start tunnel, sau đó mở public URL hoặc quét QR.

### Named tunnel

1. Tạo named tunnel trong Cloudflare Zero Trust.
2. Tạo public hostname trỏ vào tunnel.
3. Lấy tunnel token từ Cloudflare.
4. Vào `Settings > Remote Access`, chọn `Named`, nhập hostname + token rồi lưu.
5. Start tunnel; nếu dùng lâu dài có thể bật `Auto-start`.

> **Warning:** Remote request bắt buộc dùng bearer key. QR chỉ chứa URL công khai, không chứa secret.

## Xác minh

```bash
npm run lint
npm run type-check
npm run build
npm test
```
