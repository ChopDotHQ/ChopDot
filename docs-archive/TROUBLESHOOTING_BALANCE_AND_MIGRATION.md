# Troubleshooting Guide: Balance Fetching & Pot Migration

## Summary

This document explains the fixes applied to resolve:
1. **Console spam on login screen** - Balance fetching was triggering before user login
2. **Pot migration failures** - Invalid SS58 addresses causing migration errors
3. **WebSocket connection issues** - Balance fetching working correctly when WebSockets are available

## Key Fixes Applied

### 1. Prevented Auto-Reconnect Balance Fetching

**Problem**: Auto-reconnect was triggering balance fetches on the login screen, causing console spam and unnecessary WebSocket connection attempts.

**Solution**: Added `hasExplicitlyLoggedIn` flag to distinguish between auto-reconnect and explicit login.

**Location**: `src/contexts/AccountContext.tsx`

**Key Changes**:
- Added `hasExplicitlyLoggedIn` state flag (line 86)
- Balance polling only starts if `hasExplicitlyLoggedIn === true` (line 464)
- `connectExtension` accepts `isAutoReconnect` parameter to prevent flag setting during auto-reconnect (line 271)
- Auto-reconnect calls `connectExtension(undefined, true)` to skip balance fetching (line 454)

**Pattern**:
```typescript
// Track explicit login vs auto-reconnect
const [hasExplicitlyLoggedIn, setHasExplicitlyLoggedIn] = useState(false);

// Only fetch balance after explicit login
useEffect(() => {
  if (state.status !== 'connected') return;
  if (!hasExplicitlyLoggedIn) return; // Don't fetch from auto-reconnect
  refreshBalance();
}, [state.status, hasExplicitlyLoggedIn]);
```

### 2. Fixed Pot Migration for Invalid Addresses

**Problem**: Old pots had invalid member addresses (empty strings, invalid SS58) causing migration to fail with "Address must be a valid SS58 address" errors.

**Solution**: Enhanced migration to validate and clean up invalid addresses.

**Location**: `src/utils/migratePot.ts`

**Key Changes**:
- Import `isValidSs58Any` validator (line 10)
- Validate addresses during migration (lines 72-101)
- Set invalid addresses to `null` instead of failing

**Pattern**:
```typescript
// Validate and clean addresses during migration
if (typeof address === 'string') {
  const trimmed = address.trim();
  if (trimmed === '' || !isValidSs58Any(trimmed)) {
    member.address = null; // Clean invalid addresses
  } else {
    member.address = trimmed; // Keep valid addresses
  }
}
```

## Current Working State

### ✅ What's Working

1. **Login Flow**: Clean console on login screen - no balance fetching until explicit login
2. **Balance Fetching**: Works correctly after login when WebSockets are available
3. **Pot Migration**: Successfully migrates old pots with invalid addresses
4. **WebSocket Connection**: Connects successfully when not blocked (see logs: `✅ WebSocket connected`)

### ⚠️ Expected Warnings (Safe to Ignore)

1. **Polkadot API Warnings**: 
   - `RPC methods not decorated` - Normal, these are optional RPC methods
   - `Not decorating runtime apis without matching versions` - Normal version mismatch warnings
   - `Not decorating unknown runtime apis` - Normal for custom runtime APIs

2. **WebSocket Blocking**: 
   - If you see `ApiPromise.create() hung` errors, WebSockets are blocked by browser extensions/firewall
   - This is an environmental issue, not a code issue
   - Balance will show once WebSockets are unblocked

## Console Log Flow (Normal Operation)

```
1. [LoginScreen] Account status changed: {status: 'disconnected'}
2. web3Enable: Enabled extensions
3. [LoginScreen] Account status changed: {status: 'connecting'}
4. [Chain Service] Attempting to connect to RPC...
5. [Chain Service] ✅ WebSocket connected
6. [LoginScreen] Account status changed: {status: 'connected'}
7. [Account] Refreshing balance...
8. [Chain] Balance query successful: {balance: '84419564355'}
9. [Account] Balance refreshed: {balanceHuman: '8.4419564355'}
10. [LocalStorageSource] Migrated pots to current schema
```

## Troubleshooting Checklist

### If balance is not showing:

1. **Check WebSocket connection**:
   - Look for `✅ WebSocket connected` in console
   - If missing, check for `ApiPromise.create() hung` errors
   - **Fix**: Disable browser extensions, try incognito mode, check firewall

2. **Check explicit login flag**:
   - Balance only fetches after explicit login (clicking "Connect")
   - Auto-reconnect won't fetch balance (by design)
   - **Fix**: Click "Connect" button on login screen

3. **Check RPC endpoint**:
   - Look for `✅ Connected to Asset Hub RPC` in console
   - If all endpoints fail, WebSockets are blocked
   - **Fix**: See WebSocket blocking troubleshooting above

### If pot migration fails:

1. **Check address validation**:
   - Migration now cleans invalid addresses automatically
   - Invalid addresses are set to `null` instead of failing
   - **Fix**: Should be automatic, but check `migratePot.ts` if issues persist

2. **Check console for specific errors**:
   - Look for `Failed to migrate pot at index X` warnings
   - Check which field is causing the issue
   - **Fix**: Update migration logic in `migratePot.ts` to handle the specific case

## Key Files to Check

- **Balance Fetching**: `src/contexts/AccountContext.tsx`
  - Lines 84-86: `hasExplicitlyLoggedIn` flag
  - Lines 461-466: Balance polling guard
  - Lines 170-273: `connectExtension` with `isAutoReconnect` parameter

- **Pot Migration**: `src/utils/migratePot.ts`
  - Lines 72-101: Address validation and cleanup
  - Lines 153-174: `migrateAllPotsOnLoad` error handling

- **WebSocket Connection**: `src/services/chain/polkadot.ts`
  - Lines 50-138: RPC connection logic with fallbacks
  - Lines 295-313: Balance query with retry logic

## Future Considerations

1. **WebSocket Blocking**: Consider adding a user-friendly message when WebSockets are blocked
2. **Migration**: Continue to enhance migration to handle edge cases as they arise
3. **Balance Polling**: Consider reducing polling frequency or making it configurable
4. **Error Handling**: Add more graceful degradation when RPC endpoints are unavailable

