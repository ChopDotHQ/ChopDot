# ChopDot UX/UI Guidelines

**Last Updated:** January 14, 2025  
**Purpose:** Complete design system reference for ChopDot

---

## 📋 Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Shadows](#shadows)
6. [Components & Patterns](#components--patterns)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)
9. [Don'ts & Deprecated](#donts--deprecated)

---

## Design Philosophy

ChopDot uses a **clean iOS-style design language** with:

- ✅ **Pure white cards** (no glass effects)
- ✅ **Minimal shadows** (3-level system)
- ✅ **No borders** (except inputs)
- ✅ **Polkadot pink accent** (used sparingly)
- ✅ **Monochrome + Pink scheme** (black/green/pink); orange is deprecated
- ✅ **Mobile-first** (iPhone 15, 390×844 viewport)
- ✅ **Dark mode support** (system preference + manual toggle)

### Core Principles

1. **Clarity over decoration** - Clean, functional UI
2. **Consistency** - Use design tokens, not arbitrary values
3. **Accessibility** - High contrast, semantic colors
4. **Performance** - Minimal CSS, efficient rendering

---

## Color System

### Primary Tokens

#### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F2F2F7` | App background (iOS system gray) |
| `--card` | `#FFFFFF` | Card/surface background (pure white) |
| `--ink` | `#000000` | Primary text color |
| `--muted` | `#8E8E93` | Tertiary text (timestamps, hints, placeholders) |
| `--text-secondary` | `#606066` | Secondary text (important labels, subtitles) |
| `--accent` | `#E6007A` | Polkadot pink (active states, selections, focus) |
| `--success` | `#19C37D` | Success states, positive balances |
| `--money` | `#19C37D` | Alias of success (use for financial positives) |
| `--danger` | `#E5484D` | Error/destructive states |
| `--border` | `rgba(0, 0, 0, 0.06)` | Subtle separator |

#### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#000000` | Pure black background |
| `--card` | `#1C1C1E` | iOS dark mode card color |
| `--ink` | `#FFFFFF` | White text |
| `--muted` | `#8E8E93` | Same as light mode |
| `--text-secondary` | `#AEAEB2` | Better contrast for dark mode |
| `--border` | `rgba(255, 255, 255, 0.08)` | Subtle white separator |

### Text Color Decision Tree

```
Need to display text?
├─ Is it the main content? → --ink
├─ Is it important but secondary (subtitle, label)? → --text-secondary
└─ Is it supportive/optional (timestamp, hint)? → --muted
```

### Financial Colors (Semantic)

```tsx
// Money owed TO you (+)
style={{ color: 'var(--success)' }}    // Green #19C37D

// Money YOU owe (-)
// Use default text color (ink) with a leading minus sign; no red/orange
style={{ color: 'var(--ink)' }}

// Settled / neutral
style={{ color: 'var(--muted)' }}      // Gray #8E8E93
```

### Brand Accents (Strategic Use)

```tsx
// Polkadot pink (blockchain actions only)
style={{ background: 'var(--accent)' }}     // #E6007A

// Mint green (DeFi/savings only)
style={{ color: 'var(--accent-mint)' }}     // #56F39A
```

**Use `--accent` sparingly for:**
- Active tab indicator
- Selected state
- Focus states (with `--accent-pink-soft` background)

**DO NOT use for:**
- Large backgrounds
- Body text
- Multiple elements on same screen

---

## Typography

### Semantic Typography Scale

ChopDot uses a **6-level semantic typography hierarchy** inspired by iOS and SF Pro.

| Token | Size | Weight | Usage | Utility Class |
|-------|------|--------|-------|---------------|
| `--text-screen-title` | `17px` | `500` | Screen headers, TopBar titles | `.text-screen-title` |
| `--text-section-heading` | `15px` | `500` | Section headers, card headers | `.text-section` |
| `--text-body` | `15px` | `400` | Body text (default) | `.text-body` |
| `--text-label` | `13px` | `400` | Form labels, small text | `.text-label` |
| `--text-caption` | `12px` | `400` | Supporting text, fine print | `.text-caption` |
| `--text-micro` | `11px` | `400` | Tiny labels, badges | `.text-micro` |

### Typography Usage

```tsx
// Screen title (TopBar)
<h1 className="text-screen-title">Pots</h1>

// Section heading
<h3 className="text-section">Recent Activity</h3>

// Body text
<p className="text-body">This is body text</p>

// Labels
<p className="text-label text-secondary">Total expenses</p>

// Captions
<p className="text-caption text-muted">Last updated 2 hours ago</p>

// Micro text
<span className="text-micro">Badge</span>
```

### Financial Text

```tsx
// Standard amount
<p className="text-body tabular-nums" style={{ fontWeight: 500 }}>
  $45.50
</p>

// Positive balance (owed to you)
<p className="text-body tabular-nums" style={{ fontWeight: 500, color: 'var(--success)' }}>
  +$45.50
</p>

// Negative balance (you owe)
<p className="text-body tabular-nums" style={{ fontWeight: 500, color: 'var(--ink)' }}>
  -$32.00
</p>

// Large hero number
<p className="text-[32px] tabular-nums" style={{ fontWeight: 600 }}>
  $1,234.56
</p>
```

**Key Rules:**
- ✅ Use `tabular-nums` for financial amounts (aligned digits)
- ✅ Use medium/semibold weights (500-600) for numbers
- ✅ Use semantic classes, not arbitrary sizes

---

## Spacing

### Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--space-page` | `16px` | Page padding |
| `--space-card` | `16px` | Card padding |
| `--space-row` | `12px` | List row padding |
| `--space-section` | `24px` | Section spacing |

### Spacing Usage

```tsx
// Page padding
className="p-4"                    // 16px all sides

// Card internal
className="p-3"                    // 12px all sides (compact)
className="p-4"                    // 16px all sides (standard)

// Vertical stacks
className="space-y-2"              // 8px gaps (tight)
className="space-y-3"              // 12px gaps (standard)
className="space-y-4"              // 16px gaps (loose)
```

---

## Shadows

### Shadow System (3-Level Hierarchy)

#### Level 1: Base Definitions (DO NOT USE DIRECTLY)

Raw shadow values - always use semantic aliases instead:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--sh-l1` | `0 0.5px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` | `0 1px 3px rgba(0,0,0,0.4)` |
| `--sh-l2` | `0 2px 8px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)` | `0 4px 12px rgba(0,0,0,0.5)` |
| `--sh-l3` | `0 4px 16px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)` | `0 6px 20px rgba(0,0,0,0.6)` |

#### Level 2: Semantic Aliases (USE IN CUSTOM CSS)

Purpose-based names:

| Token | Maps To | Usage |
|-------|---------|-------|
| `--shadow-card` | `var(--sh-l1)` | Cards, list rows, sheets |
| `--shadow-fab` | `var(--sh-l2)` | Floating buttons, dropdowns |
| `--shadow-elev` | `var(--sh-l3)` | Modals, dialogs (reserved) |

#### Level 3: Utility Classes (EASIEST - RECOMMENDED)

Predefined classes with shadow included:

| Class | Shadow | Usage |
|-------|--------|-------|
| `.card` | `--shadow-card` | Standard cards (16px radius) |
| `.hero-card` | `--shadow-card` | Hero elements (24px radius) |
| `.list-row` | `--shadow-card` | List items (12px radius) |
| `.fab` | `--shadow-fab` | Floating action button |

**Example:**
```tsx
// ❌ DON'T: Use raw shadow tokens
<div style={{ boxShadow: 'var(--sh-l1)' }}>...</div>

