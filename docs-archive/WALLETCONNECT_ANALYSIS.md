# WalletConnect Flow Analysis & Improvement Plan

## Current Issue: Nova Button Not Working

### Symptoms
- Clicking Nova button navigates to Nova Wallet but nothing happens
- Console error: `Unhandled Promise Rejection: TypeError: Importing a module script failed`
- Status shows `connecting` → `isWaitingForWalletConnect: true` but no deep-link prompt appears

### Root Cause Analysis

**1. Module Import Failure**
The error suggests a dynamic import is failing, likely in `AccountContext.tsx`:
```typescript
const walletConnectModule = await import('../services/chain/walletconnect');
```

**⚠️ CRITICAL FINDING:** There's a **static import** in `src/services/storage/ipfsAuth.ts`:
```typescript
import { createWalletConnectSigner, getWalletConnectSession } from '../../services/chain/walletconnect';
```

This static import executes at module load time, which could cause the "Importing a module script failed" error if:
- WalletConnect packages aren't fully loaded yet
- CSP (Content Security Policy) blocks the import
- Build-time code splitting fails
- Module dependencies aren't available

**Possible causes:**
- Static import in `ipfsAuth.ts` executes before WalletConnect is ready
- CSP (Content Security Policy) blocking module scripts
- Build-time code splitting issue with WalletConnect packages
- Missing or incorrect module exports in production build
- Vite build configuration not handling WalletConnect dynamic imports correctly

**2. Deep-Link Flow Issue**
Current flow in `handleWalletClick`:
1. Calls `onRetry()` → `startWalletConnectSession()`
2. `startWalletConnectSession()` calls `account.connectWalletConnect()`
3. `connectWalletConnect()` dynamically imports WalletConnect module
4. If import fails, URI is never generated
5. Deep-link never happens

**3. State Race Condition**
- `uri` state might not be set before `handleWalletClick` tries to use it
- `onRetry()` is async but `handleWalletClick` doesn't properly await it before deep-linking

### Immediate Fixes Needed

1. **Fix static import in `ipfsAuth.ts`** ⚠️ **HIGH PRIORITY**
   ```typescript
   // Change from static import:
   import { createWalletConnectSigner, getWalletConnectSession } from '../../services/chain/walletconnect';
   
   // To dynamic import:
   const getWalletConnectSigner = async () => {
     const { createWalletConnectSigner, getWalletConnectSession } = await import('../../services/chain/walletconnect');
     return { createWalletConnectSigner, getWalletConnectSession };
   };
   ```
   This static import is likely causing the module load failure.

2. **Add error handling for dynamic imports**
   ```typescript
   try {
     const walletConnectModule = await import('../services/chain/walletconnect');
   } catch (err) {
     console.error('[Account] Failed to load WalletConnect module:', err);
     // Show user-friendly error
   }
   ```

2. **Ensure URI is available before deep-linking**
   ```typescript
   const handleWalletClick = async (linkId: string) => {
     // ... existing code ...
     let sessionUri = uri;
     if (!sessionUri) {
       sessionUri = await onRetry(); // Must await this!
     }
     if (!sessionUri) {
       // Error handling
       return;
     }
     // Now safe to deep-link
   };
   ```

3. **Check CSP headers**
   - Verify `script-src` allows dynamic imports
   - Ensure WalletConnect CDN domains are whitelisted

---

## Elegant WalletConnect Implementation (Like ether.fi)

### What Makes It Elegant

Based on the screenshots you shared, the ideal flow includes:

1. **Single Modal with All Wallets**
   - One "Connect Wallet" button opens a modal
   - Modal shows grid of wallet options (MetaMask, Binance, 1inch, Ledger, etc.)
   - Search functionality to find wallets
   - Filter toggle for "WalletConnect certified" wallets
   - Recent wallets shown at top

2. **Seamless Connection Flow**
   - Click wallet → deep-link opens immediately
   - Wallet app shows connection request
   - User approves → automatically returns to app
   - **No separate signature step** — connection approval IS the signature

3. **Desktop QR Code Fallback**
   - Desktop shows QR code automatically
   - Mobile shows wallet grid
   - Smooth switching between modes

