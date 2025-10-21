# Quick Actions Grid - Implementation Summary

**Date:** October 13, 2025  
**Feature:** MetaMask-style Quick Action Buttons

---

## Overview

Added a 4-button quick action grid to the **PotsHome** screen, inspired by MetaMask's clean action button layout. This provides fast access to the most common ChopDot workflows directly from the main screen.

---

## Button Selection

We chose the **4 most relevant actions** for ChopDot:

### 1. **Add Expense** 🧾
- **Icon:** Receipt
- **Color:** Pink (`var(--accent)`)  // Orange deprecated; use accent
- **Action:** Opens expense creation flow
  - Single pot → Go directly to AddExpense
  - Multiple pots → Show pot selector
  - No pots → "Create a pot first!" toast

### 2. **Settle** ↔️
- **Icon:** ArrowLeftRight (swap arrows)
- **Color:** Pink (`var(--accent)`)
- **Action:** Navigate to settlement flow
  - Has balances → Navigate to PeopleHome
  - No balances → "Nothing to settle yet" toast

### 3. **Scan** 📷
- **Icon:** QrCode
- **Color:** Gray (`var(--muted)`)
- **Action:** Opens QR code scanner
  - Scan member invite codes
  - Scan payment requests
  - Quick add to pots

### 4. **Request** 💸
- **Icon:** Send
- **Color:** Green (`var(--success)`)
- **Action:** Request payment from people who owe you
  - Opens RequestPayment screen
  - Select person who owes money
  - Add optional message
  - Sends payment request notification

---

## Design System

### Layout
```
Grid: 4 columns, 2px gap
Each button: 
  - Background: var(--secondary)
  - Border radius: 12px (var(--r-xl))
  - Padding: py-4 px-2
```

### Icon Circles
```
Size: w-12 h-12
Shape: Rounded full
Background: Soft color matching action
  - Orange soft: rgba(255, 149, 0, 0.1)
  - Pink soft: rgba(230, 0, 122, 0.1)
  - Gray soft: rgba(142, 142, 147, 0.1)
  - Green soft: rgba(25, 195, 125, 0.1)
```

### Typography
```
Label: text-xs (11px)
Font weight: 500 (medium)
Color: Inherits from theme
```

### Interactions
```
Hover: None (mobile-first)
Active: scale-95 (subtle press feedback)
Haptic: Light feedback on tap
```

---

## Component Changes

### `/components/screens/PotsHome.tsx`

**Imports Added:**
```typescript
import { Receipt, ArrowLeftRight, QrCode, Send } from "lucide-react";
```

**Props Added:**
```typescript
interface PotsHomeProps {
  // ... existing props
  onQuickAddExpense?: () => void;
  onQuickSettle?: () => void;
  onQuickScan?: () => void;
  onQuickRequest?: () => void;
}
```

**UI Placement:**
- Positioned **after** balance summary card
- **Before** search bar and pots list
- Part of main content scroll area

---

## App.tsx Integration

Note: The older inline quick-add and keypad suggestions have been removed. Quick Add now opens a sheet that mirrors the Add/Edit Expense form for consistency.

### onQuickSettle
```typescript
// Navigate to settlement flow
- Has balances → Reset to PeopleHome
- No balances → Toast "Nothing to settle yet"
```

### onQuickScan
```typescript
// Open QR scanner
setShowScanQR(true);
```

### onQuickRequest
```typescript
// Request payment from people who owe you
- Has balances → Navigate to request-payment
- No balances → Toast "Nobody owes you money yet"
```

---

## User Flow Examples

### Flow 1: Quick Add Expense
```
User at PotsHome
  ↓
Tap "Add" button
  ↓ (has multiple pots)
ChoosePot modal appears
  ↓
Select "🏠 SF Roommates"
  ↓
AddExpense screen opens (pre-selected pot)
```

### Flow 2: Quick Settle
```
User at PotsHome
  ↓
Tap "Settle" button
  ↓
Navigate to PeopleHome (People tab)
  ↓
See all balances
  ↓
Tap person to settle
```

### Flow 3: Quick Scan
```
User at PotsHome
  ↓
Tap "Scan" button
  ↓
QR scanner opens
  ↓
Scan friend's invite code
  ↓
Add to pot confirmation
```