// ✅ GOOD: Use semantic alias
<div style={{ boxShadow: 'var(--shadow-card)' }}>...</div>

// ✅ BEST: Use utility class (includes background, radius, shadow)
<div className="card">...</div>
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--r-lg` | `12px` | Buttons, inputs, list items |
| `--r-xl` | `16px` | Cards |
| `--r-2xl` | `24px` | Hero cards, modals |

---

## Components & Patterns

### Cards

```tsx
// Standard card (static)
<div className="card p-4">
  {/* content */}
</div>

// Interactive card (clickable, navigates)
<div className="card card-hover-lift p-4 hover:shadow-[var(--shadow-fab)] transition-all duration-200">
  {/* content */}
</div>

// Hero card (prominent)
<div className="hero-card p-4">
  {/* content */}
</div>

// List row
<div className="list-row p-3">
  {/* content */}
</div>
```

**Card Interaction Rules:**
- **Static cards:** Use `.card` only (balance summaries, info displays)
- **Interactive cards:** Add `.card-hover-lift` class (pot cards, expense cards, settlement cards)
- **Hover shadow:** Add `hover:shadow-[var(--shadow-fab)]` for visual feedback
- **Transition:** Always include `transition-all duration-200` or `transition-shadow duration-200`

### Buttons

**⚠️ IMPORTANT:** Use `PrimaryButton` and `SecondaryButton` components for consistency.

```tsx
// ✅ RECOMMENDED: Use PrimaryButton component
import { PrimaryButton } from '../PrimaryButton';
<PrimaryButton onClick={handleSave}>Save</PrimaryButton>
<PrimaryButton variant="gradient" onClick={handleSettle}>Settle</PrimaryButton>

