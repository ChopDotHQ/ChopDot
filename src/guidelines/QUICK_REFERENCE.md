# ChopDot Quick Reference

**For Developers** - Fast lookup for common patterns

---

## 🎨 Colors

### Text Colors

```tsx
// Primary text (body copy, headings)
color: 'var(--ink)'                    // Auto: black (light), white (dark)

// Secondary labels (metadata, timestamps)
className="text-secondary"             // #606066 (light), #AEAEB2 (dark)

// Muted/inactive
className="text-muted"                 // #8E8E93 (both modes)
```

### Financial Colors (Semantic Only)

```tsx
// Money owed TO you (+)
style={{ color: 'var(--success)' }}    // Green #19C37D

// Money YOU owe (-)
// Use default text colour (ink) with a leading minus sign; no red/orange
style={{ color: 'var(--ink)' }}

// Settled / neutral
style={{ color: 'var(--muted)' }}      // Gray #8E8E93
```

### Brand Accents (Strategic)

```tsx
// Polkadot pink (blockchain actions only)
style={{ background: 'var(--accent)' }}     // #E6007A

// Mint green (DeFi/savings only)
style={{ color: 'var(--accent-mint)' }}     // #56F39A
```

---

## ✍️ Typography

### Classes

```tsx
className="text-screen-title"  // 17px, medium - TopBar titles
className="text-section"       // 15px, medium - Section headings
className="text-body"          // 15px, regular - Body text
className="text-label"         // 13px, regular - Labels, metadata
className="text-caption"       // 12px, regular - Fine print
className="text-micro"         // 11px, regular - Badges
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

---

## 🎴 Surfaces

### Cards

```tsx
// Standard card
<div className="card p-4">
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

---

## 🔘 Buttons

### Variants

```tsx
// Primary (black/white)
<button className="btn-primary px-4 py-2.5 rounded-xl">
  Save
</button>

// Polkadot accent (blockchain only)
<button className="btn-accent px-4 py-2.5 rounded-xl">
  Attest on Polkadot
</button>

// Premium gradient (CTAs)
<button className="btn-gradient-orange px-4 py-2.5 rounded-xl">
  Upgrade
</button>

// Secondary (card style)
<button className="card hover:bg-muted/50 px-4 py-2.5 rounded-xl border border-border">
  Cancel
</button>

// Destructive
<button className="px-4 py-2.5 rounded-xl" style={{ background: 'var(--danger)', color: '#fff' }}>
  Delete
</button>
```

---

## 📏 Spacing

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

## 🌑 Theme Support

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

## 🧩 Common Patterns

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

## ⚠️ Don't Use

```tsx
// ❌ Old muted foreground
className="text-muted-foreground"      // Use text-secondary instead

// ❌ Tailwind arbitrary text sizes
className="text-[15px]"                // Use semantic classes

// ❌ Generic green/red
className="text-green-600"             // Use var(--success)
className="text-red-600"               // Avoid; use var(--ink) with minus

// ❌ Currency suffix
{baseCurrency} {amount}                // Use ${amount} instead

// ❌ Glass effects
className="glass-sm"                   // Use card instead
```

---

## 🔗 See Also

- **[/CURRENT_STATE.md](../CURRENT_STATE.md)** - Complete design system reference
- **[/styles/globals.css](../styles/globals.css)** - All design tokens
- **[/App.tsx](../App.tsx)** - Main app structure
