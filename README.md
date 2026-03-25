# Codeject

Giao diện web ưu tiên điện thoại để theo dõi và điều khiển CLI coding assistant chạy local.

![Ảnh giao diện Codeject](./docs/assets/images/readme-landing.png)

## Vì sao dùng Codeject?

Session CLI dài rất khó theo dõi trên điện thoại và dễ rối khi chạy nhiều công cụ cùng lúc. Codeject giữ runtime trên chính máy của bạn nhưng cung cấp bề mặt web gọn để theo dõi, gửi prompt, và phản hồi approval. Khác biệt chính là luồng chat-first với action card an toàn, kèm terminal tab nhẹ khi bắt buộc phải thao tác trực tiếp.

## Tính năng

- **Quản lý session:** Tạo, khôi phục, và xóa nhiều session CLI.
- **Tương tác chat-first:** Gửi prompt, approve, chọn option, và nhập liệu ngay trong transcript.
- **Tối ưu mobile:** Header/composer cố định, chỉ transcript cuộn, chỉnh cỡ chữ nhanh.
- **Truy cập remote:** Hỗ trợ quick tunnel và named tunnel Cloudflare với auth theo thiết bị.
- **An toàn runtime:** Validate frame WebSocket bằng Zod ở cả client và server.
- **Theo dõi nền:** Notification trình duyệt tùy chọn cho action-needed, reply-ready, lỗi, và idle.

## Chạy nhanh

```bash
git clone <repo-url> && cd codeject
npm install
npm run dev
```

- UI: `http://localhost:4028`
- API + WebSocket: `http://localhost:3500`

## Tài liệu

| Chủ đề | Tiếng Việt | English |
|-------|------------|---------|
| Bắt đầu nhanh | `docs/getting-started.md` | `docs/en/getting-started.md` |
| Hướng dẫn sử dụng | `docs/usage-guide.md` | `docs/en/usage-guide.md` |
| Kiến trúc | `docs/architecture.md` | `docs/en/architecture.md` |
| Triển khai | `docs/deployment.md` | `docs/en/deployment.md` |
| Cấu hình | `docs/configuration.md` | `docs/en/configuration.md` |
| Xử lý sự cố | `docs/troubleshooting.md` | `docs/en/troubleshooting.md` |

## Công nghệ

Next.js 16 · React 19 · Express 5 · tmux · Tailwind CSS 4 · Zustand · Zod

## Giấy phép

MIT

---

# Codeject

Mobile-first web control surface for local CLI coding assistants.

![Codeject web app screenshot](./docs/assets/images/readme-landing.png)

## Why Codeject?

Long CLI sessions are hard to follow on phones and awkward to manage across multiple assistants. Codeject keeps runtime on your machine but gives you a compact web UI for monitoring, prompting, and approvals. The key difference is chat-first interaction with safe action cards plus a lightweight terminal tab when direct input is unavoidable.

## Features

- **Session control:** Create, restore, and delete multiple CLI sessions.
- **Chat-first workflow:** Send prompts, handle approvals, and answer input requests inline.
- **Mobile readability:** Fixed header/composer, transcript-only scroll, adjustable font size.
- **Remote access:** Quick and named Cloudflare tunnel modes with per-device auth.
- **Runtime safety:** Shared Zod validation for WebSocket frames at client and server boundaries.
- **Background awareness:** Optional browser notifications for action-needed, reply-ready, errors, and idle.

## Quick Start

```bash
git clone <repo-url> && cd codeject
npm install
npm run dev
```

- UI: `http://localhost:4028`
- API + WebSocket: `http://localhost:3500`

## Documentation

| Topic | Vietnamese | English |
|-------|------------|---------|
| Getting Started | `docs/getting-started.md` | `docs/en/getting-started.md` |
| Usage Guide | `docs/usage-guide.md` | `docs/en/usage-guide.md` |
| Architecture | `docs/architecture.md` | `docs/en/architecture.md` |
| Deployment | `docs/deployment.md` | `docs/en/deployment.md` |
| Configuration | `docs/configuration.md` | `docs/en/configuration.md` |
| Troubleshooting | `docs/troubleshooting.md` | `docs/en/troubleshooting.md` |

## Tech Stack

Next.js 16 · React 19 · Express 5 · tmux · Tailwind CSS 4 · Zustand · Zod

## License

MIT