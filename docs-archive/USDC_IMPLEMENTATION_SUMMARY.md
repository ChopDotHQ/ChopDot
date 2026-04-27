# USDC Implementation Summary

**Quick Reference:** Currency plan review and USDC on-chain settlement implementation guide.

---

## Current Status

✅ **USDC is supported for:**
- Pot creation (users can create USDC pots)
- Display & formatting (`USDC 123.45`)
- Price conversion (USDC ↔ fiat, USDC ↔ DOT)
- Currency preference selection

❌ **USDC is NOT supported for:**
- On-chain settlements (no `sendUsdc()` function)
- Balance checking (no `getUsdcBalance()`)
- Fee estimation for USDC transfers

---

## Key Technical Details

### Asset Hub USDC
- **Asset ID:** `1337`
- **Decimals:** `6` (same as Ethereum USDC)
- **Pallet:** `assets` (not `balances`)
- **Extrinsic:** `api.tx.assets.transfer(1337, to, amount)`
- **Status:** ✅ Native USDC available since Sept 2023

### Implementation Differences

| Feature | DOT | USDC |
|---------|-----|------|
| Pallet | `balances` | `assets` |
| Extrinsic | `balances.transferKeepAlive()` | `assets.transfer(assetId, ...)` |
| Balance Query | `system.account()` | `assets.account(assetId, ...)` |
| Decimals | `10` | `6` |

---

## Implementation Steps

### 1. Chain Service (`src/services/chain/`)

**Files to modify:**
- `adapter.ts` - Add USDC types to interface
- `polkadot.ts` - Implement `sendUsdc()`, `getUsdcBalance()`, `estimateUsdcFee()`
- `sim.ts` - Add mock implementations for testing

**Key code:**
```typescript
// Constants
const USDC_ASSET_ID = 1337;
const USDC_DECIMALS = 6;

// Transfer
api.tx.assets.transfer(USDC_ASSET_ID, toAddress, amountInSmallestUnit)

// Balance (returns Option type - must unwrap)
const accountData = await api.query.assets.account(USDC_ASSET_ID, address);
const balance = accountData?.isSome ? accountData.unwrap().balance.toString() : '0';
```

### 2. Settlement Flow (`src/components/screens/`)

**Files to modify:**
- `SettleHome.tsx` - Detect USDC pots, show USDC settlement option
- `ExpensesTab.tsx` - Support USDC in settlement modal

**Key changes:**
- Check: `const isUsdcPot = normalizedBaseCurrency === 'USDC';` (already partially implemented)
- Add USDC settlement method option when `isUsdcPot` is true
- Call: `chain.sendUsdc()` instead of `chain.sendDot()` for USDC settlements
- Use: `estimateUsdcFee()` for fee display
- Handle USDC balance checks (similar to DOT balance checks)

### 3. Schema Updates (`src/schema/pot.ts`)

**Extend `PotHistory` to support USDC:**
```typescript
amountDot: z.string().optional(),
amountUsdc: z.string().optional(),
assetId: z.number().optional(), // 1337 for USDC
```

---

## Testing Checklist

- [ ] Create USDC pot
- [ ] Check USDC balance display
- [ ] Initiate USDC settlement
- [ ] Verify transaction succeeds
- [ ] Check transaction history shows USDC
- [ ] Test insufficient balance error
- [ ] Test insufficient DOT for fees error

---

## Estimated Effort

- **Phase 1 (Chain Service):** 4-6 hours
- **Phase 2 (Settlement Flow):** 3-4 hours  
- **Phase 3 (Schema):** 2 hours
- **Phase 4 (UI):** 2 hours
- **Total:** ~11-14 hours

---

## Full Documentation

See `docs/CURRENCY_PLAN_REVIEW.md` for complete implementation details, code examples, and edge case handling.
