# Currency Plan Review & USDC Implementation Plan

**Date:** December 2024  
**Status:** Review & Implementation Plan

---

## Current Currency Implementation

### Supported Currencies

| Currency | Type | Status | On-Chain Support |
|----------|------|--------|------------------|
| USD | Fiat | ✅ Full | ❌ Display only |
| EUR | Fiat | ✅ Full | ❌ Display only |
| GBP | Fiat | ✅ Full | ❌ Display only |
| CHF | Fiat | ✅ Full | ❌ Display only |
| JPY | Fiat | ✅ Full | ❌ Display only |
| DOT | Crypto | ✅ Full | ✅ Asset Hub |
| USDC | Crypto | ⚠️ Partial | ❌ Not implemented |

### Current Implementation Details

#### 1. Schema & Types (`src/schema/pot.ts`)
- ✅ `BASE_CURRENCIES` includes `USDC`
- ✅ `BaseCurrencySchema` validates USDC
- ✅ Pot schema accepts `baseCurrency: 'USDC'`

#### 2. Price & Conversion (`src/services/prices/`)
- ✅ `coingecko.ts` fetches USDC prices
- ✅ `currencyService.ts` handles USDC ↔ fiat conversions
- ✅ `types.ts` includes `USDC` in `CRYPTO_CURRENCY_CODES`

#### 3. Display & Formatting (`src/utils/platformFee.ts`)
- ✅ `formatFiat()` handles USDC: `"USDC 123.45"`
- ✅ `getCurrencySymbol()` returns `"USDC "` for USDC
- ✅ Platform fee calculation supports USDC

#### 4. UI Components
- ✅ `CreatePot.tsx` includes USDC in currency dropdown
- ✅ `YouTab.tsx` includes USDC in currency preference
- ✅ `Settings.tsx` supports USDC selection

#### 5. Settlement Flow (`src/components/screens/SettleHome.tsx`)
- ⚠️ **USDC pots can be created but settlements default to fiat methods**
- ❌ No on-chain USDC transfer implementation
- ❌ No USDC balance checking
- ❌ No USDC fee estimation

---

## Gap Analysis: USDC On-Chain Support

### What's Missing

1. **Chain Service (`src/services/chain/polkadot.ts`)**
   - ❌ No `sendUsdc()` function
   - ❌ No USDC balance query (`getUsdcBalance()`)
   - ❌ No USDC fee estimation (`estimateUsdcFee()`)
   - ✅ DOT implementation exists as reference

2. **Settlement Flow (`src/components/screens/SettleHome.tsx`)**
   - ❌ USDC pots don't show "DOT" settlement option (should show "USDC")
   - ❌ No USDC transfer execution
   - ❌ No USDC transaction history tracking

3. **Expenses Tab (`src/components/screens/ExpensesTab.tsx`)**
   - ❌ USDC pots don't trigger Asset Hub connection
   - ❌ Settlement modal only supports DOT amounts

4. **Pot History (`src/schema/pot.ts`)**
   - ⚠️ `PotHistory` schema supports `amountDot` but not `amountUsdc`
   - ⚠️ History entries need to track asset type

---

## USDC on Polkadot Asset Hub: Technical Details

### Asset Hub USDC Information

- **Asset ID:** `1337` (native USDC on Polkadot Asset Hub)
- **Decimals:** `6` (same as Ethereum USDC)
- **Pallet:** `assets`
- **Extrinsic:** `assets.transfer(assetId, target, amount)`
- **Status:** ✅ Native USDC available since September 2023
- **Ecosystem:** Over $490M USDC/USDT circulating on Polkadot

### API Differences: DOT vs USDC

| Feature | DOT | USDC |
|---------|-----|------|
| **Pallet** | `balances` | `assets` |
| **Extrinsic** | `balances.transferKeepAlive(to, amount)` | `assets.transfer(assetId, to, amount)` |
| **Balance Query** | `api.query.system.account(address)` | `api.query.assets.account(assetId, address)` |
| **Decimals** | `10` (Asset Hub) | `6` |
| **Asset ID** | N/A (native) | `1337` |

---

## Implementation Plan

### Phase 1: Core Chain Service (High Priority)

#### 1.1 Update Adapter Interface
**File:** `src/services/chain/adapter.ts`

Add USDC types to the interface:

