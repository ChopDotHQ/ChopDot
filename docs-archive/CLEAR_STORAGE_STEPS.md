# Clear Storage & Verify User Steps

## Steps to Complete:

### 1. ✅ Dev Server
- **Stopped** and **restarted** - Ready at http://localhost:5173

### 2. Clear Browser Storage (You need to do this):
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab
3. In left sidebar, click **Storage**
4. Click **Clear site data** button (or expand "Clear storage")
5. Check **all boxes**:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
   - ✅ Local Storage
   - ✅ Session Storage
   - ✅ IndexedDB
6. Click **Clear site data**
7. **Close that tab**

### 3. Open Fresh Tab:
- Open a **new tab** (or incognito window)
- Navigate to: **http://localhost:5173**

### 4. Log In:
- Log in with your account (wallet or email)

### 5. Verify Current User (Run in Console):
```javascript
const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('auth-token'));
const token = key && JSON.parse(localStorage.getItem(key)).access_token;
fetch('https://jpzacnkirymlyxwmafox.supabase.co/auth/v1/user', { 
  headers: { Authorization: `Bearer ${token}` } 
})
  .then(r => r.json())
  .then(u => console.log('current user:', u.id, u.email));
```

### 6. Check Results:
- After login, **only your pots should load**
- If it still auto-reloads your sister's pot, check what `current user:` logs show
- Share the user ID and email that gets logged

---

**Note:** The dev server is already restarted and ready. Just complete steps 2-6 in your browser.