### Current Implementation vs. Ideal

| Feature | Current | Ideal (ether.fi) |
|---------|---------|------------------|
| **UI Entry Point** | Separate buttons for each wallet | Single "Connect Wallet" button |
| **Wallet Selection** | Custom mobile panel with hardcoded list | WalletConnect Modal with full wallet registry |
| **Connection Flow** | Two-step: Connect → Sign | Single-step: Connect (includes signature) |
| **Desktop Experience** | Manual QR code toggle | Automatic QR code display |
| **Wallet Discovery** | Hardcoded list | Dynamic from WalletConnect registry |
| **Search/Filter** | None | Built-in search and filters |

---

## Why Other Implementations Are Smoother

### Single-Step vs. Two-Step Authentication

**Other implementations (ether.fi, Uniswap, etc.):**
```
User clicks "Connect Wallet" 
  → WalletConnect modal opens
  → User selects wallet
  → Deep-link opens wallet app
  → User approves connection
  → Wallet app returns to browser
  → ✅ User is logged in (connection approval = signature)
```

**Our current implementation:**
```
User clicks "Nova Wallet"
  → Custom deep-link opens Nova
  → User approves connection
  → Returns to browser
  → App detects connection
  → App requests separate signature
  → User must approve signature in wallet again
  → ✅ User is logged in
```

### Key Difference: Connection Approval = Signature

In elegant implementations, the **WalletConnect connection approval itself serves as the authentication signature**. The dApp doesn't request a separate signature because:

1. **WalletConnect session establishment is cryptographically secure**
   - The connection handshake includes cryptographic proof
   - The wallet's approval of the connection is sufficient authentication

2. **Better UX**
   - One approval instead of two
   - Faster login flow
   - Less friction

3. **Industry Standard**
   - Most dApps use WalletConnect connection as authentication
   - Users expect this pattern

### Why We Have Two Steps

Our current implementation separates connection and signature because:

1. **Polkadot/Substrate Specificity**
   - We're using `polkadot_signMessage` method explicitly
   - This requires a separate signature request after connection

2. **Backend Verification**
   - Our backend expects a signed message for authentication
   - We verify the signature server-side

3. **Custom Auth Flow**
   - We generate a custom sign-in message
   - We need explicit signature of that message

---

## What It Takes to Get There

### Option 1: Use WalletConnect Connection as Authentication (Recommended)

**Changes Required:**

1. **Modify Backend Auth**
   - Accept WalletConnect session approval as authentication
   - Use session metadata (wallet address, connection proof) instead of signature
   - Verify connection through WalletConnect's session validation

2. **Update Frontend Flow**
   - Remove separate signature request after connection
   - Treat successful WalletConnect connection as logged-in state
   - Store session info instead of signature

3. **Use WalletConnect Modal**
   - Replace custom mobile panel with `@walletconnect/modal`
   - Let WalletConnect handle wallet discovery and UI
   - Use their built-in search, filters, and wallet registry

**Implementation Steps:**

```typescript
// 1. Use WalletConnect Modal instead of custom UI
import { WalletConnectModal } from '@walletconnect/modal';

const modal = new WalletConnectModal({
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [POLKADOT_CHAIN_ID],
  enableExplorer: true, // Shows full wallet registry
});

// 2. Single connection flow
const { uri, approval } = await signClient.connect({
  optionalNamespaces: {
    polkadot: { /* ... */ }
  }
});

await modal.openModal({ uri });

// 3. On approval, treat as authenticated
const session = await approval();
// session.namespaces.polkadot.accounts contains addresses
// Use session.topic as auth token
```

**Pros:**
- ✅ Industry-standard UX
- ✅ Single-step authentication
- ✅ Built-in wallet discovery
- ✅ Less code to maintain

**Cons:**
- ❌ Requires backend changes
- ❌ Need to verify WalletConnect sessions server-side
- ❌ Less control over UI (but WalletConnect Modal is customisable)

### Option 2: Keep Two-Step but Improve UX

**Changes Required:**

1. **Use WalletConnect Modal for Selection**
   - Replace custom panel with official modal
   - Keep separate signature step but make it smoother