```typescript
export type SendUsdcArgs = {
  from: string;
  to: string;
  amountUsdc: number; // 6 decimals
  onStatus?: (s: TxStatus, ctx?: { txHash?: string; blockHash?: string }) => void;
  forceBrowserExtension?: boolean;
};

export type EstimateUsdcFeeArgs = {
  from: string;
  to: string;
  amountUsdc: number;
};

export interface PolkadotChainService {
  // ... existing methods ...
  
  // USDC methods
  getUsdcBalance: (address: string) => Promise<string>; // Returns USDC balance in smallest unit (6 decimals)
  estimateUsdcFee: (args: EstimateUsdcFeeArgs) => Promise<string>; // Returns fee in planck
  sendUsdc: (args: SendUsdcArgs) => Promise<{ txHash: string; finalizedBlock?: string }>;
}
```

#### 1.2 Add USDC Constants
**File:** `src/services/chain/polkadot.ts`

Add at the top of the file:

```typescript
const USDC_ASSET_ID = 1337;
const USDC_DECIMALS = 6;
```

#### 1.3 Implement USDC Transfer Function
**File:** `src/services/chain/polkadot.ts`

Add to `polkadotChainService` object:

```typescript
const sendUsdc = async ({ 
  from, 
  to, 
  amountUsdc, 
  onStatus, 
  forceBrowserExtension = false 
}: SendUsdcParams): Promise<SendUsdcResult> => {
  return signAndSendExtrinsic({
    from,
    onStatus,
    forceBrowserExtension,
    buildTx: ({ api }) => {
      // Convert USDC amount to smallest unit (6 decimals)
      const value = toPlanckString(amountUsdc, USDC_DECIMALS);
      const toNorm = normalizeToPolkadot(to);
      // Use assets pallet instead of balances pallet
      return api.tx.assets.transfer(USDC_ASSET_ID, toNorm, value);
    },
  });
};
```

#### 1.4 Implement USDC Balance Query
**File:** `src/services/chain/polkadot.ts`

Add to `polkadotChainService` object:

```typescript
const getUsdcBalance = async (address: string): Promise<string> => {
  try {
    const api = await getApi(120000);
    await api.isReady;
    const normalized = normalizeToPolkadot(address);
    // Query assets.account - returns Option<PalletAssetsAssetAccount>
    const accountData = await api.query.assets.account(USDC_ASSET_ID, normalized);
    
    // Handle Option type: accountData.isSome indicates if account exists
    if (accountData && accountData.isSome) {
      const assetAccount = accountData.unwrap();
      // assetAccount.balance is Compact<u128>
      return assetAccount.balance.toString();
    }
    
    // Account doesn't hold this asset
    return '0';
  } catch (error) {
    console.error('[Chain] getUsdcBalance error:', error);
    throw error;
  }
};
```

**Note:** The `assets.account` query returns an `Option` type. We must check `isSome` and call `unwrap()` to access the balance. If the account doesn't hold the asset, it returns `None` (which we handle by returning '0').

#### 1.5 Implement USDC Fee Estimation
**File:** `src/services/chain/polkadot.ts`

Add to `polkadotChainService` object:

```typescript
const estimateUsdcFee = async ({ 
  from, 
  to, 
  amountUsdc 
}: { 
  from: string; 
  to: string; 
  amountUsdc: number 
}): Promise<string> => {
  try {
    const api = await getApi();
    await api.isReady;
    const value = toPlanckString(amountUsdc, USDC_DECIMALS);
    const toNorm = normalizeToPolkadot(to);
    const tx = api.tx.assets.transfer(USDC_ASSET_ID, toNorm, value);
    
    try {
      const info = await api.rpc.payment.queryInfo(tx, from);
      return info.partialFee.toString();
    } catch {
      // Conservative fallback: ~0.001 DOT (1000000000 planck on Asset Hub)
      return '1000000000';
    }
  } catch {
    return '1000000000';
  }
};
```

#### 1.6 Export USDC Functions
**File:** `src/services/chain/polkadot.ts`

Add to the return object:

```typescript
return {
  // ... existing exports ...
  getUsdcBalance,
  estimateUsdcFee,
  sendUsdc,
};
```

#### 1.7 Update Sim Chain (for testing)
**File:** `src/services/chain/sim.ts`

Add mock implementations to `simChain` object:

