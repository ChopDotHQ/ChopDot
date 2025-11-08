# UX/UI Inconsistencies Report

**Last Updated:** January 14, 2025  
**Status:** ✅ All Phases Complete - Inconsistencies Resolved  
**Purpose:** Historical reference - All listed issues have been fixed

---

## ✅ Resolution Status

All UX/UI inconsistencies identified during Phase 1-3 have been resolved:

### ✅ Fixed Issues

1. **Deprecated `text-muted-foreground` Usage** - ✅ RESOLVED
   - All instances replaced with `text-secondary` across all screens

2. **Border Radius Inconsistencies** - ✅ RESOLVED
   - All arbitrary values replaced with design tokens (`rounded-[var(--r-lg)]`, etc.)

3. **Arbitrary Text Sizes** - ✅ RESOLVED
   - All instances replaced with semantic typography classes (`text-micro`, `text-label`, `text-body`, etc.)

4. **Button Pattern Inconsistencies** - ✅ RESOLVED
   - All buttons now use `PrimaryButton`/`SecondaryButton` components
   - Quick Actions Grid follows 3-tier hierarchy (Primary > Secondary > Tertiary)

5. **Glass Effects** - ✅ RESOLVED
   - All `glass-sm` instances replaced with `card` utility class

6. **Accent Color Misuse** - ✅ RESOLVED
   - Accent color now reserved for primary actions only
   - Links, icons, and borders use `text-foreground` instead

---

## 📋 Current Guidelines

For future development, follow these guidelines to prevent inconsistencies:

### Design System Reference
- **Primary Guidelines:** [`Guidelines.md`](./Guidelines.md) - Complete design system reference
- **Naming Conventions:** [`NAMING_CONVENTIONS.md`](./NAMING_CONVENTIONS.md) - File and code naming standards
- **Design Tokens:** See `Guidelines.md` Color System and Typography sections

### Key Rules to Follow

1. **Typography:** Always use semantic classes (`text-micro`, `text-label`, `text-body`, `text-section`, `text-screen-title`)
2. **Colors:** Use design tokens (`--ink`, `--text-secondary`, `--muted`, `--accent`, `--success`, `--danger`)
3. **Buttons:** Use `PrimaryButton`/`SecondaryButton` components
4. **Cards:** Use `.card` utility class, add `.card-hover-lift` for interactive cards
5. **Spacing:** Use standardized scale (8px, 16px, 24px, 32px)
6. **Transitions:** Always use `duration-200` for consistency
7. **Focus States:** Use `focus-ring-pink` utility class (3px ring)

---

## 🔍 How to Check for New Inconsistencies

If you need to audit for new inconsistencies:

```bash
# Find deprecated text-muted-foreground
grep -r "text-muted-foreground" src/

# Find arbitrary text sizes
grep -r "text-\[" src/

# Find arbitrary border radius
grep -r "rounded-xl\|rounded-lg\|rounded-2xl" src/

# Find glass-sm usage
grep -r "glass-sm" src/

# Find accent color misuse (links/icons)
grep -r "text-accent" src/
```

---

**Note:** This document is kept for historical reference. All listed issues have been resolved during Phase 1-3 improvements.