// ✅ RECOMMENDED: Use SecondaryButton component
import { SecondaryButton } from '../SecondaryButton';
<SecondaryButton onClick={handleCancel}>Cancel</SecondaryButton>

// ⚠️ ACCEPTABLE: Button utility classes (for simple cases)
<button className="btn-primary px-4 py-2.5 rounded-[var(--r-lg)]">
  Save
</button>

<button className="btn-accent px-4 py-2.5 rounded-[var(--r-lg)]">
  Attest on Polkadot
</button>

// ❌ AVOID: Custom button elements (use components instead)
<button className="card hover:bg-muted/50 px-4 py-2.5 rounded-xl border border-border">
  Cancel
</button>

// Destructive actions
<button className="px-4 py-2.5 rounded-[var(--r-lg)]" style={{ background: 'var(--danger)', color: '#fff' }}>
  Delete
</button>
```

**Button Usage Guidelines:**
- **Primary actions:** Use `<PrimaryButton>` component
- **Secondary actions:** Use `<SecondaryButton>` component
- **Accent actions (blockchain):** Use `<PrimaryButton variant="gradient">` or `btn-accent` class
- **Destructive actions:** Use inline style with `var(--danger)`
- **Avoid:** Creating custom button elements - use components for consistency

**Quick Actions Grid Pattern (4-button layout):**

For quick action grids (like PotsHome), use a 3-tier visual hierarchy:

```tsx
{/* Primary Action - Most Important */}
<button
  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95"
  style={{ 
    background: 'var(--accent)',
    boxShadow: '0 2px 8px rgba(230, 0, 122, 0.25)'
  }}
>
  <div 
    className="w-10 h-10 rounded-full flex items-center justify-center"
    style={{ background: 'rgba(255, 255, 255, 0.2)' }}
  >
    <Icon className="w-5 h-5 text-white" />
  </div>
  <span className="text-caption text-white" style={{ fontWeight: 500 }}>Label</span>
</button>

{/* Secondary Action - Important but less prominent */}
<button
  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card hover:shadow-[var(--shadow-fab)]"
>
  <div 
    className="w-10 h-10 rounded-full flex items-center justify-center"
    style={{ background: 'rgba(142, 142, 147, 0.1)' }}
  >
    <Icon className="w-5 h-5" style={{ color: 'var(--ink)' }} />
  </div>
  <span className="text-caption text-foreground">Label</span>
</button>

{/* Tertiary Action - Less frequently used */}
<button
  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95 card hover:shadow-[var(--shadow-fab)]"
>
  <div 
    className="w-10 h-10 rounded-full flex items-center justify-center"
    style={{ background: 'rgba(142, 142, 147, 0.1)' }}
  >
    <Icon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
  </div>
  <span className="text-caption text-secondary">Label</span>
