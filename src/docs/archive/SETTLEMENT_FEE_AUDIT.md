# ChopDot Settlement Fee Audit Report

**Date:** 2025-01-XX  
**Scope:** Complete audit of fee computation, estimation, display, and routing in ChopDot's settlement flow

---

## 1. FEE COMPUTATION

### 1.1 Service Fee (Platform Fee)

**Location:** `src/components/screens/SettleHome.tsx:840-851`

**Formula:**
```typescript
const bps = Math.max(0, Number(SERVICE_FEE_CAP_BPS) || 0);
const serviceFee = Math.max(0, Math.abs(totalAmount)) * (bps / 10_000);
const servicePct = (bps / 100).toFixed(2);
```

**Details:**
- **Rate:** Configurable via `SERVICE_FEE_CAP_BPS` feature flag (default: 250 BPS = 2.5%)
- **Calculation:** `serviceFee = |totalAmount| × (bps / 10,000)`
- **Display Currency:** Always shown in USD (hardcoded)
- **Rounding:** Service fee displayed with 2 decimal places (`toFixed(2)`)
- **Floor:** `Math.max(0, ...)` ensures non-negative values
- **Cap:** Controlled by `SERVICE_FEE_CAP_BPS` flag (no additional cap logic)

**Key Observation:** Service fee is **calculated but NOT collected**. It's displayed for informational purposes only. No code routes this fee to a treasury address or splits the settlement transaction.

### 1.2 Network Fee (DOT Transaction Fee)

**Location:** `src/services/chain/polkadot.ts:331-348`

**Estimation Method:**
```typescript
const estimateFee = async ({ from, to, amountDot }: { from: string; to: string; amountDot: number }): Promise<string> => {
  try {
    const config = getConfig();
    const api = await getApi();
    const value = toPlanckString(amountDot, config.decimals);
    const toNorm = normalizeToPolkadot(to);
    const tx = api.tx.balances.transferKeepAlive(toNorm, value);

    try {
      const info = await api.rpc.payment.queryInfo(tx, from);
      return info.partialFee.toString();
    } catch {
      return '10000000'; // 0.01 DOT as conservative fallback
    }
  } catch {
    return '10000000';
  }
};
```

**Details:**
- **Method:** Uses Polkadot RPC `payment.queryInfo` to estimate `partialFee` (in Planck)
- **Fallback:** `10000000` Planck (0.01 DOT) if estimation fails
- **Conversion:** Planck → DOT: `feeDot = parseFloat(feePlanck) / Math.pow(10, config.decimals)` (10 decimals)
- **Display Precision:** 4 decimal places in summary (`toFixed(4)`), 6 decimal places in total (`toFixed(6)`)

**Simulation Mode:** `src/services/chain/sim.ts:65-68`
- Returns fixed `'100000000'` Planck (0.01 DOT) for UI display

---

## 2. NETWORK FEE ESTIMATION

### 2.1 Real Chain Estimation

**File:** `src/services/chain/polkadot.ts:331-348`

**Flow:**
1. Builds `balances.transferKeepAlive` extrinsic with normalized addresses
2. Calls `api.rpc.payment.queryInfo(tx, from)` to get `partialFee`
3. Returns fee in Planck (string)
4. Converted to DOT in UI: `feeDot = parseFloat(feePlanck) / 1e10`

**Error Handling:**
- Falls back to `'10000000'` Planck (0.01 DOT) on any error
- No retry logic
- No FX/cross-chain add-ons (settlements are same-chain only)

### 2.2 Fee Estimation Trigger

**File:** `src/components/screens/SettleHome.tsx:131-153`

**Trigger Conditions:**
- `selectedMethod === 'dot'` AND `walletConnected === true`
- Automatically runs when DOT method is selected and wallet connects
- Resets fee state when method changes or wallet disconnects

**State Management:**
- `feeEstimate: number | null` - Estimated fee in DOT
- `feeLoading: boolean` - Loading state
- `feeError: boolean` - Error state

### 2.3 Fee Estimation in Confirmation Modal

**File:** `src/components/SettlementConfirmModal.tsx:34-57`

**Details:**
- Estimates fee when modal opens (`useEffect` on `isOpen`)
- Uses same `polkadotChainService.estimateFee()` method
- Displays fee with 6 decimal precision
- Shows "Fee unavailable" on error

