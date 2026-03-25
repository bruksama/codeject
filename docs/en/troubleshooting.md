# Troubleshooting

Fast symptom-first fixes keep sessions usable under pressure. Apply the matching fix below, then retry the same flow before changing broader settings.

## `tmux` not found

**Symptom:** Session creation fails or server logs show `tmux` command errors.

**Fix:** Install `tmux` on the host and restart the server process.

## Port already in use

**Symptom:** `npm run dev` or `npm start` fails with port binding errors.

**Fix:** Free the occupied port or change `PORT` for the server, then run again.

## WebSocket won’t connect

**Symptom:** Chat stays disconnected or reconnects repeatedly.

**Fix:** Verify server is running on `:3500`, check bearer key for non-local access, then reconnect.

## Notifications not working

**Symptom:** No browser notifications when tab is unfocused.

**Fix:** Enable `Settings > Appearance > Notifications`, grant browser permission, and on iOS/iPadOS add the app to Home Screen.

## Remote access returns 401

**Symptom:** Remote browser can open URL but API/WS calls fail with 401.

**Fix:** Save a valid bearer key again in `Settings > Remote Access > Device Auth` on that device.
