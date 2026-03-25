# Deployment

A clean deployment path avoids drift between UI, API, and tmux runtime behavior. Keep development and production flows separate so failures are easier to isolate.

## Development

```bash
npm run dev
```

- UI: `http://localhost:4028`
- API + WebSocket: `http://localhost:3500`

## Local production

```bash
npm run build
npm start
curl -f http://localhost:3500/api/health
```

Open the app at `http://localhost:3500`.

## Remote access

### Quick tunnel

1. Install `cloudflared` on the host.
2. Open `Settings > Remote Access` and choose `Quick`.
3. Start the tunnel, then open the public URL or scan the QR code.

### Named tunnel

1. Create a named tunnel in Cloudflare Zero Trust.
2. Create a public hostname that points to the tunnel.
3. Copy the tunnel token.
4. In `Settings > Remote Access`, choose `Named`, enter hostname + token, then save.
5. Start the tunnel. Enable `Auto-start` if you need persistent behavior.

> **Warning:** Remote requests still require bearer authentication. QR contains only the public URL, never secrets.

## Verification

```bash
npm run lint
npm run type-check
npm run build
npm test
```
