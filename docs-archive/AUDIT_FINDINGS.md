# ChopDot Security & Integrity Audit Report

**Date:** 2026-01-05  
**Scope:** CRDT integrity, Wallet-auth security, RLS policies, Financial precision, IPFS abuse prevention  
**Method:** Evidence-based code review (no assumptions)

---

## FINDINGS (Ordered by Severity)

### 🔴 CRITICAL SEVERITY

#### 1. CRDT Hash Function Has High Collision Risk
**Severity:** Critical (Data Integrity)  
**Impact:** Hash collisions can cause legitimate changes to be deduplicated incorrectly, leading to data loss or corruption.

**Evidence:**
```152:162:src/services/crdt/realtimeSync.ts
private hashChange(change: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < change.length; i++) {
    const byte = change[i];
    if (byte !== undefined) {
      hash = ((hash << 5) - hash) + byte;
      hash = hash & hash;
    }
  }
  return hash.toString(16);
}
```

**Problem:** djb2-style hash with 32-bit integer overflow. For CRDT changes (can be 100s of bytes), collision probability is non-negligible. The unique constraint `crdt_changes_pot_id_hash_key` will reject legitimate changes if hash collides.

**Fix:** Replace with SHA-256:
```typescript
private async hashChange(change: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', change);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

**Tests to Add:**
- `src/services/crdt/__tests__/realtimeSync.test.ts`: Test hash collision resistance (generate 10,000 random changes, verify no collisions)
- Test that identical changes produce identical hashes
- Test that different changes produce different hashes

---

#### 2. CRDT Actor IDs Are Non-Deterministic Per Session
**Severity:** Critical (Data Integrity)  
**Impact:** Same user from different devices/browsers gets different actor IDs, causing CRDT merge conflicts and potential data loss.

**Evidence:**
```167:169:src/services/crdt/realtimeSync.ts
private getActor(_doc: Automerge.Doc<CRDTPotDocument>): string {
  return 'actor-' + Math.random().toString(36).substr(2, 9);
}
```

**Problem:** Actor ID changes on every page load/session. Automerge requires stable actor IDs per user for correct merge semantics. This breaks multi-device sync.

**Fix:** Derive actor ID from userId + device fingerprint:
```typescript
private getActor(doc: Automerge.Doc<CRDTPotDocument>, userId: string): string {
  // Use userId as base, add device fingerprint for multi-device support
  const deviceId = this.getDeviceFingerprint(); // localStorage-based stable ID
  return `${userId}-${deviceId}`;
}
```

**Tests to Add:**
- `src/services/crdt/__tests__/realtimeSync.test.ts`: Verify actor ID is stable across sessions for same user
- Test multi-device merge scenarios (same user, different actors should still merge correctly)

---

#### 3. Anonymous Role Has Full CRUD on Financial Tables
**Severity:** Critical (Security)  
**Impact:** Unauthenticated users can read/write/delete expenses, settlements, contributions, and payments. This allows financial data manipulation.

**Evidence:**
```699-711:supabase/migrations/20251226031016_remote_schema.sql
grant delete on table "public"."expenses" to "anon";
grant insert on table "public"."expenses" to "anon";
grant references on table "public"."expenses" to "anon";
grant select on table "public"."expenses" to "anon";
grant trigger on table "public"."expenses" to "anon";
grant truncate on table "public"."expenses" to "anon";
grant update on table "public"."expenses" to "anon";
```

Similar grants exist for:
- `settlements` (lines 909-921)
- `contributions` (lines 619-631)
- `payments` (lines 763-775)

**Problem:** Even with RLS policies, granting full CRUD to `anon` is a security anti-pattern. RLS policies can be bypassed or misconfigured.

**Fix:** Remove all grants to `anon` for financial tables. Create migration:
```sql
REVOKE ALL ON public.expenses FROM anon;
REVOKE ALL ON public.settlements FROM anon;
REVOKE ALL ON public.contributions FROM anon;
REVOKE ALL ON public.payments FROM anon;
```

**Tests to Add:**
- `supabase/tests/rls.test.sql`: Verify unauthenticated requests to financial tables return 401/403
- Integration test: Attempt to insert expense without auth token → expect 401

---

#### 4. No Rate Limiting on IPFS Upload Endpoint
**Severity:** Critical (Security/DoS)  
**Impact:** IPFS upload endpoint can be abused for DoS or cost attacks (IPFS storage costs money). No protection against rapid-fire requests.

**Evidence:**
```28:29:backend/src/index.ts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

