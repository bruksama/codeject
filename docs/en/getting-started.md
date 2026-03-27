# Quick Start

Codeject is fastest to validate when you run one local dev session, create one CLI session, then test one approval flow. These steps keep setup under three minutes on a prepared machine.

## Requirements

| Requirement | Required | Notes |
|---|---|---|
| Node.js + npm | Yes | Must match `packageManager` in `package.json`. |
| tmux | Yes | Runtime bridge depends on tmux. |
| cloudflared | Optional | Only for remote access via Cloudflare Tunnel. |

## Install

```bash
git clone <repo-url> && cd codeject
npm install
```

## Run

### Development

```bash
npm run dev
```

Stop the dev runtime with `Ctrl+C`.

If the runtime gets stuck or you need cleanup from another shell:

```bash
npm run safe-stop
```

Open `http://localhost:4028` for the web UI. API and WebSocket run at `http://localhost:3500`.

### Local Production

```bash
npm run build
npm start
```

Open `http://localhost:3500`.

## Next Steps

- Usage recipes: [`docs/en/usage-guide.md`](./usage-guide.md)
- Configuration knobs: [`docs/en/configuration.md`](./configuration.md)
- Deployment and remote access: [`docs/en/deployment.md`](./deployment.md)
