# ChopDot Improvement Plan

Based on the initial architectural review of the ChopDot codebase, the following areas have been identified for improvement to enhance robustness, scalability, and financial accuracy.

## 1. Critical Security Vulnerability: Wallet Auth Bypass 🚨

**Current State:**
The application allows users to log in with a wallet (Polkadot/EVM) by deriving a "fake" email from the wallet address and using the **wallet address itself as the password** for Supabase Authentication.

```typescript
// src/contexts/AuthContext.tsx
const walletEmail = deriveWalletEmail(credentials.address);
// ...
await supabase.auth.signInWithPassword({
  email: walletEmail,
  password: credentials.address, // <--- Password is the public address!
});
```

**Risk:**
**High Severity.** Since wallet addresses are public information, any attacker can derive the email address (using the known `deriveWalletEmail` logic) and log in to the Supabase backend as *any user* by simply providing the target's public wallet address as the password. The client-side signature generation in `SignInScreen` provides no protection against direct API attacks.

**Recommendation:**
- **Immediate Fix:** Do not use the address as the password. The password must be a secret.
- **Proper Solution:**
  1.  **Backend Verification:** Implement a Supabase Edge Function (or backend endpoint) that accepts the `walletAddress` and `signature`.
  2.  **Verify Signature:** The backend must verify the signature against the message (nonce + timestamp).
  3.  **Issue Token:** Only after verification should the backend issue a custom Supabase Auth token (using `supabase.auth.admin.createUser` or similar admin privileges) to the client.
  4.  **Client Use:** The client then uses this token to authenticate, rather than a password.

## 2. Financial Precision & Safety 💰

**Current State:**
The application currently uses standard JavaScript `number` (floating-point) arithmetic with a `roundToMicro` helper function in `src/services/settlement/calc.ts`.

**Risk:**
Floating-point arithmetic can introduce accumulated rounding errors (e.g., `0.1 + 0.2 !== 0.3`). In a financial application, even micro-discrepancies can lead to settlement issues or loss of user trust.

**Recommendation:**
- **Short Term:** Ensure all settlement calculations utilize a consistent rounding strategy at every step, not just the end.
- **Long Term:** Refactor `calc.ts` to use an arbitrary-precision library (like `decimal.js`, `big.js`, or `dinero.js`) or switch to **Integer Math** (calculating everything in the lowest denomination, e.g., cents or Plank) to guarantee 100% precision.

## 3. Scalability & Performance 🚀

**Current State:**
The `PotRepository.list()` and `SupabaseSource.getPots()` methods currently fetch *all* pots belonging to a user in a single query.

**Risk:**
As a user's usage history grows (more pots, more expenses), this will become a significant performance bottleneck, increasing load times and memory usage.

**Recommendation:**
- **Pagination:** Implement cursor-based or offset-based pagination in the `DataSource` interface and `PotRepository`.
- **UI Update:** Update the `PotsHome` screen to support "Load More" or Infinite Scroll functionality.

## 4. Login System & Code Quality 🔐

**Current State:**
- **Monolithic Component:** `SignInScreen.tsx` is nearly 2000 lines long, mixing UI, state, and complex wallet logic.
- **Duplicated Logic:** Sign-up logic appears in both `SignInScreen` (internal state) and `SignUpScreen` (standalone component).

**Recommendation:**
- **Refactor `SignInScreen`:** Break this component down into smaller, focused sub-components (e.g., `WalletConnectPanel`, `EmailLoginForm`, `WalletOptionList`).
- **Unify Auth Flow:** Consolidate sign-up logic into a single flow to reduce maintenance burden and inconsistency bugs.
- **Custom Hooks:** Extract wallet connection logic (Polkadot vs. WalletConnect) into custom hooks (e.g., `useWalletAuth`) to clean up the view layer.

## 5. Code Organization & Separation of Concerns 🏗️

**Current State:**
`SupabaseSource.ts` currently contains mixed responsibilities. Besides CRUD operations, it handles "side effects" like seeding sample data (`seedSamplePots`) and ensuring user records (`ensureUserRecord`).

**Risk:**
This tightly couples data access logic with business initialization logic, making the `SupabaseSource` harder to test and maintain.

**Recommendation:**
- **UserSetupService:** Extract user initialization and seeding logic into a dedicated service (e.g., `UserSetupService` or `OnboardingService`).
- **Pure Data Source:** Keep `SupabaseSource` focused strictly on reading and writing data to the backend.

## 6. Testing Strategy 🧪

**Current State:**
The pure functions in `calc.ts` are excellent candidates for testing.

**Recommendation:**
- **Unit Tests:** Ensure comprehensive unit tests exist for `calc.ts`, covering edge cases such as:
  - Circular debts (A owes B, B owes C, C owes A).
  - Uneven splits among 3+ members.
  - Rounding edge cases.
- **Integration Tests:** Add tests for the `PotRepository` to verify caching behavior and data source failover.
