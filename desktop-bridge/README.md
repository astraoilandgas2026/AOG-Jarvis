# Emma Local Bridge

Local runtime that gives Emma a controlled browser lane on the user's computer.

## What it provides

- Persistent Chromium profile for logged-in web sessions.
- Navigate, inspect, click, fill and screenshot web pages.
- Local-only listener on `127.0.0.1`.
- Origin allowlist plus pairing token.
- Automatic Windows startup after the one-time installer.
- No arbitrary shell execution.
- No payment, banking or financial transaction commands.

## Windows

1. Install Node.js 20+.
2. Run `install-windows.ps1` once.
3. The installer installs Playwright Chromium and registers Emma's bridge in the Windows Startup folder.
4. Emma discovers the bridge automatically when the web app is open.

The browser profile is stored in `%USERPROFILE%\\.emma\\browser-profile`.

## Browser lane

The bridge uses a persistent Chromium profile so Emma can work with sessions you explicitly establish in that browser. It is deliberately separate from your normal Chrome profile.

## Security boundary

The bridge listens only on localhost, validates the web origin, and requires a per-process pairing token. It exposes explicit browser commands rather than arbitrary operating-system execution.

## Architecture

Emma Web → Smart Router → Adapter Registry → Local Bridge → Persistent Chromium.

This is the first local-computer adapter. Files, desktop apps and screen control should be added as separate scoped adapters with their own permissions and evidence rules.
