# ChopDot Quick Reference

**Quick lookup for developers working on ChopDot.**

---

## 🎨 Design Tokens (globals.css)

### Colors
```css
--bg: #F2F2F7         /* iOS system gray background */
--card: #FFFFFF        /* Pure white cards */
--ink: #000000         /* Primary text */
--muted: #8E8E93       /* Secondary text/icons */
--text-secondary: #606066  /* Important secondary text (better contrast) */
--accent-pink: #E6007A     /* Polkadot pink (use sparingly) */
--money: #19C37D           /* Mint for money/positive values */
--accent: #E6007A          /* Polkadot pink - brand CTAs */
--success: #19C37D         /* Green for success */
--danger: #E5484D          /* Red for destructive actions */
```

### Radii
```css
--r-lg: 12px     /* Buttons, inputs, list items */
--r-xl: 16px     /* Cards */
--r-2xl: 24px    /* Hero cards, modals */
```

### Shadows (Level-Based System)
```css
--sh-l1  /* Rows/cards/sheets */
--sh-l2  /* FAB/floating controls */
--sh-l3  /* Hero/dialogs (reserved) */
```

### Typography (Don't override unless needed!)
```css
--text-screen-title: 17px      /* h1 */
--text-section-heading: 15px   /* h2 */
--text-body: 15px              /* p, default */
--text-label: 13px             /* labels */
--text-caption: 12px           /* captions */
--text-micro: 11px             /* smallest text */
```

---

## 🧩 Component Utilities

### Card Styles
```tsx
<div className="card">                    {/* Standard card */}
<div className="hero-card">              {/* Large featured card */}
<div className="list-row">               {/* List item row */}
```

### Button Styles
```tsx
<button className="btn-primary">         {/* Black button */}
<button className="btn-accent">          {/* Pink accent button */}
<button className="btn-gradient-orange"> {/* Orange gradient CTA */}
```

### Text Colors
```tsx
<p className="text-muted">               {/* #8E8E93 - secondary */}
<p className="text-secondary">           {/* #606066 - better contrast */}
<p className="text-accent">              {/* #E6007A - pink accent */}
```

---

## 🗂️ App.tsx Structure

### Data Flow
```
1. Authentication (AuthContext)
   ↓
2. Navigation (useNav hook)
   ↓
3. Data Loading (localStorage → useState)
   ↓
4. Computed State (useMemo for balances/activities)
   ↓
5. Screen Rendering (renderScreen() switch)
   ↓
6. UI Components (BottomTabBar, FAB, Modals)
```

### Key State Variables
```typescript
// Current context
currentPotId: string | null           // Active pot
currentExpenseId: string | null       // Active expense
selectedCounterpartyId: string | null // Settlement target

// Data
pots: Pot[]                          // All pots
settlements: Settlement[]            // Settlement history
notifications: Notification[]        // Notifications
paymentMethods: PaymentMethod[]      // Payment methods

// UI state
walletConnected: boolean             // Wallet connection status
showNotifications: boolean           // Notification center visible
showBatchConfirm: boolean            // Batch confirm sheet visible
```

### Key Computed Values (useMemo)
```typescript
balances        // Settlement calculations (owedToYou, youOwe)
activities      // Combined timeline (expenses + attestations)
pendingExpenses // Expenses needing confirmation
youTabInsights  // Reliability metrics
```

---

## 🔧 Common Operations

### Add New Screen
1. Add type to `nav.ts`:
   ```typescript
   | { type: "my-screen"; myParam?: string }
   ```

2. Add case to `renderScreen()` in `App.tsx`:
   ```typescript
   case "my-screen":
     return <MyScreen onBack={back} />;
   ```

3. Navigate to screen:
   ```typescript
   push({ type: "my-screen", myParam: "value" });
   ```

### Access Current Pot
```typescript
const pot = getCurrentPot();
if (!pot) return null;
```

### Show Toast
```typescript
showToast("Message", "success");  // success | error | info
```