</button>
```

**Quick Actions Hierarchy Rules:**
1. **Primary (1 button):** Pink accent background (`var(--accent)`), white text/icon, semi-transparent white icon background
2. **Secondary (1 button):** White card background, black text/icon (`var(--ink)`), muted gray icon background
3. **Tertiary (2+ buttons):** White card background, gray text/icon (`var(--text-secondary)`), muted gray icon background
4. **Icon backgrounds:** All secondary/tertiary use `rgba(142, 142, 147, 0.1)` for consistency
5. **Text colors:** Primary = white, Secondary = `text-foreground`, Tertiary = `text-secondary`
6. **Icon colors:** Primary = white, Secondary = `var(--ink)`, Tertiary = `var(--text-secondary)`

### Inputs

```tsx
// Standard input
<input 
  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card"
  style={{ color: 'var(--ink)' }}
/>

// Input with label
<div>
  <label className="text-label text-secondary mb-1 block">Amount</label>
  <input className="w-full px-4 py-2.5 rounded-xl border border-border" />
</div>
```

---

## Common Patterns

### Label + Value

```tsx
<div>
  <p className="text-label text-secondary mb-1">Total expenses</p>
  <p className="text-body tabular-nums" style={{ fontWeight: 500 }}>
    $234.50
  </p>
</div>
```

### Balance Card

```tsx
<div className="card p-4">
  <p className="text-label text-secondary mb-2">You owe</p>
  <p className="text-[24px] tabular-nums" style={{ fontWeight: 600, color: 'var(--ink)' }}>
    -$45.50
  </p>
  <p className="text-caption text-secondary mt-1">
    Across 2 pots
  </p>
</div>
```

### List Item

```tsx
<button className="list-row p-3 w-full text-left">
  <div className="flex items-center justify-between mb-1">
    <p className="text-body" style={{ fontWeight: 500 }}>Alice</p>
    <p className="text-body tabular-nums" style={{ fontWeight: 500, color: 'var(--success)' }}>
      +$28.50
    </p>
  </div>
  <p className="text-caption text-secondary">
    2 pots · Bank preferred
  </p>
</button>
```

### Section Header

```tsx
<div className="flex items-center justify-between mb-2 px-1">
  <h3 className="text-section">Recent Activity</h3>
  <button className="text-label" style={{ color: 'var(--accent)' }}>
    See all
  </button>
</div>
```

---

## Micro-interactions & Animations

### Button Interactions

**PrimaryButton Hover Effect:**
```tsx
// PrimaryButton automatically includes hover glow
<PrimaryButton onClick={handleSave}>Save</PrimaryButton>
// Adds: hover:shadow-[0_0_12px_rgba(230,0,122,0.3)]
```

**SecondaryButton Hover Effect:**
```tsx
// SecondaryButton automatically includes border transition
<SecondaryButton onClick={handleCancel}>Cancel</SecondaryButton>
// Adds: hover:border-ink/20
```

**Loading States:**
```tsx
// Loading spinner fades in smoothly, text opacity reduces
<PrimaryButton loading={isLoading}>Save</PrimaryButton>
// Spinner: transition-opacity duration-200
// Text: opacity reduces to 0.7 when loading
```

### Card Interactions

**Card Hover Lift Effect:**
```tsx
// Add card-hover-lift class to interactive cards
<div className="card card-hover-lift p-4">
  {/* content */}
</div>

// Effect: translateY(-2px) on hover, scale(0.99) on active
// Shadow: Smooth transition to --shadow-fab
```

**When to Use Card Hover Lift:**
- ✅ Interactive cards (clickable pot cards, expense cards, settlement cards)
- ✅ List items that navigate to detail screens
- ❌ Static cards (balance summaries, info displays)

### Focus States

**Focus Ring:**
```tsx
// Use focus-ring-pink utility class
<button className="focus-ring-pink">Action</button>

