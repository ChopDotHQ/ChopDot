# Clear All ChopDot Storage

## The Problem
The app loads pots from localStorage FIRST, before checking Supabase. Even after clearing storage via DevTools, the app might have re-saved pots or there's still data.

## Solution: Run This in Console

Open Chrome DevTools Console and run this to clear ALL ChopDot-related data:

```javascript
// Clear all ChopDot localStorage keys
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (
    key.startsWith('chopdot_') || 
    key.startsWith('sb-') ||
    key.startsWith('flag_') ||
    key.includes('supabase')
  )) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => {
  console.log('Removing:', key);
  localStorage.removeItem(key);
});
console.log(`✅ Cleared ${keysToRemove.length} keys`);

// Also clear sessionStorage
const sessionKeys = [];
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  if (key && (key.startsWith('chopdot_') || key.startsWith('sb-'))) {
    sessionKeys.push(key);
  }
}
sessionKeys.forEach(key => sessionStorage.removeItem(key));
console.log(`✅ Cleared ${sessionKeys.length} session keys`);

// Reload page
console.log('🔄 Reloading page...');
location.reload();
```

## After Reload

1. **Log in fresh** with your account (wallet or email)
2. **Verify auth** by running:
```javascript
const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('auth-token'));
if (!key) {
  console.error('❌ No auth token found - you are not logged in');
} else {
  const token = JSON.parse(localStorage.getItem(key)).access_token;
  fetch('https://jpzacnkirymlyxwmafox.supabase.co/auth/v1/user', { 
    headers: { Authorization: `Bearer ${token}` } 
  })
    .then(r => r.json())
    .then(u => {
      if (u.id) {
        console.log('✅ Logged in as:', u.id, u.email);
      } else {
        console.error('❌ Auth failed:', u);
      }
    });
}
```

3. **Check what pots load** - should only be YOUR pots from Supabase

## If Still Seeing Wrong Pots

Check if `VITE_DATA_SOURCE=supabase` is set. If not, the app will use localStorage.

Run in console:
```javascript
console.log('Data source:', import.meta.env.VITE_DATA_SOURCE);
```

If it's not 'supabase', the app is using localStorage mode, which is why you see your sister's pots.