---

## 3. SETTLEMENT TX BUILD/SEND

### 3.1 Extrinsic Building

**File:** `src/services/chain/polkadot.ts:317-329`

**Code:**
```typescript
const sendDot = async ({ from, to, amountDot, onStatus, forceBrowserExtension = false }: SendDotParams): Promise<SendDotResult> => {
  const config = getConfig();
  return signAndSendExtrinsic({
    from,
    onStatus,
    forceBrowserExtension,
    buildTx: ({ api }) => {
      const value = toPlanckString(amountDot, config.decimals);
      const toNorm = normalizeToPolkadot(to);
      return api.tx.balances.transferKeepAlive(toNorm, value);
    },
  });
};
```

**Details:**
- **Extrinsic Type:** `balances.transferKeepAlive` (keeps account alive, prevents reaping)
- **Amount Conversion:** `toPlanckString(amountDot, config.decimals)` converts DOT to Planck
- **Address Normalization:** `normalizeToPolkadot(to)` ensures SS58-0 format
- **No Batch Operations:** Single transfer, no `batchAll` or split transfers
- **No Platform Fee Routing:** Service fee is NOT deducted or routed to treasury

### 3.2 Transaction Execution

**File:** `src/components/screens/SettleHome.tsx:228-256`

**Flow:**
1. Calls `chain.sendDot()` with `from`, `to`, `amountDot`
2. Status callbacks update `TxToast` component:
   - `submitted` → `broadcast`
   - `inBlock` → shows txHash + fee estimate
   - `finalized` → shows final fee estimate
3. Fee estimate passed to toast: `fee: feeEstimate || 0.0024`

**Key Observation:** The actual network fee is paid by the sender (deducted automatically by Polkadot), but the **estimated fee is only displayed, not deducted from the settlement amount**. The full `amountDot` is sent to the recipient.

### 3.3 Cross-Chain Considerations

**File:** `src/services/bridge/hyperbridge.ts`

**Details:**
- Hyperbridge integration exists for **topping up DOT** (not for settlements)
- Used when user has insufficient DOT balance
- No fee routing or FX conversion in settlement flow
- Settlements are **same-chain only** (Polkadot Asset Hub)

---

## 4. ENV/CONSTANTS

### 4.1 Environment Variables

| Variable | Default | Purpose | Location |
|----------|---------|---------|----------|
| `VITE_SIMULATE_CHAIN` | `undefined` | Enable simulation mode (mock chain) | `src/services/chain/index.ts:5` |
| `VITE_CHAIN_NETWORK` | `'assethub'` | Active chain network | `src/services/chain/config.ts` |

**No fee-related environment variables found:**
- ❌ No `VITE_TREASURY_ADDRESS`
- ❌ No `VITE_PLATFORM_FEE_BPS`
- ❌ No `VITE_FEE_COLLECT_ENABLED`
- ❌ No `VITE_SHOW_PLATFORM_FEE`

### 4.2 Feature Flags (Runtime)

**File:** `src/utils/flags.ts:76-90`

**Flag:** `SERVICE_FEE_CAP_BPS`
- **Type:** `number`
- **Default:** `250` (2.5%)
- **Storage:** localStorage (`flag_SERVICE_FEE_CAP_BPS`)
- **Validation:** Integer ≥ 0, falls back to 250 if invalid
- **Usage:** Controls service fee calculation display (not collection)

**File:** `src/contexts/FeatureFlagsContext.tsx:59,110,127`
- Exposed via React context
- Default: `250`
- Can be overridden via localStorage

### 4.3 Constants

**File:** `src/services/chain/polkadot.ts:343`
- **Fallback Fee:** `'10000000'` Planck (0.01 DOT) when estimation fails

**File:** `src/services/chain/sim.ts:67`
- **Mock Fee:** `'100000000'` Planck (0.01 DOT) in simulation mode

**File:** `src/components/screens/SettleHome.tsx:243,251`
- **Fallback Display Fee:** `0.0024` DOT (used if `feeEstimate` is null)

---

## 5. UI DISPLAY

### 5.1 SettleHome Component

**File:** `src/components/screens/SettleHome.tsx`

