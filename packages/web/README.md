# @codeject/web

Next.js 16 frontend workspace for Codeject. This package provides the mobile-first UI, talks to the Express server over REST + WebSocket, and is exported as static files for production serving.

## Development

Preferred workflow from the repo root:

```bash
npm run dev
```

That starts:

- the web dev server on `http://localhost:4028`
- the Express API/WebSocket server on `http://localhost:3500`

If you only want the frontend workspace:

```bash
npm run dev -w @codeject/web
```

In dev, the web app expects the backend at `http://127.0.0.1:3500` and WebSocket connections at `ws://127.0.0.1:3500/ws/:sessionId`.

## Production build

```bash
npm run build -w @codeject/web
```

`next.config.mjs` uses `output: 'export'`, so the build is consumed as static files under `packages/web/out`. The production entrypoint for the whole app is still the Express server in `packages/server`.

## Important directories

```text
packages/web/
├── src/app/              # App Router pages
├── src/components/       # Chat, session, and shared UI components
├── src/hooks/            # Session / websocket interaction hooks
├── src/lib/              # HTTP and WebSocket client code
├── src/stores/           # Zustand app state
├── src/styles/           # Global CSS and Tailwind entrypoints
├── public/               # Static assets and icons
└── next.config.mjs       # Static export configuration
```

## Scripts

- `npm run dev` starts Next.js on port `4028`
- `npm run build` creates the static export used by the server
- `npm run start` starts a standalone Next.js server on port `4028`
- `npm run serve` starts a standalone Next.js server on the default port
- `npm run lint` runs ESLint
- `npm run lint:fix` runs ESLint with fixes
- `npm run format` formats `src/**/*.{ts,tsx,css,md,json}`
- `npm run type-check` runs TypeScript with `tsconfig.typecheck.json`
