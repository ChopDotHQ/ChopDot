# ChopDot Typography System

> ⚠️ **This document has been superseded.**  
> See [/CURRENT_STATE.md](../CURRENT_STATE.md) and [/guidelines/QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for current patterns.

---

## Quick Summary

ChopDot uses a **6-level semantic typography scale** inspired by iOS and SF Pro.

### Classes (Current)

| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `.text-screen-title` | 17px | 500 | TopBar titles, main headers |
| `.text-section` | 15px | 500 | Section headings, card headers |
| `.text-body` | 15px | 400 | Body text, inputs, buttons |
| `.text-label` | 13px | 400 | Secondary labels, metadata |
| `.text-caption` | 12px | 400 | Fine print, disclaimers |
| `.text-micro` | 11px | 400 | Badges, tiny labels |

### Text Colors (Current)

```tsx
// ✅ CORRECT: Primary text
color: 'var(--ink)'

// ✅ CORRECT: Secondary labels (HIGH CONTRAST)
className="text-secondary"      // #606066 (light), #AEAEB2 (dark)

// ✅ CORRECT: Muted/inactive
className="text-muted"          // #8E8E93 (both modes)

// ❌ DEPRECATED: Do not use
className="text-muted-foreground"  // Use text-secondary instead
```

---

## Key Rules

### ✅ DO

- Use semantic classes (`.text-screen-title`, `.text-section`, etc.)
- Use `text-secondary` for labels (better contrast than old `text-muted-foreground`)
- Use `tabular-nums` for financial amounts
- Use medium/semibold weights (500-600) for numbers

### ❌ DON'T

- ~~Don't use `text-muted-foreground`~~ → Use `text-secondary`
- Don't use arbitrary sizes like `text-[15px]` → Use semantic classes
- Don't use Tailwind generic sizes like `text-sm`, `text-base` → Use semantic classes

---

## Examples

### Label + Value (Current Pattern)

```tsx
<div>
  <p className="text-label text-secondary">Total expenses</p>
  <p className="text-body tabular-nums" style={{ fontWeight: 500 }}>
    $234.50
  </p>
</div>
```

### Financial Amount (Current Pattern)

```tsx
// Positive balance (owed to you)
<p className="text-body tabular-nums" style={{ 
  fontWeight: 500, 
  color: 'var(--success)' 
}}>
  +$45.50
</p>

// Negative balance (you owe)
<p className="text-body tabular-nums" style={{ 
  fontWeight: 500, 
  color: 'var(--accent-orange)' 
}}>
  -$32.00
</p>
```

### Section Header (Current Pattern)

```tsx
<h3 className="text-section">Recent Activity</h3>
<p className="text-caption text-secondary">Last 7 days</p>
```

---

## Migration Notes

If you see old code patterns, update them:

```tsx
// ❌ OLD (before Oct 2025)
<p className="text-label text-muted-foreground">Label</p>

// ✅ NEW (current)
<p className="text-label text-secondary">Label</p>
```

---

**For complete design system documentation, see:**
- **[/CURRENT_STATE.md](../CURRENT_STATE.md)** - Complete reference
- **[/guidelines/QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Fast lookup