**Network Fee Display (Lines 824-828):**
```typescript
{!feeLoading && feeEstimate !== null && !feeError && (
  <div className="flex justify-between text-caption">
    <span className="text-muted">Network fee (est.):</span>
    <span className="tabular-nums text-muted">~{feeEstimate.toFixed(4)} DOT</span>
  </div>
)}
```

**Service Fee Display (Lines 840-851):**
```typescript
{!feeLoading && (() => {
  const bps = Math.max(0, Number(SERVICE_FEE_CAP_BPS) || 0);
  const serviceFee = Math.max(0, Math.abs(totalAmount)) * (bps / 10_000);
  const servicePct = (bps / 100).toFixed(2);
  
  return (
    <div className="flex justify-between text-caption">
      <span className="text-muted">Service fee ({servicePct}%):</span>
      <span className="tabular-nums text-muted">{serviceFee.toFixed(2)} USD</span>
    </div>
  );
})()}
```

**Total Display (Lines 864-868):**
```typescript
<p className="text-body font-medium tabular-nums">{formatAmount(totalAmount)}</p>
{feeEstimate !== null && !feeError && (
  <p className="text-caption text-muted tabular-nums">
    + ~{feeEstimate.toFixed(6)} DOT (network fee)
  </p>
)}
```

**Copy Strings:**
- "Network fee (est.):" (network fee label)
- "Service fee ({X}%):" (service fee label)
- "Total you'll send:" (total label)
- "+ ~{X} DOT (network fee)" (fee addendum)

### 5.2 SettlementConfirmModal Component

**File:** `src/components/SettlementConfirmModal.tsx:114-118`

**Fee Display:**
```typescript
{!feeLoading && estimatedFee && !feeError && (
  <div className="flex justify-between items-center">
    <span className="text-xs text-muted-foreground">Network fee (est.):</span>
    <span className="text-xs tabular-nums text-muted-foreground">~{estimatedFee} DOT</span>
  </div>
)}
```

**Total Display (Lines 128-133):**
```typescript
<div className="border-t border-border/50 pt-2 flex justify-between items-center">
  <span className="text-sm font-medium">Total:</span>
  <span className="text-sm font-semibold tabular-nums">
    {feeLoading ? '...' : feeError ? `${amountDot.toFixed(6)} + fee` : `${totalAmount.toFixed(6)} DOT`}
  </span>
</div>
```

**Copy Strings:**
- "Network fee (est.):" (network fee label)
- "Total:" (total label)
- "Fee unavailable" (error state)

### 5.3 TxToast Component

**File:** `src/components/TxToast.tsx:182-186`

**Fee Display (in expanded details):**
```typescript
{meta.fee && meta.feeCurrency && (
  <div className="flex items-center justify-between gap-2">
    <span className="text-caption text-muted">Fee:</span>
    <span className="text-caption tabular-nums text-foreground">
      ~{meta.fee.toFixed(4)} {meta.feeCurrency}
    </span>
  </div>
)}
```

**Copy Strings:**
- "Fee:" (fee label in toast)

**Note:** Fee is passed via `meta.fee` and `meta.feeCurrency` props from `SettleHome.tsx:243,251`

---

## 6. TEST COVERAGE

### 6.1 Unit Tests

**Result:** ❌ **No unit tests found** for fee computation or estimation

**Searched:**
- `**/*test*.ts` - 0 files
- `**/*test*.tsx` - 2 files (unrelated: `chain-test-page.tsx`, `AttestationDetail.tsx`)
- `**/*.spec.ts` - 0 files
- `**/*.spec.tsx` - 0 files

### 6.2 E2E Tests

**Result:** ❌ **No E2E tests found** for settlement flow or fee handling

### 6.3 Manual Testing

**Documentation:** `src/docs/implementation/dot-fee.md`
- Describes fee estimation implementation
- Documents UI states (loading, success, error)
- No automated test coverage

---

## 7. QUICK RISKS

### 7.1 Service Fee Displayed But Not Collected

**Risk Level:** ⚠️ **MEDIUM**