### Trigger Haptic
```typescript
import { triggerHaptic } from "./utils/haptics";
triggerHaptic('light');  // light | medium | heavy
```

### Update Pot Data
```typescript
setPots(pots.map(p => 
  p.id === currentPotId 
    ? { ...p, /* updates */ } 
    : p
));
```

---

## 📦 localStorage Keys

```typescript
'chopdot_pots'           // Pots data (1MB limit)
'chopdot_settlements'    // Settlement history (500KB limit)
'chopdot_notifications'  // Notifications (100KB limit)
```

**Access via debug helpers:**
```javascript
window.ChopDot.showState()        // View all data
window.ChopDot.checkStorageSize() // Check sizes
window.ChopDot.clearAll()         // Clear everything
```

---

## 🎯 Navigation Patterns

### Tab Navigation
```typescript
reset({ type: "pots-home" });      // Go to Pots tab
reset({ type: "people-home" });    // Go to People tab
reset({ type: "activity-home" });  // Go to Activity tab
reset({ type: "you-tab" });        // Go to You tab
```

### Stack Navigation
```typescript
push({ type: "pot-home", potId: "123" });  // Push new screen
back();                                     // Go back
replace({ type: "new-screen" });           // Replace current screen
```

### Modal Patterns
```typescript
setShowModal(true);   // Open modal
setShowModal(false);  // Close modal
```

---

## 🏗️ Component Organization

```
/components/
├── screens/              # Full-screen views
│   ├── *Home.tsx        # Tab home screens
│   ├── Add*.tsx         # Creation flows
│   ├── *Detail.tsx      # Detail views
│   └── *Tab.tsx         # Tab content
├── ui/                  # ShadCN components (don't modify)
├── *.tsx                # Reusable components
└── figma/               # Figma-specific (protected)
```

---

## 🔍 Debug Commands

```javascript
// Performance
window.ChopDot.diagnosePerformance()  // Detailed analysis
window.ChopDot.checkStorageSize()     // Storage usage

// Data
window.ChopDot.showState()            // Current state
window.ChopDot.archiveOldExpenses()   // Archive old data

// Emergency
window.ChopDot.emergencyFix()         // Force clear if frozen
window.ChopDot.clearAll()             // Nuclear reset
```

---

## 📝 Code Style Quick Rules

### DO ✅
- Use semantic HTML elements (h1, h2, p, etc.)
- Use design tokens (`var(--bg)`, `var(--accent)`)
- Use utility classes (`card`, `btn-primary`)
- Add haptic feedback to interactive elements
- Use `useMemo` for expensive calculations
- Add console logs with `[ChopDot]` prefix

### DON'T ❌
- Override typography with Tailwind classes (no `text-2xl`, `font-bold`)
- Use inline styles unless absolutely necessary
- Create glass effects (use clean cards)
- Block UI with synchronous operations
- Duplicate shadcn/ui components
- Modify files in `/components/figma/`

---

## 🚀 Common Patterns

### Empty State
```tsx
import { EmptyState } from "./components/EmptyState";

<EmptyState
  title="No items yet"
  subtitle="Description"
  actionLabel="Create"
  onAction={() => {}}
/>
```

### Input Field
```tsx
import { InputField } from "./components/InputField";

<InputField
  label="Amount"
  type="number"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
/>
```

### Bottom Sheet
```tsx
import { BottomSheet } from "./components/BottomSheet";

{showSheet && (
  <BottomSheet onClose={() => setShowSheet(false)}>
    {/* Content */}
  </BottomSheet>
)}
```

---

## 📚 Related Docs

- [Current State](./CURRENT_STATE.md) - What works, what's next
- [Setup Guide](./SETUP_GUIDE.md) - How to run locally
- [Implementation Docs](./implementation/) - Feature details
- [Guidelines](../guidelines/) - Design system
- [Archive](./archive/) - Historical notes

---

**Last Updated:** October 14, 2025  
**For:** Developers working on ChopDot
