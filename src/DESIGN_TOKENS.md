# ChopDot Design Token Reference

**Last Updated:** October 21, 2025  
**Purpose:** Complete guide to ChopDot's design system tokens

---

## 📐 Design Philosophy

ChopDot uses a **clean iOS-style design language** with:
- ✅ Pure white cards (no glass effects)
- ✅ Minimal shadows (3-level system)
- ✅ No borders (except inputs)
- ✅ Polkadot pink accent (used sparingly)
- ✅ Monochrome + Pink scheme (black/green/pink); orange is deprecated

---

## 🎨 Color Tokens (Primary)

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F2F2F7` | App background (iOS system gray) |
| `--card` | `#FFFFFF` | Card/surface background (pure white) |
| `--ink` | `#000000` | Primary text color |
| `--muted` | `#8E8E93` | Tertiary text (timestamps, hints, placeholders) |
| `--text-secondary` | `#606066` | Secondary text (important labels, subtitles) |
| `--accent` | `#E6007A` | Polkadot pink (active states, selections, focus) |
| `--money` | `#19C37D` | Alias of success for positive balances |
| `--success` | `#19C37D` | Success states |
| `--danger` | `#E5484D` | Error/destructive states |
| `--border` | `rgba(0, 0, 0, 0.06)` | Subtle separator |

### Dark Mode

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

---

## 🌑 Shadow System (3-Level Hierarchy)

### Level 1: Base Definitions (DO NOT USE DIRECTLY)

Raw shadow values - always use semantic aliases instead:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--sh-l1` | `0 0.5px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` | `0 1px 3px rgba(0,0,0,0.4)` |
| `--sh-l2` | `0 2px 8px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)` | `0 4px 12px rgba(0,0,0,0.5)` |
| `--sh-l3` | `0 4px 16px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)` | `0 6px 20px rgba(0,0,0,0.6)` |

### Level 2: Semantic Aliases (USE IN CUSTOM CSS)

Purpose-based names:

| Token | Maps To | Usage |
|-------|---------|-------|
| `--shadow-card` | `var(--sh-l1)` | Cards, list rows, sheets |
| `--shadow-fab` | `var(--sh-l2)` | Floating buttons, dropdowns |
| `--shadow-elev` | `var(--sh-l3)` | Modals, dialogs (reserved) |

### Level 3: Utility Classes (EASIEST - RECOMMENDED)

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

## 📏 Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--space-page` | `16px` | Page padding |
| `--space-card` | `16px` | Card padding |
| `--space-row` | `12px` | List row padding |
| `--space-section` | `24px` | Section spacing |

---

## 🔤 Typography System

### Active System (Use These)

| Token | Size | Weight | Usage | Utility Class |
|-------|------|--------|-------|---------------|
| `--text-screen-title` | `17px` | `500` | Screen headers | `.text-screen-title` |
| `--text-section-heading` | `15px` | `500` | Section headers | `.text-section` |
| `--text-body` | `15px` | `400` | Body text (default) | `.text-body` |
| `--text-label` | `13px` | `400` | Form labels, small text | `.text-label` |
| `--text-caption` | `12px` | `400` | Supporting text | `.text-caption` |
| `--text-micro` | `11px` | `400` | Tiny labels | `.text-micro` |

### Experimental System (DO NOT USE - Reserved for Future)

| Token | Size | Status |
|-------|------|--------|
| `--fs-title-display` | `32px` | [UNUSED] Future: Larger hero titles |
| `--fs-title-section` | `20px` | [UNUSED] Future: Larger section headers |
| `--fs-body` | `16px` | [UNUSED] Future: Larger body text |
| `--fs-label` | `13px` | [UNUSED] Future: Same as current |

**Why are there two systems?**
- Active system (`--text-*`): Connected to utility classes, used throughout app
- Experimental system (`--fs-*`): Reserved for future accessibility enhancements
- To migrate: Update utility classes first, then components

---

## 🎨 Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--r-lg` | `12px` | Buttons, inputs, list items |
| `--r-xl` | `16px` | Cards |
| `--r-2xl` | `24px` | Hero cards, modals |

---

## 🔧 ShadCN Compatibility Layer

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

## 🎯 Token Usage Examples

### ✅ Correct Usage

```tsx
// Colors
<div style={{ background: 'var(--card)', color: 'var(--ink)' }}>
  <h2 style={{ color: 'var(--text-secondary)' }}>Subtitle</h2>
  <p style={{ color: 'var(--muted)' }}>Timestamp</p>
</div>

// Shadows (semantic alias)
<div style={{ boxShadow: 'var(--shadow-card)' }}>...</div>

// Typography
<h1 className="text-screen-title">Screen Title</h1>
<p className="text-body">Body text</p>

// Utility classes (best)
<div className="card">
  <div className="space-card">
    <h2 className="text-section">Section Title</h2>
  </div>
</div>
```

### ❌ Incorrect Usage

```tsx
// DON'T: Use ShadCN tokens in custom CSS
<div style={{ background: 'var(--background)' }}>...</div>

// DON'T: Use raw shadow levels
<div style={{ boxShadow: 'var(--sh-l1)' }}>...</div>

// DON'T: Use experimental typography tokens
<h1 style={{ fontSize: 'var(--fs-title-display)' }}>...</h1>

// DON'T: Hardcode shadow values
<div style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>...</div>
```

---

## 🎨 Accent Color Guidelines

### Polkadot Pink (`--accent`)

**Use sparingly for:**
- Active tab indicator
- Selected state
- Focus states (with `--accent-pink-soft` background)

**DO NOT use for:**
- Large backgrounds
- Body text
- Multiple elements on same screen

### Orange (Deprecated)

- Orange is deprecated in favour of a black/green/pink scheme.
- Legacy `--accent-orange` is internally aliased to `--accent` to maintain backward compatibility in older components.
- For negative amounts: use default text (`--ink`) with a leading minus sign. For positive amounts: use `--money`/`--success`.

---

## 📦 Quick Reference Table

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

## 🚀 Migration Guide (If Needed)

If you need to migrate to the experimental typography system:

1. **Update utility classes** in `globals.css`:
   ```css
   .text-body {
     font-size: var(--fs-body); /* Changed from var(--text-body) */
   }
   ```

2. **Update token values** if needed:
   ```css
   --fs-body: 16px; /* Increase from 15px */
   ```

3. **Test all screens** to ensure layout doesn't break

4. **Update this documentation** to reflect the new active system

---

## 📝 Notes for Developers

1. **Never use raw `--sh-l*` tokens** - always use semantic aliases (`--shadow-card`, etc.)
2. **Never use ShadCN tokens** (`--background`, etc.) in custom components - use primary tokens
3. **Never use experimental tokens** (`--fs-*`) until they're activated
4. **Always use utility classes** when available (`.card`, `.text-body`, etc.)
5. **Respect the accent color guidelines** - pink is for active states only, orange is for financial actions

---

**Questions?** See `/styles/globals.css` for the source of truth, or check `/docs/README.md` for more documentation.