```typescript
async getUsdcBalance(_address: string): Promise<string> {
  // Mock: 100 USDC in smallest unit (6 decimals = 100000000)
  if (typeof window !== 'undefined') {
    const ls = window.localStorage.getItem('mock_usdc_balance');
    if (ls) return ls;
  }
  return '100000000'; // 100 USDC (100 * 10^6)
},

async estimateUsdcFee(_args: EstimateUsdcFeeArgs): Promise<string> {
  // Mock: Small fixed fee (0.001 DOT = 1000000000 planck on Asset Hub with 10 decimals)
  return '1000000000';
},

async sendUsdc({ from, onStatus }: SendUsdcArgs): Promise<SendUsdcResult> {
  // Mock implementation - delegate to signAndSendExtrinsic lifecycle
  return this.signAndSendExtrinsic({
    buildTx: () => ({}), // Not used in sim
    from,
    onStatus,
  });
},
```

**Note:** The sim chain should match the real implementation pattern by delegating to `signAndSendExtrinsic` for consistent lifecycle handling.

### Phase 2: Settlement Flow Updates

#### 2.1 Update SettleHome Component
**File:** `src/components/screens/SettleHome.tsx`

**Current State:** 
- ✅ Already detects USDC pots (line 172: `normalizedBaseCurrency === 'USDC'`)
- ✅ Already handles USDC in conversion logic
- ❌ Missing: USDC settlement option and execution

**Changes Needed:**

1. **Detect USDC pots for settlement:**
   ```typescript
   const isUsdcPot = normalizedBaseCurrency === 'USDC';
   const isDotPot = normalizedBaseCurrency === 'DOT';
   ```

2. **Show "USDC" settlement method option** (similar to DOT):
   - Add USDC to settlement method options when `isUsdcPot` is true
   - Display USDC balance check (similar to DOT balance check)

3. **Update settlement execution:**
   ```typescript
   if (selectedMethod === 'dot' && isDotPot) {
     // Existing DOT logic
     await chain.sendDot({ ... });
   } else if (selectedMethod === 'dot' && isUsdcPot) {
     // NEW: USDC settlement
     await chain.sendUsdc({ 
       from: account.address0,
       to: recipientAddress,
       amountUsdc: totalAmount,
       onStatus: handleStatus
     });
   }
   ```

4. **Update fee estimation:**
   ```typescript
   const feeEstimate = isUsdcPot 
     ? await chain.estimateUsdcFee({ from, to, amountUsdc: totalAmount })
     : await chain.estimateFee({ from, to, amountDot: totalAmount });
   ```

#### 2.2 Update ExpensesTab Component
**File:** `src/components/screens/ExpensesTab.tsx`

- Trigger Asset Hub connection for USDC pots (similar to DOT)
- Update settlement modal to support USDC amounts
- Handle USDC transaction history

### Phase 3: Schema & History Updates

#### 3.1 Extend PotHistory Schema
**File:** `src/schema/pot.ts`

**Current Schema (line 92-102):**
```typescript
const OnchainSettlementHistorySchema = PotHistoryBaseSchema.extend({
  type: z.literal('onchain_settlement'),
  fromMemberId: z.string(),
  toMemberId: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(),
  amountDot: z.string(), // Currently required, only for DOT
  txHash: z.string(),
  // ...
});
```

**Updated Schema:**
```typescript
const OnchainSettlementHistorySchema = PotHistoryBaseSchema.extend({
  type: z.literal('onchain_settlement'),
  fromMemberId: z.string(),
  toMemberId: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(),
  // Support both DOT and USDC (at least one must be present)
  amountDot: z.string().optional(),
  amountUsdc: z.string().optional(),
  assetId: z.number().optional(), // 1337 for USDC, undefined/null for DOT
  txHash: z.string(),
  subscan: z.string().optional(),
  note: z.string().optional(),
}).refine(
  (data) => data.amountDot !== undefined || data.amountUsdc !== undefined,
  { message: 'Either amountDot or amountUsdc must be provided' }
);
```

**Migration Note:** Existing DOT settlements will continue to work since `amountDot` remains optional but will be present for legacy entries. New USDC settlements will use `amountUsdc` and `assetId: 1337`.

#### 3.2 Update History Display
- Display USDC amounts correctly in settlement history
- Show asset type in transaction details

### Phase 4: UI/UX Enhancements

