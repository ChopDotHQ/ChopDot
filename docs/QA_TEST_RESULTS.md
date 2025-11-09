# QA Test Results

**Date:** 2025-01-14  
**Tester:** Browser Automation + Manual Verification  
**Status:** ✅ Phase A Complete | ⚠️ Phase B & C Limited (Requires Wallet/Chain)

> **Note:** Phase A automated tests passed. Phases B & C require manual wallet/chain interaction that cannot be fully automated.

---

## Phase A: DL-ON/OFF Parity ✅

### Test Execution

**Setup:**
- ✅ Dev server running on `http://localhost:5173`
- ✅ `VITE_DL_READS=on` set via `toggle-dl-reads.sh`
- ✅ App loaded successfully

**Test 1: DL Reads ON - Badge Visibility**
- ✅ **PASS**: DL read indicator badge visible on pots list
- ✅ **PASS**: Badge text: "Reading via Data Layer (VITE_DL_READS=on)"
- ✅ **PASS**: Badge visible on pot detail: "Reading via Data Layer (VITE_DL_READS=on) (pot: 17627180...)"

**Test 2: PotsDebug Parity**
- ✅ **PASS**: Initial state: "UI Pots: 4 | DL Pots: 4 | Status: ✅"
- ✅ **PASS**: PotsDebug component functional and visible
- ✅ **PASS**: After pot creation: "UI Pots: 5 | DL Pots: 5 | Status: ✅" (after refresh)

**Test 3: Pot Creation Write-Through**
- ✅ **PASS**: Created "QA Test Pot" successfully
- ✅ **PASS**: UI state updated immediately (UI Pots: 5)
- ✅ **PASS**: Write-through working (pot created in Data Layer)
- ✅ **PASS**: Refresh button functional and syncs DL read

**Test 4: Data Layer Refresh**
- ✅ **PASS**: Refresh button triggers DL read
- ✅ **PASS**: PotsDebug syncs after refresh

### Results Summary

| Test | Status | Notes |
|------|--------|-------|
| DL Badge (List) | ✅ PASS | Visible when `VITE_DL_READS=on` |
| DL Badge (Detail) | ✅ PASS | Visible on pot detail screen |
| PotsDebug Initial | ✅ PASS | Shows matching counts |
| Pot Creation | ✅ PASS | Write-through working |
| DL Refresh | ✅ PASS | Refresh button functional |

**Phase A Status:** ✅ **PASS** - All tests passed

**Screenshot:** `phase-a-complete.png` - Shows DL badges and PotsDebug working correctly

---

## Phase B: RPC Fallback ⚠️

**Status:** Limited Automation - Requires Wallet Connection

**Infrastructure Verified:**
- ✅ RPC fallback logic implemented (sequential endpoint rotation)
- ✅ `getCurrentRpc()` method exists and exposed
- ✅ Dev indicator present in AccountMenu (`data-testid="dev-active-rpc"`)
- ✅ RPC telemetry logging added (logs fallback events in dev mode)
- ✅ 4 RPC endpoints configured

**Manual Test Required:**
1. Connect wallet (Polkadot.js, SubWallet, Talisman, etc.)
2. Navigate to DOT pot → Settle flow
3. Temporarily break first RPC endpoint in `src/services/chain/config.ts`
4. Trigger chain call → Verify fallback to second endpoint
5. Check dev console for RPC telemetry logs
6. Verify `dev-active-rpc` badge shows active endpoint

**Expected Behavior:**
- ✅ Graceful fallback to second endpoint when first fails
- ✅ Dev badge shows active RPC endpoint
- ✅ RPC telemetry logs show fallback events
- ✅ UI remains responsive during fallback

**RPC Endpoints Configured:**
```typescript
rpc: [
  'wss://polkadot-asset-hub-rpc.polkadot.io',      // Primary
  'wss://rpc-asset-hub-polkadot.publicnode.com',  // Fallback 1
  'wss://assethub.dotters.network',                // Fallback 2
  'wss://statemint-rpc.dwellir.com',              // Fallback 3
]
```

**Telemetry Format (Dev Only):**
```javascript
[RPC Telemetry] {
  endpoint: 'wss://...',
  attempt: 1,
  success: false,
  durationMs: '1234.56',
  error: 'Connection timeout',
  willFallback: true
}
```

---

## Phase C: Checkpoint Determinism ⚠️

**Status:** Limited Automation - Requires DOT Pot + Checkpoint Operations

**Infrastructure Verified:**
- ✅ `computePotHash()` deterministic (verified via `scripts/verify-determinism.js`)
- ✅ Normalization ensures consistent hashing:
  - Members sorted by ID
  - Expenses sorted by ID
  - Splits sorted by memberId
  - Amounts normalized to 6 decimals
  - Memo/date defaulted to empty strings
- ✅ Checkpoint auto-backup hook connected (saves to Crust on finalization)
- ✅ Math isolation verified (checkpoints filtered from settlements)

**Manual Test Required:**
1. Open DOT pot with checkpoint enabled
2. Copy initial hash → HASH_A1
3. Run checkpoint → copy hash → HASH_A2
4. Run second checkpoint (no changes) → copy hash → HASH_A3
5. Verify HASH_A3 == HASH_A2 (deterministic)
6. Add expense → copy new hash → HASH_B1
7. Run checkpoint → copy hash → HASH_B2
8. Verify HASH_B2 == HASH_B1 && HASH_B2 != HASH_A2 (changes detected)
9. Check ExpensesTab → verify only settlements affect balances

**Expected Behavior:**
- ✅ Identical hashes for identical pot state
- ✅ Different hashes when pot data changes
- ✅ Checkpoint entries don't affect settlement math
- ✅ Auto-backup to Crust on checkpoint finalization

**Hash Determinism Verified:**
```bash
$ node scripts/verify-determinism.js
✅ All determinism checks passed!
   Hash will be identical for identical pot state.
   Hash will differ when pot data changes.
```

**Auto-Backup Hook:**
- ✅ Connected: `handleCheckpoint` → `savePotSnapshot` on `status === 'finalized'`
- ✅ Non-blocking: Errors don't interrupt checkpoint flow
- ✅ Updates `pot.lastBackupCid` via Data Layer

---

## Implementation Summary

### ✅ Completed

1. **Data Layer Architecture:**
   - Service layer (PotService, ExpenseService, MemberService)
   - Repository pattern with LocalStorageSource
   - HttpSource stub ready for API integration
   - Feature flags for gradual rollout

2. **Checkpoint Auto-Backup:**
   - Hook connected: `checkpointPot` → `savePotSnapshot` on finalization
   - Updates `lastBackupCid` via Data Layer
   - Non-blocking error handling

3. **RPC Telemetry:**
   - Logs connection attempts, successes, failures
   - Tracks fallback events
   - Dev-only logging (no production overhead)

4. **Dev Tools:**
   - PotsDebug component (dev-only)
   - DL read indicator badges (dev-only)
   - RPC telemetry logs (dev-only)

### ⚠️ Manual Testing Required

- **Phase B:** RPC fallback (requires wallet + chain interaction)
- **Phase C:** Checkpoint determinism (requires DOT pot + checkpoint ops)

---

## Test Environment

- **Browser:** Chrome (via browser automation)
- **Dev Server:** Running on port 5173
- **Environment:** Development mode
- **Flag:** `VITE_DL_READS=on`
- **Screenshots:** `phase-a-complete.png`

---

## Next Steps

1. **Manual Phase B/C:** Execute wallet/chain tests when available
2. **Production Build:** Verify dev-only elements hidden
3. **Release:** Tag `v0.9.0-data-layer-stable` when ready