**Issue:** Service fee is calculated and displayed to users, but **never actually collected**. This creates:
- User confusion (why show a fee that isn't charged?)
- Potential legal/regulatory issues (misleading fee disclosure)
- Inconsistent UX (fee shown but not deducted)

**Location:** `src/components/screens/SettleHome.tsx:840-851`

**Recommendation:** Either remove service fee display OR implement actual fee collection/routing.

### 7.2 No Platform Fee Routing

**Risk Level:** ⚠️ **LOW** (if intentional)

**Issue:** No code exists to:
- Deduct platform fee from settlement amount
- Route platform fee to treasury address
- Split settlement into recipient + platform portions

**Impact:** Platform cannot collect fees even if desired.

**Recommendation:** If platform fees are intended, implement fee routing via `batchAll` or split transfers.

### 7.3 Fee Estimation Fallback May Be Inaccurate

**Risk Level:** ⚠️ **LOW**

**Issue:** Fallback fee (`0.01 DOT`) may be significantly different from actual network fee, especially during high congestion.

**Location:** `src/services/chain/polkadot.ts:343`

**Impact:** Users may see incorrect fee estimates, leading to insufficient balance errors.

**Recommendation:** Consider dynamic fallback based on recent fee history or network conditions.

### 7.4 Rounding Inconsistencies

**Risk Level:** ⚠️ **LOW**

**Issue:** Different precision used for fee display:
- Summary: 4 decimals (`toFixed(4)`)
- Total addendum: 6 decimals (`toFixed(6)`)
- Service fee: 2 decimals (`toFixed(2)`)

**Location:** Multiple locations in `SettleHome.tsx`

**Impact:** Minor UX inconsistency, but not a functional risk.

**Recommendation:** Standardize precision (e.g., 6 decimals for DOT, 2 for USD).

### 7.5 No Fee Validation Before Settlement

**Risk Level:** ⚠️ **MEDIUM**

**Issue:** No check to ensure user has sufficient balance for settlement amount + network fee before initiating transaction.

**Location:** `src/components/screens/SettleHome.tsx:228-256`

**Impact:** Transaction may fail after user confirms, leading to poor UX.

**Current Check:** `canAffordDotPayment` checks settlement amount only, not amount + fee.

**Recommendation:** Add balance check: `balance >= amountDot + feeEstimate`.

### 7.6 Service Fee Currency Mismatch

**Risk Level:** ⚠️ **LOW**

**Issue:** Service fee is always displayed in USD, even for DOT settlements.

**Location:** `src/components/screens/SettleHome.tsx:848`

**Impact:** Confusing UX for DOT-only pots (shows USD fee).

**Recommendation:** Use pot's `baseCurrency` for service fee display.

### 7.7 No Double-Charge Protection

**Risk Level:** ✅ **LOW** (not applicable)

**Observation:** Single `transferKeepAlive` call per settlement, no risk of double-charging. Network fee is automatically deducted by Polkadot runtime.

### 7.8 Missing Fee in Settlement History

**Risk Level:** ⚠️ **LOW**

**Issue:** Settlement records in database (`settlements` table) store `tx_hash` but not `fee` amount.

**Location:** `src/database/init/01-schema.sql:165-177`

**Impact:** Cannot display historical fee data or audit fee trends.

**Recommendation:** Add optional `fee` column to `settlements` table if historical tracking is desired.

---

## SUMMARY

### Fee Types Identified

1. **Network Fee (DOT):** ✅ Estimated, displayed, and automatically deducted by Polkadot
2. **Service Fee (Platform Fee):** ⚠️ Calculated and displayed, but **NOT collected**

### Settlement Flow

1. User selects DOT settlement method
2. Fee estimation runs automatically (`estimateFee`)
3. Service fee calculated for display (not collected)
4. User confirms settlement
5. `balances.transferKeepAlive` extrinsic built and sent
6. Full `amountDot` sent to recipient (no fee deduction)
7. Network fee automatically deducted by Polkadot runtime

### Key Findings

- ✅ Network fee estimation works correctly
- ✅ Network fee is properly displayed in UI
- ⚠️ Service fee is displayed but never collected
- ⚠️ No platform fee routing to treasury
- ⚠️ No automated tests for fee logic
- ⚠️ No balance validation for amount + fee before settlement

### Recommendations

1. **Decide on service fee:** Remove display OR implement collection
2. **Add fee validation:** Check `balance >= amountDot + feeEstimate` before settlement
3. **Standardize precision:** Use consistent decimal places for fee display
4. **Add tests:** Unit tests for fee calculation, E2E tests for settlement flow
5. **Consider fee tracking:** Add `fee` column to `settlements` table for historical data

---

**End of Audit Report**