No rate limiting middleware found in backend codebase.

**Fix:** Add `express-rate-limit`:
```typescript
import rateLimit from 'express-rate-limit';

const ipfsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: 'Too many upload requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/ipfs', ipfsLimiter);
```

**Tests to Add:**
- `backend/__tests__/ipfs.controller.test.ts`: Test rate limiting (send 21 requests rapidly → 21st should return 429)
- Test rate limit resets after window expires

---

### 🟠 HIGH SEVERITY

#### 5. Auth Nonces Table Allows Anonymous Access
**Severity:** High (Security)  
**Impact:** Anonymous users can read/write/delete auth nonces, enabling replay attacks or DoS on authentication system.

**Evidence:**
```577-589:supabase/migrations/20251226031016_remote_schema.sql
grant delete on table "public"."auth_nonces" to "anon";
grant insert on table "public"."auth_nonces" to "anon";
grant references on table "public"."auth_nonces" to "anon";
grant select on table "public"."auth_nonces" to "anon";
grant trigger on table "public"."auth_nonces" to "anon";
grant truncate on table "public"."auth_nonces" to "anon";
grant update on table "public"."auth_nonces" to "anon";
```

**Problem:** Nonces should only be managed by the wallet-auth edge function (service_role). Anonymous access allows:
- Reading nonces (replay attacks)
- Deleting nonces (DoS)
- Inserting fake nonces (confusion)

**Fix:** Remove all grants to `anon`:
```sql
REVOKE ALL ON public.auth_nonces FROM anon;
```

**Tests to Add:**
- Verify `/functions/v1/wallet-auth/request-nonce` still works (uses service_role)
- Verify direct anon access to `auth_nonces` table returns 401

---

#### 6. Nonce Cleanup Missing for Expired Entries
**Severity:** High (Security/Performance)  
**Impact:** Expired nonces accumulate in database, causing table bloat and potential performance issues. No automated cleanup.

**Evidence:**
```61:68:supabase/functions/wallet-auth/index.ts
const nonce = crypto.randomUUID();
const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

const { error } = await supabaseAdmin
  .from("auth_nonces")
  .upsert({ address, nonce, expires_at: expiresAt, created_at: new Date().toISOString() });
```

Nonces are deleted on consumption (line 376) but not cleaned up if they expire unused.

**Fix:** Add scheduled cleanup function or cron job:
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM auth_nonces
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Run via pg_cron or Supabase Edge Function scheduled task
```

**Tests to Add:**
- Verify expired nonces are cleaned up
- Test that nonces older than 1 hour are deleted

---

#### 7. Financial Calculations Use Float Arithmetic in UI
**Severity:** High (Data Integrity)  
**Impact:** Expense split calculations use `parseFloat` and `toFixed`, causing rounding errors. Example: `100/3 = 33.333...` → `33.33` × 3 = `99.99` ≠ `100`.

**Evidence:**
```118:144:src/components/screens/AddExpense.tsx
const calculateSplit = () => {
  const numAmount = parseFloat(amount);
  
  if (splitType === "equal") {
    const perPerson = numAmount / includedMembers.size;
    return Array.from(includedMembers).map(memberId => ({
      memberId,
      amount: Number(perPerson.toFixed(decimals)),
    }));
  } else if (splitType === "custom") {
    return members
      .filter(m => includedMembers.has(m.id))
      .map(m => ({
        memberId: m.id,
        amount: Number(((numAmount * parseFloat(customPercents[m.id] || "0")) / 100).toFixed(decimals)),
      }));
  } else {
    const totalShares = Array.from(includedMembers).reduce(
      (sum, id) => sum + parseInt(shares[id] || "0"),
      0
    );
    return Array.from(includedMembers).map(memberId => ({
      memberId,
      amount: Number(((numAmount * parseInt(shares[memberId] || "0")) / totalShares).toFixed(decimals)),
    }));
  }
};
```

**Problem:** Float arithmetic + rounding can cause split amounts to not sum to total. The settlement service (`calc.ts`) uses `Decimal.js` correctly, but UI calculations don't.

**Fix:** Use `Decimal.js` in UI calculations:
```typescript
import Decimal from 'decimal.js';

