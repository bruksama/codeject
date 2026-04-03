# Configuration

Keeping configuration in one place makes deployment and troubleshooting predictable. This file lists runtime knobs and browser-level settings without repeating runbook steps.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3500` | Express server port |
| `HOST` | `0.0.0.0` | Server bind host |
| `CODEJECT_HOME` | `~/.codeject` | Config/session storage root |
| `CODEJECT_INTERNAL_SERVER_URL` | `http://127.0.0.1:<PORT>` | Internal URL used by hook wrappers for stop-signal POSTs |
| `CODEJECT_TUNNEL_AUTOSTART` | `0` | Default named-tunnel autostart when local config has no override |
| `CODEJECT_TUNNEL_BINARY` | `cloudflared` | Tunnel binary name/path |
| `CODEJECT_TUNNEL_TARGET_URL` | `http://127.0.0.1:<PORT>` | Internal URL forwarded by tunnel |
| `NODE_ENV` | `development` | Environment mode switch |

## UI settings

### Font Size

Change it at `Settings > Appearance > Font Size`. The value is browser-local and applies app-wide immediately.

### Accent Color

Change it at `Settings > Appearance > Accent Color`. The accent is stored per browser.

### Notifications

Enable it at `Settings > Appearance > Notifications`.

> **Note:** If permission is revoked outside the app, Codeject clears stale enabled state when the app regains focus.

## CLI Programs

1. Open CLI program management.
2. Add or edit the command for your tool.
3. Save and create a session using that program.

## Hook installer paths

When you run `npm run codeject -- install`, Codeject currently manages:

- `~/.codeject/install-state.json`: install/repair manifest
- `~/.codeject/bin/codeject-claude-stop-hook`: Claude stop-hook wrapper
- `~/.codeject/bin/codeject-codex-stop-hook`: Codex stop-hook wrapper
- `~/.claude/settings.json`: merged Codeject-owned `Stop` hook entry
- `~/.codex/config.toml`: enables `features.codex_hooks = true` when needed
- `~/.codex/hooks.json`: merged Codeject-owned `Stop` hook entry

`status` uses these paths to detect drift between wrapper, config, and feature flag state. `repair` only runs when install-state already exists, then recreates the Codeject-managed pieces.

Wrappers only activate for Codeject-launched sessions with:

- `CODEJECT_SESSION_ID`
- `CODEJECT_HOOK_TOKEN`
- `CODEJECT_SERVER_URL`

Outside Codeject they no-op and exit `0`. `uninstall` removes only Codeject-owned hook pieces, then deletes `~/.codeject`.

## Remote access settings

- `Quick`: temporary URL, manual start only.
- `Named`: fixed hostname + token, supports `Auto-start`.
- `Device Auth`: stores bearer key per remote device.

> **Warning:** `Reset Local Settings` on a device also removes the saved bearer key for that device.