### Flow 4: Quick Request
```
User at PotsHome
  ↓
Tap "Request" button
  ↓ (has balances)
RequestPayment screen opens
  ↓
Select person who owes money
  ↓
Optionally add message
  ↓
Tap "Request $XX from [Name]"
  ↓
Notification sent + success animation
  ↓
Auto-close to PotsHome
```

---

## Design Rationale

### Why These 4 Actions?

**Add Expense:**
- Most frequent action (users add expenses daily)
- Currently requires: Pots → Select Pot → Add button
- Quick action saves 2 taps

**Settle:**
- Core app value proposition
- Frequently needed after expense accumulation
- Direct access to settlement flow

**Scan:**
- Social/network effect driver
- Utility action for adding members
- QR codes are universal mobile UX

**Request:**
- Social feature placeholder
- Rounds out to 4 buttons (visual balance)
- Future: request confirmations, request payments

### Why NOT These Actions?

**Create Pot:**
- Less frequent (one-time setup)
- Already prominent "+ New Pot" button below

**View History:**
- Less urgent than adding/settling
- Already accessible via tabs

**Payment Methods:**
- Settings/profile action
- Available in YouTab

**Invite:**
- Can be done via Scan QR
- Not needed as separate action

---

## Visual Hierarchy

```
┌─────────────────────────────────┐
│  Balance Summary Card           │ ← Primary metric
├─────────────────────────────────┤
│  [Add] [Settle] [Scan] [Request]│ ← **Quick Actions**
├─────────────────────────────────┤
│  Search bar (if > 3 pots)       │
├─────────────────────────────────┤
│  Pots List                      │
│  • 🏠 SF Roommates              │
│  • 🌴 Bali Trip 2025            │
└─────────────────────────────────┘
```

**Why this placement?**
- **After balance summary:** User sees totals → wants to act
- **Before pots list:** Horizontal action strip breaks up vertical scroll
- **Consistent with MetaMask:** Actions below main metric, above asset list

---

## Accessibility & UX

### Touch Targets
- Each button: ~88px tall (meets 44px minimum)
- 2px gap between buttons (prevents accidental taps)
- Full button is tappable (not just icon)

### Visual Feedback
- Active state: `scale-95` (subtle press)
- Haptic feedback: Light pulse on tap
- Color-coded: Each action has semantic color

### Error States
- Add (no pots): Toast with helpful message
- Settle (no balances): Toast with status
- Request: "Coming soon" toast (future feature)

---

## Files Modified

1. **`/components/screens/PotsHome.tsx`**
   - Added quick action buttons
   - Added new props for callbacks
   - Imported icons

2. **`/App.tsx`**
   - Wired up 4 quick action callbacks
   - Added smart logic (pot selection, navigation)
   - Added haptic feedback

---

## Implemented Features

### ✅ Request Payment (Phase 1 Complete)
- [x] Request money from people who owe you
- [x] Select person with balance breakdown
- [x] Optional message (200 char limit)
- [x] Creates notification
- [x] Success state with auto-close
- [x] Smart empty state handling

## Future Enhancements

### Phase 2: Advanced Request Features
- [ ] Request partial payment (custom amount)
- [ ] Request with due date
- [ ] Request from specific pot only
- [ ] Request history/tracking

### Phase 3: Customization
- [ ] User can reorder buttons
- [ ] User can swap actions (e.g., "Invite" instead of "Request")
- [ ] Adaptive: Hide "Settle" if no balances

### Phase 4: Shortcuts
- [ ] Long-press "Add" → Quick add to last pot
- [ ] Long-press "Settle" → Settle with top person
- [ ] 3D Touch support (iOS)

---

## Metrics to Track

**Adoption:**
- % of expenses added via quick action vs pot detail
- % of settlements initiated via quick action
- QR scans from home screen vs other flows

**Efficiency:**
- Average time to add expense (before/after)
- Average taps to settlement (before/after)

**Engagement:**
- Daily active users using quick actions
- Most popular quick action

---

## Summary

Successfully implemented a **4-button quick action grid** on PotsHome, inspired by MetaMask's clean mobile design. The buttons provide **1-tap access** to ChopDot's core workflows:

1. **Add Expense** (orange) - Most frequent action
2. **Settle** (pink) - Core value proposition
3. **Scan QR** (gray) - Social/utility
4. **Request** (green) - Future feature placeholder

The design uses ChopDot's existing color tokens, matches the 12pt radius design language, and provides haptic feedback for a polished mobile experience.