const calculateSplit = () => {
  const numAmount = new Decimal(amount);
  
  if (splitType === "equal") {
    const perPerson = numAmount.div(includedMembers.size);
    return Array.from(includedMembers).map(memberId => ({
      memberId,
      amount: perPerson.toNumber(),
    }));
  }
  // ... similar for other split types
};
```

**Tests to Add:**
- `src/components/screens/__tests__/AddExpense.test.ts`: Verify split amounts sum to total exactly
- Test edge cases: `100/3`, `99.99/3`, `0.01/2` (DOT precision)

---

#### 8. Settlement Calculations Convert DOT Amounts via Number()
**Severity:** High (Data Integrity)  
**Impact:** Converting DOT amounts (strings) to numbers loses precision. DOT has 10 decimal places; JavaScript numbers have ~15-17 significant digits total.

**Evidence:**
```162:162:src/utils/settlements.ts
const amt = Number(h.amountDot || '0');
```

```295:295:src/utils/settlements.ts
const amt = Number(h.amountDot || '0');
```

**Problem:** `amountDot` is a string (e.g., `"0.0000001"`), but `Number()` conversion can lose precision for very small amounts.

**Fix:** Use `Decimal.js` for DOT amounts:
```typescript
import Decimal from 'decimal.js';

const amt = new Decimal(h.amountDot || '0');
// Use Decimal for all arithmetic, convert to number only at display
```

**Tests to Add:**
- `src/utils/__tests__/settlements.test.ts`: Test micro-DOT precision (0.000001 DOT)
- Verify settlement calculations preserve precision for small amounts

---

### 🟡 MEDIUM SEVERITY

#### 9. CRDT Sequence Number Uses History Length (Incorrect)
**Severity:** Medium (Data Integrity)  
**Impact:** Sequence number should be per-actor, not global. Using history length causes incorrect sequencing in multi-user scenarios.

**Evidence:**
```174:177:src/services/crdt/realtimeSync.ts
private getSequenceNumber(doc: Automerge.Doc<CRDTPotDocument>): number {
  const history = Automerge.getHistory(doc);
  return history.length;
}
```

**Problem:** Sequence numbers should be per-actor. If user A makes 5 changes and user B makes 3, user B's seq should be 1-3, not 6-8.

**Fix:** Use Automerge's actor-specific sequence:
```typescript
private getSequenceNumber(doc: Automerge.Doc<CRDTPotDocument>, actor: string): number {
  const heads = Automerge.getHeads(doc);
  // Get sequence number for this specific actor
  // This requires accessing Automerge internals or tracking separately
  // Alternative: Remove seq from broadcast, rely on Automerge's internal sequencing
}
```

**Note:** The `seq` field may not be necessary if using Automerge's built-in change ordering.

**Tests to Add:**
- Verify sequence numbers are correct in multi-user scenarios
- Test that changes from different actors have independent sequences

---

#### 10. Expense ID Generation Uses Date.now() (Collision Risk)
**Severity:** Medium (Data Integrity)  
**Impact:** Multiple expenses created in same millisecond get same ID, causing data overwrites.

**Evidence:**
```112:112:src/services/data/repositories/ExpenseRepository.ts
id: Date.now().toString(), // Temporary ID generation
```

**Problem:** `Date.now()` has millisecond precision. Rapid expense creation can collide.

**Fix:** Use UUID:
```typescript
id: crypto.randomUUID(),
```

**Tests to Add:**
- `src/services/data/__tests__/ExpenseRepository.test.ts`: Test ID uniqueness (create 1000 expenses rapidly, verify all unique)

---

#### 11. IPFS Upload Accepts All File Types
**Severity:** Medium (Security)  
**Impact:** Malicious files (executables, scripts) can be uploaded to IPFS, potentially causing issues when accessed.

**Evidence:**
```15:18:backend/src/middleware/upload.middleware.ts
fileFilter: (req, file, cb) => {
  // Accept all file types for IPFS uploads
  cb(null, true);
},
```

**Problem:** No MIME type validation. While IPFS is content-addressed, allowing arbitrary file types increases attack surface.

**Fix:** Whitelist allowed types:
```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
];

