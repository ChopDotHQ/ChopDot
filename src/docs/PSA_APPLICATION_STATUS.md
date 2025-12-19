# PSA Style Application Status

**Last Updated:** December 2025  
**Goal:** Apply PSA (Polkadot Second Age) glassmorphism styles throughout the app while keeping Default and PSA styles completely independent.

---

## ✅ Completed

### Core Infrastructure
- ✅ `usePSAStyle` hook created (`/src/utils/usePSAStyle.ts`)
- ✅ PSA design tokens added to `globals.css`
- ✅ PSA utility classes defined (`.psa-glass-panel`, `.psa-glass-card`, `.psa-glass-guest-card`)
- ✅ Brand variant toggle in Settings and YouTab
- ✅ Brand kit documentation (`/src/CHOPDOT_SECOND_AGE_BRAND_KIT.md`)

### Components with PSA Support
- ✅ **SignInScreen** - Full PSA glassmorphism implementation (reference implementation)
- ✅ **YouTab** - All cards and sections
- ✅ **Settings** - All cards and sections
- ✅ **PotsHome** - Main container, balance cards, quick action buttons, pot cards, invite cards
- ✅ **PeopleHome** - Main container, person cards, overview chips
- ✅ **PeopleView** - Person list cards
- ✅ **PotHome** - Main container, checkpoint cards
- ✅ **ActivityHome** - Main container, balance cards, activity cards, settlement cards
- ✅ **EmptyState** - Empty state cards
- ✅ **WalletBanner** - Wallet balance cards
- ✅ **BottomTabBar** - Bottom navigation bar with glassmorphism
- ✅ **BottomSheet** - Modal sheets (used by SortFilterSheet, HelpSheet, etc.)

---

## 🚧 In Progress / TODO

### Major Screens
- [ ] **PotHome** - Pot detail screen with expenses
- [ ] **PeopleHome** - People/debts screen
- [ ] **ActivityHome** - Activity feed screen
- [ ] **SettleHome** - Settlement screen

### Common Components
- ✅ **TopBar** - Navigation header (minimal styling needed)
- ✅ **BottomTabBar** - Bottom navigation with glassmorphism
- ✅ **WalletBanner** - Wallet connection banner
- ✅ **EmptyState** - Empty state component
- ⚠️ **PrimaryButton** - Buttons use card class but functional styling (left as-is for now)
- ⚠️ **SecondaryButton** - Buttons use card class but functional styling (left as-is for now)

### Modals & Sheets
- ✅ **BottomSheet** - Base sheet component (used by all modals)
- ✅ **SortFilterSheet** - Uses BottomSheet (inherits PSA)
- ✅ **HelpSheet** - Help drawer with PSA cards
- [ ] **AccountMenu** - Account menu dropdown
- [ ] Other drawers and modals (inherit from BottomSheet)

### Form Components
- [ ] **InputField** - Text inputs
- [ ] **SelectField** - Dropdown selects
- [ ] Form containers and validation messages

---

## 📋 Application Pattern

For each component, follow this pattern:

```tsx
import { usePSAStyle } from '@/utils/usePSAStyle';

function MyComponent() {
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();

  return (
    <div 
      className="bg-background"
      style={isPSA ? psaStyles.background : undefined}
    >
      <div 
        className={isPSA ? psaClasses.card : 'card'}
        style={isPSA ? psaStyles.card : undefined}
        onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
        onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
      >
        Content
      </div>
    </div>
  );
}
```

---

## 🎯 Key Principles

1. **Default styles remain unchanged** - When `isPSA === false`, components use exact same classes/styles as before
2. **PSA styles are additive** - PSA styles only apply when `brandVariant === 'polkadot-second-age'`
3. **Complete independence** - Either style can be removed without affecting the other
4. **Learn from SignInScreen** - Use SignInScreen as the reference implementation

---

## 🔍 Verification Checklist

For each component updated:
- [ ] Default style works exactly as before (when PSA is off)
- [ ] PSA style applies correctly (when PSA is on)
- [ ] Hover effects work in PSA mode
- [ ] Background styles apply to main containers
- [ ] No console errors
- [ ] Visual testing in both light and dark modes

---

## 📚 Reference

- **Brand Kit:** `/src/CHOPDOT_SECOND_AGE_BRAND_KIT.md`
- **Quick Guide:** `/src/docs/PSA_STYLE_GUIDE.md`
- **Design Tokens:** `/src/DESIGN_TOKENS.md`
- **Reference Implementation:** `/src/components/screens/SignInScreen.tsx`
