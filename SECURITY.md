# ChopDot Security Notes

- **No secrets in repo**: All secrets must come from environment variables in Vercel (e.g., `VITE_WEB3AUTH_CLIENT_ID`). Do not commit keys.
- **Debug helpers**: `window.ChopDot` is exposed only in development builds.
- **Content Security Policy**: A restrictive CSP is set in `index.html` to reduce XSS risk. Adjust only when needed.
- **Source maps**: Disabled in production builds via `vite.config.ts`.
- **Demo mode**: Use the `DEMO_MODE` feature flag to disable wallet connect and signing in public demos.
- **Local storage**: Only mock tokens and demo data are stored; avoid storing PII or secrets.
- **Reporting**: Please report issues privately to security@chopdot.app.