fileFilter: (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
},
```

**Tests to Add:**
- `backend/__tests__/ipfs.controller.test.ts`: Test file type validation (upload .exe → expect 400)

---

#### 12. Wallet-Auth Nonce Replay Window (5 minutes)
**Severity:** Medium (Security)  
**Impact:** 5-minute nonce expiration is reasonable, but no rate limiting on nonce requests allows DoS.

**Evidence:**
```61:61:supabase/functions/wallet-auth/index.ts
const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
```

**Problem:** No rate limiting on `/request-nonce` endpoint. Attacker can flood nonce table.

**Fix:** Add rate limiting to wallet-auth edge function:
```typescript
// In wallet-auth/index.ts
const nonceRequestCounts = new Map<string, { count: number; resetAt: number }>();

async function handleRequestNonce(body: RequestNoncePayload) {
  const address = body.address?.trim();
  if (!address) return json({ error: "address required" }, 400);

  // Rate limit: 10 nonces per address per 5 minutes
  const now = Date.now();
  const record = nonceRequestCounts.get(address);
  if (record && record.resetAt > now) {
    if (record.count >= 10) {
      return json({ error: "Too many nonce requests" }, 429);
    }
    record.count++;
  } else {
    nonceRequestCounts.set(address, { count: 1, resetAt: now + 5 * 60 * 1000 });
  }

  // ... rest of function
}
```

**Tests to Add:**
- Test rate limiting on nonce requests (11th request → 429)
- Test rate limit resets after window

---

### 🟢 LOW SEVERITY

#### 13. CRDT BaseCurrency Type Mismatch
**Severity:** Low (Validation)  
**Impact:** CRDT types only support `DOT | USD` but pot schema supports `EUR | GBP | CHF | JPY | USDC`. Pots with other currencies will fail CRDT sync validation.

**Evidence:**
```43:43:src/services/crdt/types.ts
baseCurrency: 'DOT' | 'USD';
```

vs

```145:145:src/schema/pot.ts
export type BaseCurrency = 'DOT' | 'USD' | 'USDC' | 'EUR' | 'GBP' | 'CHF' | 'JPY';
```

**Fix:** Align CRDT types with schema:
```typescript
baseCurrency: 'DOT' | 'USD' | 'USDC' | 'EUR' | 'GBP' | 'CHF' | 'JPY';
```

**Tests to Add:**
- Test CRDT sync with EUR/GBP pots
- Verify currency validation passes

---

#### 14. Settlement Calculation Uses Number() for DOT History
**Severity:** Low (Precision)  
**Impact:** Already flagged in #8, but worth noting this appears in two places.

**Evidence:** Same as #8.

---

#### 15. No Validation on IPFS File Size Before Upload
**Severity:** Low (Performance)  
**Impact:** Multer limits to 10MB, but no pre-validation. Large files fail after upload starts.

**Evidence:**
```12:14:backend/src/middleware/upload.middleware.ts
limits: {
  fileSize: 10 * 1024 * 1024, // 10MB limit
},
```

**Fix:** Add Content-Length check before processing:
```typescript
if (req.headers['content-length']) {
  const size = parseInt(req.headers['content-length'], 10);
  if (size > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'File too large' });
  }
}
```

---

## QUICK WINS (≤ 1 Day)

1. **Remove anon grants from financial tables** (30 min)
   - Create migration: `REVOKE ALL ON public.expenses FROM anon;` (repeat for settlements, contributions, payments)
   - Test: Verify 401 on unauthenticated requests

2. **Remove anon grants from auth_nonces** (15 min)
   - Migration: `REVOKE ALL ON public.auth_nonces FROM anon;`
   - Test: Verify wallet-auth still works (uses service_role)

3. **Fix expense ID generation** (10 min)
   - Replace `Date.now().toString()` with `crypto.randomUUID()`
   - Test: Create 1000 expenses rapidly, verify uniqueness

4. **Add rate limiting to IPFS endpoint** (1 hour)
   - Install `express-rate-limit`
   - Add limiter middleware
   - Test: Send 21 requests → verify 429

5. **Fix CRDT actor ID generation** (2 hours)
   - Derive from userId + device fingerprint
   - Test: Verify stable actor IDs across sessions

6. **Add file type validation to IPFS** (30 min)
   - Whitelist MIME types
   - Test: Upload .exe → expect 400

---

## HIGH-RISK ITEMS (1-2 Weeks)

1. **Replace CRDT hash function with SHA-256** (2 days)
   - Refactor `hashChange()` to async
   - Update all call sites
   - Test: Collision resistance (10,000 random changes)
   - Migration: May need to re-hash existing changes

2. **Fix financial precision in UI calculations** (3 days)
   - Replace `parseFloat`/`toFixed` with `Decimal.js` in `AddExpense.tsx`
   - Update all expense split calculations
   - Test: Edge cases (`100/3`, micro-DOT amounts)
   - Verify split amounts sum exactly to total

3. **Add nonce cleanup job** (1 day)
   - Create Supabase Edge Function or pg_cron job
   - Schedule cleanup of expired nonces
   - Test: Verify cleanup runs and removes expired entries

4. **Fix CRDT sequence number logic** (2 days)
   - Investigate Automerge's actor-specific sequencing
   - Update `getSequenceNumber()` or remove if unnecessary
   - Test: Multi-user scenarios with correct sequencing

5. **Comprehensive RLS audit** (3 days)
   - Review all table grants
   - Verify RLS policies cover all access patterns
   - Test: Unauthenticated access to all tables
   - Document expected behavior

6. **Add rate limiting to wallet-auth nonce endpoint** (1 day)
   - Implement in-memory or Redis-based rate limiting
   - Test: Verify DoS protection

---

## TESTS TO ADD

### Critical Priority (P0)
- `src/services/crdt/__tests__/realtimeSync.test.ts`
  - Hash collision resistance (10,000 random changes)
  - Actor ID stability across sessions
  - Multi-device merge scenarios
  
- `supabase/tests/rls.test.sql`
  - Verify no anon access to financial tables
  - Verify RLS policies work correctly

- `backend/__tests__/ipfs.controller.test.ts`
  - Rate limiting (21 requests → 429)
  - File type validation
  - File size limits

### High Priority (P1)
- `src/components/screens/__tests__/AddExpense.test.ts`
  - Split amounts sum exactly to total
  - Float precision edge cases (`100/3`, `0.01/2`)

- `src/utils/__tests__/settlements.test.ts`
  - DOT precision preservation (micro-DOT amounts)
  - Settlement calculations with on-chain history

- `src/services/data/__tests__/ExpenseRepository.test.ts`
  - ID uniqueness (1000 rapid creations)
  - Concurrent expense creation

### Medium Priority (P2)
- `supabase/functions/__tests__/wallet-auth.test.ts`
  - Nonce rate limiting
  - Nonce expiration handling
  - Signature verification edge cases

- `src/services/crdt/__tests__/checkpointManager.test.ts`
  - Checkpoint creation/loading
  - Old checkpoint cleanup

---

## SUMMARY

**Critical Issues:** 4  
**High Issues:** 4  
**Medium Issues:** 4  
**Low Issues:** 3  

**Total Findings:** 15

**Most Critical:**
1. CRDT hash collisions (data loss risk)
2. Anonymous access to financial tables (security breach)
3. No rate limiting on IPFS (DoS/cost attack)
4. Non-deterministic actor IDs (multi-device sync broken)

**Estimated Fix Time:**
- Quick wins: 1 day
- High-risk items: 1-2 weeks
- Full remediation: 2-3 weeks



