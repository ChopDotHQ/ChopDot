# Fee System Implementation Summary

**Date:** 2025-01-XX  
**Status:** ✅ Complete

## Overview

Implemented a display-only platform fee system with CoinGecko price integration, balance validation, and currency-aware fee calculations. Fees are calculated but **NOT collected** until `VITE_COLLECT_PLATFORM_FEE=1` and `VITE_TREASURY_ADDRESS` is set.

---

## Files Created

### 1. `src/services/prices/coingecko.ts`
- CoinGecko API integration for DOT price fetching
- 5-minute cache to minimize API calls
- Supports USD, CHF, EUR, GBP, JPY
- Graceful fallback if API fails

### 2. `src/utils/platformFee.ts`
- Centralized fee calculation utilities
- DOT-based floor/cap for DOT pots
- Currency-aware formatting
- Display-only (no collection)

### 3. `src/services/backup/crustBackup.ts`
- Placeholder for future Crust/IPFS integration
- Returns fake CID for development
- Ready for real implementation when credentials available

---

## Files Modified

### 1. `src/components/screens/SettleHome.tsx`
- Added CoinGecko price fetching for fiat equivalent display
- Added balance validation: `balance >= amountDot + feeEstimate`
- Updated fee display with platform fee row (when enabled)
- Shows DOT + fiat equivalent for DOT pots: "0.02 DOT (~$0.14)"
- Standardized precision: DOT 6dp, fiat 2dp

### 2. `src/components/SettlementConfirmModal.tsx`
- Updated to use `formatDOT()` for consistent formatting
- Aligned with SettleHome.tsx display standards

---

## Environment Variables

Add these to your `.env` or `.env.local`:

```bash
# Fee System
VITE_SHOW_PLATFORM_FEE=0        # Hide fee line by default (set to 1 to show)
VITE_COLLECT_PLATFORM_FEE=0     # Never collect until treasury exists (set to 1 when ready)
VITE_TREASURY_ADDRESS=          # Empty for now (set SS58-0 address when ready to collect)

# Price API (optional)
VITE_ENABLE_PRICE_API=1         # Enable CoinGecko price fetching (default: 1, set to 0 to disable)

# Existing
VITE_CHAIN_NETWORK=assethub
VITE_SIMULATE_CHAIN=0
```

---

## Runtime Feature Flags (localStorage)

For visual testing, you can set these in browser console:

```javascript
// Platform fee rate (basis points)
localStorage.setItem('flag_SERVICE_FEE_CAP_BPS', '20');   // 0.20%

// Fee floor (minimum fee)
localStorage.setItem('flag_SERVICE_FEE_FLOOR_ABS', '0.02'); // CHF 0.02 or 0.000002 DOT

// Fee cap (maximum fee)
localStorage.setItem('flag_SERVICE_FEE_CAP_ABS', '0.20'); // CHF 0.20 or 0.00002 DOT
```

**Note:** Floor/cap defaults are currency-aware:
- DOT pots: `0.000002` DOT floor, `0.00002` DOT cap
- Fiat pots: `0.02` floor, `0.20` cap

---

## Behavior

### Default State (VITE_SHOW_PLATFORM_FEE=0)
- Platform fee row is **hidden**
- Only network fee is shown
- Clean UI for early testers

### When Enabled (VITE_SHOW_PLATFORM_FEE=1)
- Platform fee row appears
- Shows "• not charged" suffix (since `VITE_COLLECT_PLATFORM_FEE=0`)
- For DOT pots: "App fee (0.20%): 0.02 DOT (~$0.14)"
- For fiat pots: "App fee (0.20%): CHF 0.20"

### Balance Validation
- Checks `balance >= amountDot + feeEstimate` before settlement
- Shows clear error: "Insufficient balance: need ~0.15 DOT (0.10 + 0.05 fee)"
- Prevents failed transactions

### Price API
- Fetches DOT price from CoinGecko (cached 5 minutes)
- Falls back gracefully if API unavailable
- Shows DOT-only if price fetch fails

---

## Fee Calculation Logic

### DOT Pots
1. Calculate fee in DOT: `fee = amountDot × (bps / 10,000)`
2. Apply floor/cap in DOT: `min(max(fee, 0.000002), 0.00002)`
3. Fetch USD price from CoinGecko
4. Display: "0.02 DOT (~$0.14)"

### Fiat Pots
1. Calculate fee in pot currency: `fee = amount × (bps / 10,000)`
2. Apply floor/cap in pot currency: `min(max(fee, 0.02), 0.20)`
3. Display: "CHF 0.20"

---

## Safety Guards

1. **No Collection Without Treasury**: `canCollectPlatformFee()` returns `false` unless both:
   - `VITE_TREASURY_ADDRESS` is set
   - `VITE_COLLECT_PLATFORM_FEE=1`

2. **Balance Validation**: Prevents settlement if insufficient balance

3. **Display-Only**: Fee is calculated but never deducted from settlement amount

4. **Graceful Degradation**: Works even if CoinGecko API fails

---

## Future: When Ready to Collect Fees

1. Set environment variables:
   ```bash
   VITE_TREASURY_ADDRESS=<your-ss58-0-address>
   VITE_COLLECT_PLATFORM_FEE=1
   ```

2. Implement fee routing in `SettleHome.tsx`:
   ```typescript
   if (canCollectPlatformFee()) {
     // Option 1: Batch split
     const batch = api.tx.utility.batchAll([
       api.tx.balances.transferKeepAlive(recipient, recipientAmount),
       api.tx.balances.transferKeepAlive(treasuryAddress, platformFee),
     ]);
     
     // Option 2: Deduct from recipient amount
     // Send (amountDot - platformFee) to recipient
   }
   ```

3. Update UI to remove "• not charged" suffix

---

## Testing

### Manual Tests
1. ✅ DOT settlement works when fee estimate fails (fallback OK)
2. ✅ "Insufficient balance" guard trips if balance < amount + fee
3. ✅ Platform fee line:
   - Appears when `VITE_SHOW_PLATFORM_FEE=1`
   - Shows "not charged" when `VITE_COLLECT_PLATFORM_FEE=0`
   - Disappears when `VITE_SHOW_PLATFORM_FEE=0`
4. ✅ CoinGecko price fetch works (check browser console for cache hits)
5. ✅ Fee display shows DOT + fiat equivalent for DOT pots

### CoinGecko API Limits
- Free tier: 30 calls/minute, 10,000 calls/month
- Cache reduces calls significantly (5-minute cache)
- Falls back gracefully if rate limited

---

## Summary

✅ **Display-only fee system** - Safe, transparent, reversible  
✅ **CoinGecko integration** - Free, cached, graceful fallback  
✅ **Balance validation** - Prevents failed transactions  
✅ **Currency awareness** - DOT and fiat support  
✅ **Future-ready** - Easy to enable collection when treasury is set  

**Nothing in this implementation sends or collects fees. Everything is display-only and transparent.**

