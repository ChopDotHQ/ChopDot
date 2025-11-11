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

---

## Security Audit Results

### 1. ✅ Secrets & Credentials

**Status:** **SAFE**

- ✅ **No hardcoded passwords** - All authentication uses environment variables
- ✅ **No hardcoded API keys** - All keys use `process.env` or `import.meta.env`
- ✅ **No private keys** - Wallet signing handled by extensions/WalletConnect
- ✅ **No mnemonics/seeds** - Never stored or logged
- ✅ **Environment files excluded** - `.env` and `.env.*` in `.gitignore`

**Findings:**
- WalletConnect Project ID uses environment variable with fallback (public identifier, safe to expose)
- All backend secrets use `process.env` (properly configured)

### 2. ✅ Data Storage & Privacy

**Status:** **SAFE**

**localStorage Usage:**
- ✅ Pot data (`chopdot_pots`) - User's own data, encrypted exports available
- ✅ Settlements (`chopdot_settlements`) - User's own data
- ✅ Wallet address (`account.address0`) - Public address, safe to store
- ✅ IPFS onboarding flags (`ipfs_auth_onboarding_*`) - UI state only
- ✅ Crust uploaded files (`crustUploadedFiles`) - User's own uploads

**No Sensitive Data Stored:**
- ❌ No passwords stored
- ❌ No private keys stored
- ❌ No signatures stored permanently (only cached in memory)
- ❌ No PII beyond what user provides

**Privacy:**
- ✅ User data stays in browser (localStorage)
- ✅ IPFS uploads are user-initiated
- ✅ No automatic data collection
- ✅ No tracking or analytics

### 3. ✅ Network Security

**Status:** **SAFE**

**Endpoints Used:**
- ✅ `https://gw.crustfiles.app/api/v0` - Crust IPFS API (HTTPS)
- ✅ `https://ipfs.io` - Public IPFS gateway (HTTPS)
- ✅ `https://gateway.pinata.cloud` - Public IPFS gateway (HTTPS)
- ✅ `wss://rpc-rocky.crust.network` - Crust RPC (WSS - encrypted)
- ✅ `wss://polkadot-asset-hub-rpc.polkadot.io` - Polkadot RPC (WSS - encrypted)
- ✅ `https://api.coingecko.com` - Public API (HTTPS)

**No Insecure Connections:**
- ❌ No `http://` endpoints (except localhost for dev)
- ❌ No `ws://` (unencrypted WebSocket)
- ✅ All production endpoints use HTTPS/WSS

### 4. ✅ Code Injection & XSS

**Status:** **SAFE**

**Dangerous Patterns Checked:**
- ✅ No `eval()` usage
- ✅ No `Function()` constructor
- ✅ No `innerHTML` manipulation (except one safe case)
- ✅ No `document.write()`

**One Safe Exception:**
- `src/components/ui/chart.tsx` uses `dangerouslySetInnerHTML` for CSS theme injection
  - **SAFE:** Only injects CSS from a controlled object (`THEMES`), no user input
  - **Risk:** Low - CSS injection only, no script execution

**Content Security Policy:**
- ✅ CSP configured in `index.html`
- ✅ Source maps disabled in production

### 5. ✅ Authentication & Authorization

**Status:** **SAFE**

**IPFS Authentication:**
- ✅ Wallet-based (user signs their own address)
- ✅ Signatures cached in memory only (cleared on page reload)
- ✅ No tokens stored permanently
- ✅ Backend generates tokens server-side

**Wallet Security:**
- ✅ No wallet seed phrases handled
- ✅ All signing via browser extensions/WalletConnect
- ✅ No private key access

### 6. ✅ Backend Security

**Status:** **SAFE**

**Environment Variables:**
- ✅ `CRUST_API_KEY` - From `process.env` (not hardcoded)
- ✅ `CRUST_W3AUTH_TOKEN` - From `process.env` (not hardcoded)
- ✅ All secrets properly configured

**API Security:**
- ✅ User-specific tokens generated server-side
- ✅ No global tokens exposed to frontend
- ✅ Proper authentication headers

### 7. ✅ Logging & Debugging

**Status:** **SAFE**

**Console Logs:**
- ✅ No passwords/secrets logged
- ✅ Wallet addresses truncated (first 10 chars + "...")
- ✅ Signatures not logged
- ✅ Only safe metadata logged

**Debug Code:**
- ✅ `window.ChopDot` only in development (per SECURITY.md)
- ✅ Source maps disabled in production

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

## Historical Security Reviews

- **[docs/archive/SECURITY_REVIEW.md](./docs/archive/SECURITY_REVIEW.md)** - Chain test implementation review (November 2025)

---

**Report Generated:** January 2025  
**Next Review:** After major feature additions or security concerns