2. **Auto-Request Signature**
   - Immediately request signature after connection detected
   - Show clear "Approve signature in wallet" message
   - Auto-detect when signature is approved

3. **Better State Management**
   - Clear loading states
   - Better error messages
   - Smoother transitions

**Pros:**
- ✅ No backend changes needed
- ✅ Better UX than current
- ✅ Still uses signature verification

**Cons:**
- ❌ Still two-step (slower than ideal)
- ❌ More complex state management

### Option 3: Hybrid Approach

**Changes Required:**

1. **Use WalletConnect Modal for Selection**
   - Let users choose wallet via official modal

2. **Conditional Signature**
   - For WalletConnect connections: Use session as auth
   - For extension connections: Still require signature
   - Backend handles both cases

**Pros:**
- ✅ Best of both worlds
- ✅ WalletConnect = fast, Extensions = secure

**Cons:**
- ❌ Most complex to implement
- ❌ Two different auth flows to maintain

---

## Recommended Path Forward

### Phase 1: Fix Immediate Issue (Nova Button)
1. Add error handling for dynamic imports
2. Fix URI state management
3. Ensure deep-link happens after URI is ready
4. Add CSP checks

### Phase 2: Implement WalletConnect Modal
1. Replace custom mobile panel with `@walletconnect/modal`
2. Use WalletConnect's wallet registry
3. Enable search and filters
4. Keep current two-step auth for now

### Phase 3: Optimise Authentication (Future)
1. Research WalletConnect session validation
2. Update backend to accept session-based auth
3. Remove separate signature step for WalletConnect
4. Keep signature for extension connections

---

## Technical Requirements

### Dependencies Needed
- `@walletconnect/modal` (already installed ✅)
- `@walletconnect/types` (already installed ✅)

### Backend Changes (Phase 3)
- New endpoint: `POST /api/auth/walletconnect/verify`
- Verify WalletConnect session validity
- Extract address from session
- Issue JWT token

### Frontend Changes
- Replace `MobileWalletConnectPanel` with `WalletConnectModal`
- Update `AccountContext` to handle session-based auth
- Remove signature request after WalletConnect connection
- Update `AuthContext` to support session-based login

---

## Code Examples

### Using WalletConnect Modal (Phase 2)

```typescript
// SignInScreen.tsx
import { WalletConnectModal } from '@walletconnect/modal';

const handleConnectWallet = async () => {
  const client = await initWalletConnect();
  const { uri, approval } = await client.connect({
    optionalNamespaces: {
      polkadot: {
        methods: ['polkadot_signMessage'],
        chains: [POLKADOT_CHAIN_ID],
        events: ['chainChanged', 'accountsChanged'],
      },
    },
  });

  // Open WalletConnect modal (shows all wallets)
  const modal = new WalletConnectModal({
    projectId: WALLETCONNECT_PROJECT_ID,
    chains: [POLKADOT_CHAIN_ID],
    enableExplorer: true,
  });

  await modal.openModal({ uri });

  // Wait for approval
  const session = await approval();
  await modal.closeModal();

  // Extract address
  const address = extractAddressFromSession(session);

  // Continue with signature (Phase 2) or use session (Phase 3)
};
```

### Session-Based Auth (Phase 3)

```typescript
// Backend: /api/auth/walletconnect/verify
async function verifyWalletConnectSession(req, res) {
  const { sessionTopic, walletAddress } = req.body;

  // Verify session is valid via WalletConnect API
  const isValid = await verifySessionWithWalletConnect(sessionTopic);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Create/retrieve user
  const user = await findOrCreateUser(walletAddress);

  // Issue JWT
  const token = generateJWT(user);

  return res.json({ user, token });
}
```

---

## Summary

**Immediate Issue:** Nova button fails due to dynamic import error and URI state race condition.

**Path to Elegant Implementation:**
1. Fix current bugs (Phase 1)
2. Adopt WalletConnect Modal (Phase 2)
3. Move to session-based auth (Phase 3)

**Key Insight:** Other implementations are smoother because they use WalletConnect connection approval as authentication, eliminating the separate signature step. We can achieve this by verifying WalletConnect sessions server-side instead of requiring explicit message signatures.

