# Security Remediation Summary (Feb 2025)

## What Was Fixed

### 1. Credential docs
- **docs/TEST_CREDENTIALS.md** – Replaced real email/password with placeholders
- **docs/AUTHENTICATION_TEST_RESULTS.md** – Replaced credentials with placeholders
- **docs/AUTHENTICATION_TEST_RESULTS_FINAL.md** – Replaced credentials with placeholders

### 2. SQL debug script
- **docs/supabase/sql/DEBUG_SUPABASE_POTS.sql** – Replaced a real email with `YOUR_EMAIL@example.com`

### 3. Private keys in blockchain docs
- **.knowns/docs/blockchain/integration-smart-contract-testing.md** – Replaced private keys with `$PRIVATE_KEY` env var
- **.knowns/docs/blockchain/smart-contract-testing.md** – Same

### 4. Sample IBAN
- **src/App.tsx** – Replaced `CH93 0076 2011 6238 5295 7` with placeholder
- **src/components/screens/MemberDetail.tsx** – Same
- **src/docs/BACKEND_API.md** – Same

### 5. Secret scanning
- **.gitleaks.toml** – Config to detect the removed credentials if re-added
- **.github/workflows/secrets-scan.yml** – CI job runs Gitleaks on every PR/push

---

## Action Required: Rotate Credentials

**Important:** The credentials were previously committed. Even after removal, they may exist in git history.

1. **Change password** for the email previously used in test docs, on ChopDot and any other service that shared that password
2. **Optional:** If the repo was ever public, consider `git filter-repo` to remove from history (coordinate with collaborators)

---

## Local Secret Scan

```bash
# Install
brew install gitleaks

# Scan
gitleaks detect --config .gitleaks.toml --source . --verbose
```

---

## Best Practices Going Forward

- Never commit real credentials – use `.env` and placeholders
- Use disposable test accounts for auth testing
- Use well-known test addresses (e.g. from Polkadot/Substrate docs) – not personal wallets
- Run `gitleaks detect` before pushing if you add new test docs
