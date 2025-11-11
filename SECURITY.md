# ChopDot Security

**Last Updated:** January 2025

---

## Quick Reference

- **No secrets in repo**: All secrets must come from environment variables (e.g., `VITE_WEB3AUTH_CLIENT_ID`, `VITE_WALLETCONNECT_PROJECT_ID`). Do not commit keys.
- **Debug helpers**: `window.ChopDot` is exposed only in development builds.
- **Content Security Policy**: A restrictive CSP is set in `index.html` to reduce XSS risk. Adjust only when needed.
- **Source maps**: Disabled in production builds via `vite.config.ts`.
- **Local storage**: Only user's own pot data and wallet addresses stored; no passwords, private keys, or PII.
- **Reporting**: Please report issues privately to security@chopdot.app.

---

## Security Status

✅ **Current Status: SAFE** (as of January 2025)

The codebase follows security best practices:
- No hardcoded secrets or credentials
- Proper use of environment variables
- Secure network connections (HTTPS/WSS only)
- Safe data storage practices
- No code injection vulnerabilities
- Proper authentication mechanisms

**See [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) for comprehensive security audit details.**

---

## Key Security Practices

### Environment Variables
- All sensitive configuration uses environment variables
- `.env` files are in `.gitignore` and never committed
- Backend secrets use `process.env`
- Frontend config uses `import.meta.env.VITE_*`

### Authentication
- Wallet-based authentication (user signs their own address)
- No private keys handled by the application
- Tokens generated server-side
- Signatures cached in memory only (cleared on reload)

### Data Storage
- User data stored locally in browser (localStorage)
- No sensitive data (passwords, private keys, mnemonics) stored
- IPFS uploads are user-initiated
- No automatic data collection or tracking

### Network Security
- All production endpoints use HTTPS/WSS
- Public IPFS gateways (read-only, safe)
- Crust IPFS (user-authenticated uploads)
- No unencrypted connections

### Code Security
- Content Security Policy (CSP) configured
- No `eval()` or dangerous code patterns
- Source maps disabled in production
- Safe logging (no secrets in console)

---

## Historical Security Reviews

- **[SECURITY_REVIEW.md](./docs/archive/SECURITY_REVIEW.md)** - Chain test implementation review (November 2025)
- **[SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)** - Comprehensive security audit (January 2025)

---

## Security Checklist

- ✅ No hardcoded secrets
- ✅ Environment variables properly used
- ✅ HTTPS/WSS for all connections
- ✅ No code injection risks
- ✅ Safe localStorage usage
- ✅ Proper authentication
- ✅ No sensitive data in logs
- ✅ CSP configured
- ✅ Source maps disabled in production
- ✅ .env files in .gitignore

---

**For detailed security analysis, see [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)**