#### 4.1 Currency Selection
- ✅ Already implemented in `CreatePot.tsx`
- Consider adding USDC balance display in wallet banner

#### 4.2 Settlement Confirmation
- Show USDC amount and equivalent USD value
- Display USDC transaction hash and Subscan link

---

## Testing Checklist

### Unit Tests
- [ ] `sendUsdc()` function
- [ ] `getUsdcBalance()` function
- [ ] `estimateUsdcFee()` function
- [ ] USDC amount formatting (6 decimals)

### Integration Tests
- [ ] Create USDC pot
- [ ] Add expenses to USDC pot
- [ ] Initiate USDC settlement
- [ ] Verify USDC balance updates
- [ ] Check transaction history

### Edge Cases
- [ ] Insufficient USDC balance
- [ ] USDC transfer with insufficient DOT for fees
- [ ] USDC settlement with zero balance
- [ ] USDC asset ID changes (future-proofing)

---

## Migration Considerations

### Existing USDC Pots
- ✅ No migration needed for display-only USDC pots
- ⚠️ Existing USDC pots will gain settlement capability after implementation

### Backward Compatibility
- ✅ DOT settlements continue to work
- ✅ Fiat settlements unchanged
- ✅ USDC display/conversion already working

---

## Future Enhancements

### Potential Additions
1. **Multi-Asset Support**
   - Support other Asset Hub assets (USDT, etc.)
   - Generic `sendAsset(assetId, ...)` function

2. **Cross-Chain USDC**
   - Support USDC from other chains via XCM
   - Bridge integration for cross-chain settlements

3. **USDC Yield**
   - Integrate with DeFi protocols for USDC yield
   - Similar to DOT savings pots

4. **Price Stability**
   - Show USDC/USD peg status
   - Alert if USDC depegs significantly

---

## References

- [Circle: USDC on Polkadot Asset Hub](https://www.circle.com/blog/now-available-usdc-on-polkadot-asset-hub)
- [Polkadot Asset Hub Documentation](https://support.polkadot.network/support/solutions/articles/65000181800-what-is-asset-hub-and-how-do-i-use-it-)
- [Polkadot.js Assets Pallet](https://polkadot.js.org/docs/asset-hub-polkadot/extrinsics/)

---

## Documentation Verification

**Verified Against Codebase (December 2024):**

✅ **Technical Details Confirmed:**
- Asset Hub DOT decimals: `10` (confirmed in `config.ts`)
- USDC Asset ID: `1337` (from web research)
- USDC decimals: `6` (standard for USDC)
- `assets.account` returns `Option<PalletAssetsAssetAccount>` (must unwrap)
- `SettleHome.tsx` already checks for USDC in conversion logic (line 172)
- `PotHistory` schema currently only supports `amountDot` (needs extension)

✅ **Code Structure Verified:**
- `polkadot.ts` uses `signAndSendExtrinsic` pattern (matches implementation plan)
- `sim.ts` delegates to `signAndSendExtrinsic` for lifecycle (pattern confirmed)
- `adapter.ts` defines interface types (needs USDC types added)
- `toPlanckString` utility exists and accepts decimals parameter

✅ **Existing USDC Support Confirmed:**
- Schema includes USDC in `BASE_CURRENCIES`
- Price conversion supports USDC ↔ fiat and USDC ↔ DOT
- UI components include USDC in dropdowns
- Formatting functions handle USDC display

---

## Summary

**Current State:**
- ✅ USDC is fully supported for display, conversion, and pot creation
- ❌ USDC on-chain settlements are NOT implemented
- ⚠️ USDC pots exist but can only use fiat settlement methods
- ✅ `SettleHome` already has USDC detection for conversions (needs settlement logic)

**Implementation Priority:**
1. **High:** Core chain service functions (`sendUsdc`, `getUsdcBalance`, `estimateUsdcFee`)
2. **High:** Settlement flow updates (`SettleHome`, `ExpensesTab`)
3. **Medium:** Schema updates for USDC history tracking
4. **Low:** UI enhancements and balance displays

**Estimated Effort:**
- Phase 1 (Core): ~4-6 hours
- Phase 2 (Settlement): ~3-4 hours
- Phase 3 (Schema): ~2 hours
- Phase 4 (UI): ~2 hours
- **Total:** ~11-14 hours

**Ready for Implementation:** ✅ Yes - All technical details verified and code examples match codebase patterns.
