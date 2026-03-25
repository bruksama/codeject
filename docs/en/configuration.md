# Configuration

Keeping configuration in one place makes deployment and troubleshooting predictable. This file lists runtime knobs and browser-level settings without repeating runbook steps.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3500` | Express server port |
| `HOST` | `0.0.0.0` | Server bind host |
| `CODEJECT_HOME` | `~/.codeject` | Config/session storage root |
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

## Remote access settings

- `Quick`: temporary URL, manual start only.
- `Named`: fixed hostname + token, supports `Auto-start`.
- `Device Auth`: stores bearer key per remote device.

> **Warning:** `Reset Local Settings` on a device also removes the saved bearer key for that device.
