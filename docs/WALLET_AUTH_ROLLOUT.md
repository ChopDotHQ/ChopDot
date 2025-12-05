# Wallet Auth Rollout Guide

This guide walks through deploying the secure wallet authentication system.

## Prerequisites

- Supabase CLI installed (`supabase --version`)
- Access to your Supabase project (URL and service role key)
- Node.js installed (for running the password rotation script)

## Step 1: Apply Database Migration

Apply the `auth_nonces` table migration:

```bash
supabase db push
```

**Expected output:**
- Migration `20251127120000_create_auth_nonces.sql` should be applied
- Table `auth_nonces` created with columns: `address`, `nonce`, `expires_at`, `created_at`

**Verify:**
```bash
supabase db diff
# Should show no differences if migration applied successfully
```

## Step 2: Deploy Edge Function

Deploy the `wallet-auth` Edge Function:

```bash
supabase functions deploy wallet-auth
```

**Required Environment Variables:**
The function needs these secrets configured in Supabase Dashboard:

1. Go to: **Project Settings → Edge Functions → Secrets**
2. Set:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Project Settings → API)
   - `VITE_WALLET_EMAIL_DOMAIN` (optional) - Defaults to `chopdot.app`

**Verify deployment:**
```bash
supabase functions list
# Should show wallet-auth in the list
```

## Step 3: Rotate Existing Wallet Passwords

⚠️ **Important:** Run this script **locally** (not committed to repo) to rotate passwords for existing wallet users. This invalidates old address-as-password logins.

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE=your_service_role_key \
node scripts/rotate-wallet-passwords.js
```

**What this does:**
- Finds all users with `wallet_address` in metadata or email starting with `wallet.user.`
- Generates a new random password for each
- Signs out all active sessions for those users
- Old address-as-password logins will fail

**Expected output:**
```
Starting password rotation for wallet users...

✓ Rotated password for wallet user abc123... (wallet.user.xyz@chopdot.app)
✓ Rotated password for wallet user def456... (wallet.user.abc@chopdot.app)

✅ Password rotation complete! Rotated 2 wallet user(s).
```

## Step 4: Verify Client Environment Variables

Ensure your frontend has these environment variables set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Check in your `.env` or `.env.local`:**
```bash
grep VITE_SUPABASE .env.local
```

## Step 5: Smoke Test Wallet Login

### Test Polkadot Wallet Login

1. **Open your app** (e.g., `http://localhost:5173`)
2. **Click "Connect Wallet"** → Select "Polkadot"
3. **Expected flow:**
   - Extension popup appears
   - Select account → Approve
   - Nonce is requested from `/wallet-auth/request-nonce`
   - Signature prompt appears
   - After signing, `/wallet-auth/verify` is called
   - Session tokens are returned
   - User is logged in

4. **Verify in browser console:**
   - No errors related to nonce/signature
   - Session token stored in localStorage
   - User metadata shows `wallet_address` and `auth_method: "polkadot"`

### Test EVM Wallet Login (if implemented)

1. **Click "Connect Wallet"** → Select "EVM" or "MetaMask"
2. **Expected flow:** Same as Polkadot but using EVM signature verification

### Test Old Login Fails

1. **Try old method:** Attempt to login with `signInWithPassword` using address as password
2. **Expected:** Should fail with "Invalid login credentials"
3. **Verify:** Old sessions are invalidated (user must re-authenticate)

## Troubleshooting

### Migration Fails

```bash
# Check migration status
supabase migration list

# If migration already applied, you may see:
# "Migration already applied"
# This is OK - skip to Step 2
```

### Function Deployment Fails

```bash
# Check function logs
supabase functions logs wallet-auth

# Verify secrets are set
supabase secrets list
```

### Password Rotation Script Errors

**Error: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE env vars"**
- Ensure you're exporting the variables in your shell session
- Or create a `.env.local` file and use `dotenv-cli`:
  ```bash
  npm install -g dotenv-cli
  dotenv -e .env.local -- node scripts/rotate-wallet-passwords.js
  ```

**Error: "Permission denied"**
- Ensure you're using the **service role key** (not anon key)
- Service role key has admin access to `auth.users` table

### Login Flow Errors

**"nonce not found"**
- Check Edge Function logs: `supabase functions logs wallet-auth`
- Verify nonce was created: Check `auth_nonces` table in Supabase Dashboard

**"invalid signature"**
- Verify wallet extension is connected
- Check signature format matches expected (hex string for Polkadot, 0x-prefixed for EVM)

**CORS errors**
- Edge Function should handle CORS automatically via `corsHeaders`
- If issues persist, check function code includes CORS headers

## Rollback Plan

If you need to rollback:

1. **Disable Edge Function:**
   ```bash
   supabase functions delete wallet-auth
   ```

2. **Revert client code:**
   ```bash
   git revert <commit-hash>
   ```

3. **Note:** Password rotation cannot be undone - users will need to re-authenticate with new flow

## Next Steps

After successful rollout:

- [ ] Monitor Edge Function logs for errors
- [ ] Track login success rates
- [ ] Consider adding rate limiting to nonce requests
- [ ] Set up alerts for failed authentication attempts
- [ ] Document user-facing changes (if any)
