# PSA Style Quick Reference Guide

**Quick guide for applying Polkadot Second Age (PSA) glassmorphism styles to components.**

---

## 🚀 Quick Start

### 1. Import the Hook

```tsx
import { usePSAStyle } from '@/utils/usePSAStyle';
```

### 2. Use in Your Component

```tsx
function MyComponent() {
  const { isPSA, psaStyles, psaClasses } = usePSAStyle();

  return (
    <div
      className={isPSA ? psaClasses.card : 'card'}
      style={isPSA ? psaStyles.card : undefined}
    >
      Content
    </div>
  );
}
```

---

## 📦 Available Styles

### Panel Styles
For main panels and overlays:

```tsx
<div
  className={isPSA ? psaClasses.panel : 'card'}
  style={isPSA ? psaStyles.panel : undefined}
>
```

### Card Styles
For standard cards with hover effects:

```tsx
<div
  className={isPSA ? psaClasses.card : 'card'}
  style={isPSA ? psaStyles.card : undefined}
  onMouseEnter={(e) => {
    if (isPSA) {
      Object.assign(e.currentTarget.style, psaStyles.cardHover);
    }
  }}
  onMouseLeave={(e) => {
    if (isPSA) {
      Object.assign(e.currentTarget.style, psaStyles.card);
    }
  }}
>
```

### Guest Card Styles
For login/guest cards:

```tsx
<div
  className={isPSA ? psaClasses.guestCard : 'card'}
  style={isPSA ? psaStyles.guestCard : undefined}
>
```

---

## 🎯 Common Patterns

### Conditional Background

```tsx
const { isPSA, psaStyles } = usePSAStyle();

<div style={isPSA ? psaStyles.background : undefined}>
  Content
</div>
```

### Conditional Class Names

```tsx
const { isPSA, psaClasses } = usePSAStyle();

<div className={isPSA ? psaClasses.panel : 'card space-card'}>
  Content
</div>
```

### Combining with Existing Styles

```tsx
const { isPSA, psaStyles } = usePSAStyle();

<div
  className="card"
  style={{
    ...(isPSA ? psaStyles.card : {}),
    // Your additional styles
    padding: '16px',
  }}
>
```

---

## ⚠️ Important Notes

1. **Always provide fallback**: PSA styles are optional - always provide default styles
2. **Test both modes**: Verify your component works in both default and PSA styles
3. **Performance**: Backdrop blur can be expensive on mobile - use sparingly
4. **Accessibility**: Ensure text contrast meets WCAG AA standards in PSA mode
5. **Not for all components**: See brand kit guidelines for when to use PSA

---

## 📚 Full Documentation

- **Complete Brand Kit**: [`/CHOPDOT_SECOND_AGE_BRAND_KIT.md`](../CHOPDOT_SECOND_AGE_BRAND_KIT.md)
- **Design Tokens**: [`/DESIGN_TOKENS.md`](../DESIGN_TOKENS.md)
- **Implementation Example**: [`/components/screens/SignInScreen.tsx`](../components/screens/SignInScreen.tsx)

---

## 🔄 Toggle Mechanism

Users can toggle PSA style in Settings:

```tsx
import { useTheme } from '@/utils/useTheme';

const { brandVariant, setBrandVariant } = useTheme();

// Check if PSA is active
const isPSA = brandVariant === 'polkadot-second-age';

// Toggle PSA
setBrandVariant('polkadot-second-age'); // Enable
setBrandVariant('default'); // Disable
```

---

## ✅ Checklist

When adding PSA styles to a component:

- [ ] Import `usePSAStyle` hook
- [ ] Conditionally apply PSA classes/styles
- [ ] Provide fallback to default styles
- [ ] Test in light mode
- [ ] Test in dark mode
- [ ] Verify text contrast
- [ ] Test toggle between styles
- [ ] Check mobile performance

---

**Questions?** See the full brand kit documentation or check existing implementations in `SignInScreen.tsx`.
