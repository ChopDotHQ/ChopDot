# ChopDot Second Age Brand Kit

**Last Updated:** December 2025  
**Purpose:** Complete guide to ChopDot's Polkadot Second Age (PSA) design system, inspired by the [Polkadot Second Age brand kit](https://github.com/Tomen/polkadot-second-age-brand-kit)

---

## 🎨 Design Philosophy

ChopDot Second Age embraces a **glassmorphism aesthetic** with:
- ✅ Frosted glass panels with backdrop blur
- ✅ Greyscale colour palette (no bright colours)
- ✅ Subtle inset shadows for depth
- ✅ Pink accent (#FF2867) used sparingly for highlights
- ✅ Rotating background images for visual interest
- ✅ High contrast text for readability

This style can be toggled throughout the app via the `brandVariant` setting, allowing users to switch between the default iOS-style and PSA Glass style.

---

## 🎨 Colour System

### Greyscale Palette

Based on Polkadot Second Age greyscale system:

| Token | Value | Usage |
|-------|-------|-------|
| `--psa-grey-50` | `#FAFAF9` | Lightest background, light mode surface |
| `--psa-grey-100` | `#F5F5F4` | Light mode background |
| `--psa-grey-200` | `#E7E5E4` | Borders, subtle separators |
| `--psa-grey-300` | `#D6D3D1` | Disabled states |
| `--psa-grey-400` | `#A8A29E` | Placeholder text |
| `--psa-grey-500` | `#78716C` | Secondary text |
| `--psa-grey-600` | `#57534E` | Secondary text (dark mode) |
| `--psa-grey-700` | `#57534E` | Alias for grey-600 |
| `--psa-grey-800` | `#292524` | Dark mode surface |
| `--psa-grey-900` | `#1C1917` | Primary text (light mode) |
| `--psa-grey-950` | `#0F0F0F` | Dark mode background |

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--psa-bg-light` | `#FAFAF9` | App background |
| `--psa-surface-light` | `rgba(255, 255, 255, 0.2)` | Glass panels |
| `--psa-text-primary-light` | `#1C1917` | Primary text |
| `--psa-text-secondary-light` | `#57534E` | Secondary text |
| `--psa-border-light` | `rgba(255, 255, 255, 0.3)` | Glass panel borders |

### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--psa-bg-dark` | `#0F0F0F` | App background (near black) |
| `--psa-surface-dark` | `rgba(255, 255, 255, 0.15)` | Glass panels |
| `--psa-text-primary-dark` | `#FAFAF9` | Primary text |
| `--psa-text-secondary-dark` | `rgba(250, 250, 249, 0.85)` | Secondary text |
| `--psa-border-dark` | `rgba(255, 255, 255, 0.2)` | Glass panel borders |

### Accent Colour

**Pink Accent:** `#FF2867` / `rgb(255, 40, 103)`

- Use sparingly for highlights and calls-to-action
- Never use for large backgrounds or body text
- Reserved for active states, selections, and focus indicators

---

## 🔤 Typography

### Font Families

**DM Sans** (Primary)
- Weights: 300, 400, 500, 600, 700
- Use for: Body text, UI elements, headings

**DM Serif Display** (Display)
- Weight: 400 (normal & italic)
- Use for: Special headings and display text

### Typography Scale

Same as default ChopDot system, but with adjusted weights for PSA:

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-screen-title` | `17px` | `600-700` | Screen headers |
| `--text-section-heading` | `15px` | `600` | Section headers |
| `--text-body` | `15px` | `400` | Body text |
| `--text-label` | `13px` | `400` | Form labels |
| `--text-caption` | `12px` | `400` | Supporting text |

---

## 🪟 Glassmorphism System

### Panel Styles

PSA uses frosted glass panels with backdrop blur and inset shadows:

#### Light Mode Panel
```css
background: rgba(255, 255, 255, 0.2);
border: 1px solid rgba(255, 255, 255, 0.3);
backdrop-filter: blur(16px) saturate(120%);
box-shadow: 
  0 10px 40px rgba(0, 0, 0, 0.08),
  inset 0 1px 1px rgba(255, 255, 255, 0.7),
  inset 0 -1px 20px rgba(255, 255, 255, 0.1);
```

#### Dark Mode Panel
```css
background: rgba(255, 255, 255, 0.15);
border: 1px solid rgba(255, 255, 255, 0.2);
backdrop-filter: blur(16px) saturate(120%);
box-shadow: 
  0 10px 40px rgba(0, 0, 0, 0.15),
  inset 0 1px 1px rgba(255, 255, 255, 0.7),
  inset 0 -1px 20px rgba(255, 255, 255, 0.1);
```

### Card Variants

#### Standard Card (Light)
```css
background: rgba(255, 255, 255, 0.5);
hoverBackground: rgba(255, 255, 255, 0.7);
borderColor: rgba(255, 255, 255, 0.4);
```

#### Standard Card (Dark)
```css
background: rgba(28, 25, 23, 0.4);
hoverBackground: rgba(40, 36, 33, 0.6);
borderColor: rgba(255, 255, 255, 0.2);
```

#### Guest Card (Light)
```css
background: rgba(0, 0, 0, 0.04);
hoverBackground: rgba(0, 0, 0, 0.06);
borderColor: rgba(0, 0, 0, 0.15);
```

#### Guest Card (Dark)
```css
background: rgba(255, 255, 255, 0.08);
hoverBackground: rgba(255, 255, 255, 0.12);
borderColor: rgba(255, 255, 255, 0.25);
```

---

## 🖼️ Backgrounds

### Rotating Background Images

PSA uses a set of rotating background images that change every 12 seconds:

- `/assets/background-polka-a.png`
- `/assets/background-polka-b.png`
- `/assets/background-polka-c.png`
- `/assets/background-polka-d.png`

### Fallback Gradients

If images fail to load, use these gradients:

#### Light Mode Fallback
```css
background: 
  radial-gradient(ellipse at 20% 50%, rgba(0, 0, 0, 0.03) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 80%, rgba(0, 0, 0, 0.02) 0%, transparent 50%),
  radial-gradient(ellipse at 40% 20%, rgba(0, 0, 0, 0.01) 0%, transparent 50%),
  linear-gradient(135deg, #F5F5F5 0%, #FAFAF9 50%, #F5F5F5 100%);
```

#### Dark Mode Fallback
```css
background: 
  radial-gradient(ellipse at 20% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 80%, rgba(255, 255, 255, 0.06) 0%, transparent 50%),
  radial-gradient(ellipse at 40% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 50%),
  linear-gradient(135deg, #050505 0%, #0A0A0A 50%, #050505 100%);
```

---

## 🎯 Usage Guidelines

### When to Use PSA Style

- ✅ Login/sign-in screens
- ✅ Modal overlays
- ✅ Settings panels
- ✅ Navigation drawers
- ✅ Premium features

### When NOT to Use PSA Style

- ❌ Main content areas (use default for readability)
- ❌ Forms with many inputs (glass can reduce contrast)
- ❌ Data-heavy tables
- ❌ Long-form reading content

### Toggle Mechanism

PSA style is controlled via the `brandVariant` setting:

```typescript
import { useTheme } from '@/utils/useTheme';

const { brandVariant, setBrandVariant } = useTheme();

// Check if PSA is active
const isPSA = brandVariant === 'polkadot-second-age';

// Toggle PSA
setBrandVariant('polkadot-second-age'); // Enable
setBrandVariant('default'); // Disable
```

### Conditional Styling Hook

Use the `usePSAStyle` hook for conditional PSA styling:

```typescript
import { usePSAStyle } from '@/utils/usePSAStyle';

const { isPSA, psaStyles } = usePSAStyle();

<div
  className={isPSA ? 'psa-glass-panel' : 'card'}
  style={isPSA ? psaStyles.panel : undefined}
>
  Content
</div>
```

---

## 📐 Spacing & Layout

Same spacing system as default ChopDot:

| Token | Value | Usage |
|-------|-------|-------|
| `--space-page` | `16px` | Page padding |
| `--space-card` | `16px` | Card padding |
| `--space-row` | `12px` | List row padding |
| `--space-section` | `24px` | Section spacing |

---

## 🔲 Border Radius

Same radius system as default:

| Token | Value | Usage |
|-------|-------|-------|
| `--r-lg` | `12px` | Buttons, inputs, list items |
| `--r-xl` | `16px` | Cards |
| `--r-2xl` | `24px` | Hero cards, modals |

---

## 🎨 Shadow System

PSA uses a more pronounced shadow system with inset highlights:

### Panel Shadows

**Light Mode:**
```css
box-shadow: 
  0 10px 40px rgba(0, 0, 0, 0.08),
  inset 0 1px 1px rgba(255, 255, 255, 0.7),
  inset 0 -1px 20px rgba(255, 255, 255, 0.1);
```

**Dark Mode:**
```css
box-shadow: 
  0 10px 40px rgba(0, 0, 0, 0.15),
  inset 0 1px 1px rgba(255, 255, 255, 0.7),
  inset 0 -1px 20px rgba(255, 255, 255, 0.1);
```

### Card Shadows

**Light Mode:**
```css
box-shadow: 
  0 4px 16px rgba(0, 0, 0, 0.08),
  inset 0 1px 1px rgba(255, 255, 255, 0.7),
  inset 0 -1px 10px rgba(255, 255, 255, 0.15);
```

**Dark Mode:**
```css
box-shadow: 
  0 4px 16px rgba(0, 0, 0, 0.2),
  inset 0 1px 1px rgba(255, 255, 255, 0.3),
  inset 0 -1px 10px rgba(255, 255, 255, 0.08);
```

---

## 🎯 Component Examples

### Glass Panel Component

```tsx
import { usePSAStyle } from '@/utils/usePSAStyle';
import { useTheme } from '@/utils/useTheme';

function GlassPanel({ children }: { children: React.ReactNode }) {
  const { isPSA, psaStyles } = usePSAStyle();
  const { resolvedTheme } = useTheme();

  if (!isPSA) {
    return <div className="card">{children}</div>;
  }

  return (
    <div
      className="psa-glass-panel"
      style={psaStyles.panel}
    >
      {children}
    </div>
  );
}
```

### Conditional Card Styling

```tsx
import { usePSAStyle } from '@/utils/usePSAStyle';

function MyCard() {
  const { isPSA, psaStyles } = usePSAStyle();

  return (
    <div
      className={isPSA ? 'psa-glass-card' : 'card'}
      style={isPSA ? psaStyles.card : undefined}
    >
      Content
    </div>
  );
}
```

---

## 🔄 Migration Checklist

When applying PSA style to a new component:

- [ ] Check if component should use PSA (see usage guidelines)
- [ ] Import `usePSAStyle` hook
- [ ] Conditionally apply PSA classes/styles
- [ ] Test in both light and dark modes
- [ ] Verify backdrop blur works correctly
- [ ] Check text contrast meets accessibility standards
- [ ] Ensure fallback styles work when PSA is disabled
- [ ] Test toggle between default and PSA styles

---

## 📚 References

- [Polkadot Second Age Brand Kit](https://github.com/Tomen/polkadot-second-age-brand-kit)
- [ChopDot Design Tokens](./DESIGN_TOKENS.md)
- [ChopDot Guidelines](./guidelines/Guidelines.md)

---

## 🎨 Design Principles

1. **Glassmorphism First**: PSA prioritises frosted glass aesthetics over solid backgrounds
2. **Greyscale Palette**: No bright colours except pink accent
3. **High Contrast**: Text must remain readable on glass backgrounds
4. **Subtle Depth**: Inset shadows create depth without being overwhelming
5. **Smooth Transitions**: All style changes should animate smoothly
6. **Accessibility**: Maintain WCAG AA contrast ratios
7. **Performance**: Backdrop blur can be expensive; use sparingly on mobile

---

**Questions?** See `/src/utils/usePSAStyle.ts` for implementation details, or check `/src/components/screens/SignInScreen.tsx` for a complete PSA implementation example.
