# Emma Local Bridge

This is the local companion that gives the GitHub Pages Emma app a controlled connection to the user's computer.

Capabilities:
- visible Chromium session
- open and inspect HTTP(S) pages
- screenshots
- click/fill actions
- localhost-only binding
- per-process random authentication token

The bridge deliberately does not expose arbitrary shell execution, unrestricted filesystem access, payments, banking, or destructive system commands.

For broad web automation, Emma can use a browser-agent adapter such as Browser Use rather than embedding an unrestricted computer-control API in the public web app.
