# Bắt đầu nhanh

Chạy được Codeject trong vài phút giúp bạn kiểm tra nhanh luồng chat/action card trước khi đi sâu cấu hình. Làm đúng thứ tự cài đặt và chạy sẽ tránh phần lớn lỗi khởi động ban đầu.

## Yêu cầu

| Thành phần | Bắt buộc | Ghi chú |
|---|---|---|
| Node.js + npm | Có | Phiên bản tương thích với `packageManager` trong `package.json` |
| `tmux` | Có | Runtime session phụ thuộc `tmux` |
| `cloudflared` | Tùy chọn | Chỉ cần khi bật truy cập remote |

## Cài đặt

```bash
git clone <repo-url> && cd codeject
npm install
```

## Chạy

### Development

```bash
npm run dev
```

Mở UI tại `http://localhost:4028`.

### Production local

```bash
npm run build
npm start
```

Mở ứng dụng tại `http://localhost:3500`.

## Bước tiếp

- Luồng thao tác hằng ngày: `docs/usage-guide.md`
- Tùy chỉnh behavior/UI: `docs/configuration.md`
- Deploy và remote access: `docs/deployment.md`
