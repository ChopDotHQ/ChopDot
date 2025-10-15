# Performance Diagnostic Guide

## Issue: 10-15 Minute Load Time

This should **NEVER** happen. Here's how to diagnose:

## Step 1: Check localStorage Size

Open browser console (F12) and run:

```javascript
window.ChopDot.checkStorageSize()
```

**Expected output:**
```
📊 [Debug] Storage size check:
  chopdot_user: 0.15 KB
  chopdot_auth_token: 0.05 KB
  chopdot_pots: 2.3 KB
  chopdot_settlements: 0.8 KB
  chopdot_notifications: 0.5 KB
  Total: 3.8 KB
  Estimated quota used: 0.1%
```

**🚨 If ANY item is > 100 KB, that's the problem!**

## Step 2: Diagnose Performance

```javascript
window.ChopDot.diagnosePerformance()
```

**Look for:**
- ⚠️ HIGH: `xxx` expenses may cause slowdown
- ⚠️ WARNING: `xxx` is very large!

## Step 3: Nuclear Fix (If Frozen)

If the app won't load at all:

```javascript
window.ChopDot.emergencyFix()
```

Then reload the page.

## Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Look for requests taking > 1 second

**ChopDot has NO backend API calls** - everything is localStorage!
If you see slow network requests, something is wrong.

## Root Causes (Ranked by Likelihood)

### 1. Corrupted localStorage (MOST LIKELY)
**Symptom:** 10-15 minute hang, no errors
**Fix:** Run `window.ChopDot.emergencyFix()`

### 2. Massive Data in localStorage
**Symptom:** Gradual slowdown over time
**Fix:** Run `window.ChopDot.archiveOldExpenses()`

### 3. Browser Extension Conflict
**Symptom:** Works in incognito, fails in normal mode
**Fix:** Disable extensions one by one

### 4. Memory Leak
**Symptom:** Gets slower over time without page refresh
**Fix:** Check DevTools > Performance > Memory

## Quick Fixes

### Clear All Data (Safe)
```javascript
window.ChopDot.clearAll()
// Then reload page
```

### Clear Only App Data (Keep Auth)
```javascript
window.ChopDot.clearAppData()
// Then reload page
```

### Force Fresh Start
```javascript
window.ChopDot.emergencyFix()
// Then reload page
```

## What Was Fixed Today

### ✅ Removed Excessive Logging
- Auth check logs removed (was noisy but harmless)
- Debug helpers now silent on load
- Only errors logged

### ✅ Optimized localStorage Loading
- Changed from async timeouts to synchronous (faster!)
- Added size checks before parsing
- Added lazy state initialization to prevent double calculation

### ✅ Fixed Potential Double-Render Issue
- All useState now uses lazy initialization: `useState(() => initialValue)`
- This prevents expensive calculations on every render

## Expected Load Time

**Target:** < 100ms on modern browsers
**Acceptable:** < 500ms on slower devices
**NEVER:** > 1 second

If you're seeing 10-15 minutes, **something is seriously wrong** - likely:
1. Corrupted localStorage data
2. Browser/extension conflict
3. System resource issue

## Need Help?

1. Run `window.ChopDot.diagnosePerformance()`
2. Share the console output
3. Check browser DevTools > Performance tab
4. Record a performance profile if still slow