// Provides: 3px pink ring (was 2px/4px, now standardized to 3px)
// Visible in both light and dark modes
```

**Focus Ring Usage:**
- ✅ All interactive elements (buttons, inputs, links)
- ✅ Keyboard navigation targets
- ✅ Form controls

### Transition Standards

**Standard Transition:**
```tsx
// Use 200ms duration for all transitions
className="transition-all duration-200"
className="transition-colors duration-200"
className="transition-shadow duration-200"
```

**Easing:**
- Default: `ease-out` (smooth, natural feel)
- Card hover lift: `ease-out` (200ms)
- Button press: `active:scale-[0.98]` (instant feedback)

---

## Best Practices

### ✅ DO

1. **Use semantic classes** (`.text-screen-title`, `.text-section`, etc.)
2. **Use `text-secondary` for labels** (better contrast than old `text-muted-foreground`)
3. **Use `tabular-nums` for financial amounts** (aligned digits)
4. **Use medium/semibold weights (500-600) for numbers**
5. **Use utility classes** when available (`.card`, `.text-body`, etc.)
6. **Use semantic shadow aliases** (`--shadow-card`, not `--sh-l1`)
7. **Respect accent color guidelines** - pink is for active states only
8. **Add hover effects to interactive cards** - use `card-hover-lift` class
9. **Use smooth transitions** - `transition-all duration-200` for interactive elements
10. **Reserve accent color for primary actions** - don't use for links, icons, or borders

### ❌ DON'T

1. **Don't use raw shadow tokens** (`--sh-l1`, `--sh-l2`, `--sh-l3`) - use semantic aliases
2. **Don't use ShadCN tokens** (`--background`, `--foreground`) in custom components - use primary tokens
3. **Don't use experimental tokens** (`--fs-*`) until they're activated
4. **Don't use `text-muted-foreground`** - use `text-secondary` instead
5. **Don't use arbitrary sizes** like `text-[15px]` - use semantic classes
6. **Don't use Tailwind generic sizes** like `text-sm`, `text-base` - use semantic classes
7. **Don't use orange for negative amounts** - use default text with minus sign
8. **Don't use glass effects** - use `.card` instead
9. **Don't hardcode shadow values** - use tokens
10. **Don't use accent color for non-primary elements** - links, icons, borders should use `text-foreground`
11. **Don't skip hover effects on interactive cards** - always add `card-hover-lift` for clickable cards
12. **Don't use inconsistent transition durations** - always use `duration-200`

---

## Don'ts & Deprecated

### Deprecated Patterns

```tsx
// ❌ OLD: text-muted-foreground (DEPRECATED - Found in 10 files)
className="text-muted-foreground"      // Use text-secondary instead

// ❌ OLD: Tailwind arbitrary text sizes (Found in 18 files)
className="text-[15px]"                // Use semantic classes (.text-body)
className="text-[13px]"                // Use .text-label
className="text-[11px]"                // Use .text-micro

// ❌ OLD: Tailwind arbitrary border radius (Found in 66 files)
className="rounded-xl"                 // Use rounded-[var(--r-lg)] or rounded-[var(--r-xl)]
className="rounded-lg"                 // Use rounded-[var(--r-lg)]
className="rounded-2xl"                // Use rounded-[var(--r-2xl)]

// ❌ OLD: Generic green/red
className="text-green-600"             // Use var(--success)
className="text-red-600"               // Avoid; use var(--ink) with minus

// ❌ OLD: ShadCN tokens in custom components
className="text-foreground"            // Use var(--ink) or default
className="bg-background"              // Use var(--bg)

// ❌ OLD: Glass effects
className="glass-sm"                   // Use card instead

// ❌ OLD: Orange accent (deprecated)
style={{ color: 'var(--accent-orange)' }}  // Use --accent (pink) instead
```

### Historical Inconsistencies (All Resolved)

All inconsistencies identified during Phase 1-3 have been resolved. See [`UX_UI_INCONSISTENCIES.md`](./UX_UI_INCONSISTENCIES.md) for historical reference.

**All issues fixed:**
- ✅ Deprecated class usage (all replaced)
- ✅ Border radius inconsistencies (all standardized)
- ✅ Arbitrary text sizes (all replaced with semantic classes)
- ✅ Button pattern inconsistencies (all standardized)

### Orange Color (Deprecated)

- Orange is deprecated in favour of a black/green/pink scheme
- Legacy `--accent-orange` is internally aliased to `--accent` for backward compatibility
- For negative amounts: use default text (`--ink`) with a leading minus sign
- For positive amounts: use `--money`/`--success`

---

## Theme Support

### Manual Toggle

```tsx
import { useTheme } from './utils/useTheme';

const { theme, setTheme } = useTheme();

// Toggle
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

### System Preference

Automatically applied via CSS `prefers-color-scheme: dark`

