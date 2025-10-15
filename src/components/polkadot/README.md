# Polkadot Components for ChopDot

This directory contains blockchain-specific UI components adapted for ChopDot's compact iOS design language.

## Philosophy

These components borrow **functional patterns** from Polkadot UI (wallet connection, address display, balance formatting) while maintaining **ChopDot's visual style**:

- ✅ ChopDot's 12px/16px radii (not Polkadot's 16px/20px)
- ✅ ChopDot's compact 15px body text (not Polkadot's 16px)
- ✅ ChopDot's tight 16px page spacing (not Polkadot's 20px)
- ✅ ChopDot's minimal shadows and clean cards
- ✅ ChopDot's theme system (light/dark)

## Components

### ConnectWallet

**Purpose:** Blockchain wallet connection with multiple states

**Props:**
```tsx
interface ConnectWalletProps {
  state?: "idle" | "connecting" | "connected" | "error";
  address?: string;           // Shortened wallet address
  network?: string;           // "Polkadot", "Kusama", etc.
  balance?: number;           // DOT balance
  errorMessage?: string;
  onConnect?: (walletId: string) => void;
  onDisconnect?: () => void;
  variant?: "banner" | "sheet";  // Compact or full UI
}
```

**Usage in SettleDOT:**
```tsx
<ConnectWallet
  state={walletState}
  address={walletState === "connected" ? "5GrwvaEF...fhQ9" : undefined}
  network="Polkadot"
  balance={245.8432}
  onConnect={handleConnect}
  onDisconnect={handleDisconnect}
  variant="banner"
/>
```

**States:**
- **Idle:** Shows "Connect" button
- **Connecting:** Animated pulse with "Approve connection in your wallet"
- **Connected:** Shows identicon, address, network badge, balance
- **Error:** Shows error message with retry button

**Styling:**
- Uses `var(--card)`, `var(--r-xl)`, `var(--accent)` from ChopDot tokens
- 15px body text, 13px labels (ChopDot standard)
- Barely-visible shadows (`var(--shadow-card)`)
- Polkadot pink (`#E6007A`) for accents only

## Future Components

**Priority 2 (when needed):**
- `AccountInfo` - Standalone wallet display card
- `BalanceDisplay` - Properly formatted DOT amounts with decimals
- `TxButton` - Transaction status button with states

**Priority 3 (nice-to-have):**
- `NetworkIndicator` - Chain status, block height, latency
- `TxToast` - Transaction notification toasts

**Not needed:**
- `SelectToken` - ChopDot only supports DOT
- `AddressInput` - ChopDot uses QR scanning
- `RequireConnection` - WalletBanner already handles this

## Design Tokens

This directory **does NOT introduce new design tokens**. All styling uses ChopDot's existing system from `/styles/globals.css`:

```css
--card: #FFFFFF (light) / #1C1C1E (dark)
--r-xl: 16px
--space-card: 16px
--accent: #E6007A (Polkadot pink)
--text-body: 15px
--text-label: 13px
```

## Integration Checklist

When adding a new Polkadot component:

- [ ] Use ChopDot's existing design tokens (no new CSS variables)
- [ ] Match ChopDot's typography (15px body, 13px labels)
- [ ] Support light/dark theme via existing theme system
- [ ] Add haptic feedback for interactions
- [ ] Test on iPhone 15 dimensions (390×844)
- [ ] Ensure component feels native, not "bolted on"
