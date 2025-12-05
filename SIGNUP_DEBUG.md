# Supabase Signup Debugging Guide

## Issue Summary
The signup form with email and password doesn't create users in Supabase.

## What We've Found

### ✅ Working:
1. **Supabase is running locally** on `http://127.0.0.1:54321`
2. **Direct API calls work** - We successfully created a test user via curl
3. **Environment variables are set correctly** in `.env`:
   - `VITE_SUPABASE_URL=http://127.0.0.1:54321`
   - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. **Email confirmation is disabled** - `enable_confirmations = false` in `supabase/config.toml`

### 🔍 Possible Issues:
1. Environment variables might not be loaded in the browser
2. CORS issues with the local Supabase instance
3. Supabase client initialization issue
4. Form submission not reaching the signup handler

## Debugging Steps

### Step 1: Check Environment Variables in Browser
1. Open your app at `http://localhost:5173`
2. Open browser DevTools (F12)
3. In Console, run:
   ```javascript
   console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
   ```
4. **Expected**: Should show the URL and partial key
5. **If not**: Restart your dev server with `npm run dev` or `yarn dev`

### Step 2: Use the Debug Tool
1. Navigate to the signup page in your app
2. Open browser DevTools Console
3. Look for these logs:
   - `[SignInScreen] Supabase client configured` ✅
   - OR `[SignInScreen] Supabase client NOT configured` ❌

4. When you try to sign up, look for:
   - `[Signup] Starting signup for: [email]`
   - `[Signup] Result: { data, error }`
   - `[Signup] User created successfully: [user_id]`

### Step 3: Check Database
After attempting signup, check if user was created:
```bash
cd /Users/scroobz/Documents/NotOnce/ChopDot
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT id, email, email_confirmed_at, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;"
```

### Step 4: Check Browser Network Tab
1. Open DevTools → Network tab
2. Try to sign up
3. Look for a POST request to `http://127.0.0.1:54321/auth/v1/signup`
4. Check:
   - **Status**: Should be 200
   - **Response**: Should contain `user` object
   - **If 404/500**: Check error message
   - **If blocked/CORS**: Supabase config issue

## Quick Test with Debug Page
We've created a standalone debug tool at `src/debug-supabase.tsx`:
1. Temporarily update your route to load this component
2. Or create a route for it
3. It will show configuration status and allow direct testing

## Expected Behavior After Fix
When email confirmation is disabled:
1. User signs up with email/password
2. User is immediately created in `auth.users` table
3. A session is returned (user is auto-logged in)
4. App should show "Account created successfully! Signing you in..."

## Common Fixes

### Fix 1: Restart Dev Server
```bash
# Stop the current dev server (Ctrl+C)
cd /Users/scroobz/Documents/NotOnce/ChopDot
npm run dev
# or
yarn dev
```

### Fix 2: Clear Browser Cache
- Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear site data in DevTools → Application → Clear storage

### Fix 3: Check Supabase Config
Ensure in `supabase/config.toml`:
```toml
[auth]
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = false  # Important for auto-login
```

### Fix 4: Verify Supabase is Running
```bash
supabase status
# Should show: "supabase local development setup is running"
```

## Testing the Fix
1. Fill out signup form:
   - Email: `test@example.com`
   - Password: `testpass123` (min 8 chars)
   - Accept terms
2. Click "Sign up"
3. Check browser console for `[Signup]` logs
4. Should see success message and auto-login
5. Verify in database:
   ```bash
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT email FROM auth.users WHERE email = 'test@example.com';"
   ```

## Enhanced Logging Added
We've added detailed logging to `SignInScreen.tsx` in the `handleSignupSubmit` function:
- Logs when signup starts
- Logs the full result (data + error)
- Logs user creation success
- Differentiates between auto-confirm and email-confirm flows
- Auto-logs in user if session is returned

## Next Steps
1. **Restart your dev server** (most likely fix)
2. **Try the signup form again**
3. **Check browser console** for the new debug logs
4. **Report back** what you see in the console

If issue persists, share:
- Browser console logs (especially `[SignInScreen]` and `[Signup]` lines)
- Network tab screenshot showing the signup request
- Output of the database query above