---

## Quick Reference Table

| Use Case | Token | Example |
|----------|-------|---------|
| App background | `--bg` | Main screen background |
| Card background | `--card` | White cards |
| Primary text | `--ink` | Headings, body text |
| Secondary text | `--text-secondary` | Subtitles, labels |
| De-emphasized text | `--muted` | Timestamps, hints |
| Active state | `--accent` | Selected tab |
| Financial action | `--accent` | Settle button |
| Success | `--success` | Confirmation toast |
| Error | `--danger` | Validation error |
| Card shadow | `--shadow-card` | Standard elevation |
| FAB shadow | `--shadow-fab` | Floating controls |
| Screen title | `.text-screen-title` | 17px medium |
| Body text | `.text-body` | 15px normal |
| Small label | `.text-label` | 13px normal |

---

## ShadCN Compatibility Layer

ChopDot uses ShadCN UI components, which expect specific token names. We auto-map these:

| ShadCN Token | Maps To | Notes |
|--------------|---------|-------|
| `--background` | `var(--bg)` | DO NOT USE in custom CSS |
| `--foreground` | `var(--ink)` | DO NOT USE in custom CSS |
| `--card-foreground` | `var(--ink)` | DO NOT USE in custom CSS |
| `--muted-foreground` | `var(--muted)` | DO NOT USE in custom CSS |

**Always use primary tokens (`--bg`, `--ink`, etc.) in custom components.**

The compatibility layer exists only so ShadCN components work out of the box.

---

## Related Documentation

- **`/styles/globals.css`** - Source of truth for all design tokens
- **`/guidelines/NAMING_CONVENTIONS.md`** - File and code naming standards
- **`/guidelines/UX_UI_ASSESSMENT.md`** - Phase 1-3 improvement roadmap (completed)
- **`/guidelines/UX_UI_INCONSISTENCIES.md`** - Historical reference (all issues resolved)

### Legacy Documents (Superseded)
- **`/DESIGN_TOKENS.md`** - Superseded by this document
- **`/guidelines/QUICK_REFERENCE.md`** - Superseded by this document
- **`/guidelines/Typography.md`** - Superseded by this document

---

## Quick Start Checklist for New Features

When creating new screens/components, follow this checklist:

### ✅ Typography
- [ ] Use semantic classes (`text-micro`, `text-label`, `text-body`, `text-section`, `text-screen-title`)
- [ ] Financial amounts use `tabular-nums` and proper font weights (500-700)
- [ ] Labels use `text-secondary` or `text-micro`

### ✅ Colors
- [ ] Use design tokens (`--ink`, `--text-secondary`, `--muted`, `--accent`, `--success`, `--danger`)
- [ ] Reserve `--accent` for primary actions only
- [ ] Use `--success` for positive balances, default color for negative

### ✅ Buttons
- [ ] Use `PrimaryButton` component for primary actions
- [ ] Use `SecondaryButton` component for secondary actions
- [ ] Add `loading` prop for async operations

### ✅ Cards
- [ ] Use `.card` utility class for all cards
- [ ] Add `.card-hover-lift` for interactive/clickable cards
- [ ] Add `hover:shadow-[var(--shadow-fab)]` for visual feedback
- [ ] Include `transition-all duration-200` or `transition-shadow duration-200`

### ✅ Focus States
- [ ] Add `focus-ring-pink` class to all interactive elements
- [ ] Ensure focus is visible in both light and dark modes

### ✅ Transitions
- [ ] Use `duration-200` for all transitions
- [ ] Use `transition-all`, `transition-colors`, or `transition-shadow` as appropriate

### ✅ Empty States
- [ ] Use `EmptyState` component with icon, message, and optional CTA
- [ ] Include helpful description text

### ✅ Loading States
- [ ] Use `Skeleton` components for list loading
- [ ] Use `loading` prop on buttons for button loading states

### ✅ Error Handling
- [ ] Use `ErrorMessages` constants and `formatErrorMessage()` utility
- [ ] Provide specific, actionable error messages

---

**Last Updated:** January 14, 2025  
**Status:** All phases complete - Follow these guidelines from the start  
**Maintained By:** Development Team

