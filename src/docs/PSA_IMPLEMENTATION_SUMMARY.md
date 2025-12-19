# PSA (Polkadot Second Age) Glass Style Implementation Summary

## Overview
Implemented a complete Polkadot Second Age (PSA) glassmorphism design system that can be toggled throughout the application. The style features frosted glass effects, greyscale palettes, subtle inset shadows, and rotating background images, matching the aesthetic of polkadot.com and the Polkadot Second Age brand kit.

## Core Architecture

### 1. Theme Management (`src/utils/useTheme.ts`)
- Added `BrandVariant` type: `'default' | 'polkadot-second-age'`
- Added `setBrandVariant()` function to toggle between styles
- Applies `brand-polkadot-second-age` class to document root when active
- Persists preference in `localStorage`

### 2. PSA Style Hook (`src/utils/usePSAStyle.ts`)
**Purpose**: Centralized hook providing PSA-specific styles and classes

**Exports**:
- `isPSA`: Boolean indicating if PSA is active
- `psaStyles`: Object with CSS properties for:
  - `panel`: Large glass panels (modals, sheets)
  - `card`: Standard cards
  - `cardHover`: Hover state for cards
  - `guestCard`: Guest/ghost variant cards
  - `background`: Background styles with wave images and gradients
  - `pinkAccentButton`: Pink action buttons with glassmorphism
  - `pinkAccentButtonHover`: Hover state for pink buttons
- `psaClasses`: String class names for conditional application

**Key Features**:
- Dark mode: Uses `background-polka-a_inverted.png` with dark gradients
- Light mode: Uses `background-polka-a.png` with light gradients
- Responsive to theme changes (light/dark/auto)
- Pink accent buttons: Semi-transparent pink with backdrop blur (0.95 opacity in dark, 0.98 in light)

### 3. Global CSS Styles (`src/styles/globals.css`)
**Added CSS Classes**:
- `.psa-glass-panel`: Large panels with strong blur (24px) and saturation (180%)
- `.psa-glass-card`: Standard cards with glassmorphism
- `.psa-glass-guest-card`: Guest variant cards
- All classes have dark and light mode variants

**Key Properties**:
- `backdrop-filter: blur(24px) saturate(180%)`
- Semi-transparent white backgrounds (0.14-0.15 in dark, 0.3 for light panels, 0.7 for light cards)
- Inset shadows for depth
- Pink accent glows in box shadows
- Border colors with appropriate opacity

## Components Modified

### Screens
1. **SignInScreen.tsx** (`src/components/screens/SignInScreen.tsx`)
   - Background rotation: Dark mode uses only inverted backgrounds (no rotation), light mode rotates through regular backgrounds
   - Logo: Added `useWhite` prop to `ChopDotMark` for dark mode
   - Email button: Dynamic theme based on `panelMode` (dark = white text on dark glass, light = black text on light glass)
   - Footer texts: White in dark mode, dark in light mode
   - "Keep me signed in": White text in PSA dark mode
   - Background images: `POLKADOT_BACKGROUNDS_INVERTED` for dark, `POLKADOT_BACKGROUNDS` for light

2. **PotsHome.tsx** (`src/components/screens/PotsHome.tsx`)
   - Main container background with wave image
   - Balance summary card
   - Quick action buttons (Add, Settle, Scan, Request)
   - Pot cards with hover effects
   - Header made transparent in PSA mode

3. **PeopleHome.tsx** (`src/components/screens/PeopleHome.tsx`)
   - Main container background
   - Person debt rows
   - Overview chips card

4. **PeopleView.tsx** (`src/components/screens/PeopleView.tsx`)
   - Individual person cards

5. **PotHome.tsx** (`src/components/screens/PotHome.tsx`)
   - Main container background
   - Checkpoint card

6. **ActivityHome.tsx** (`src/components/screens/ActivityHome.tsx`)
   - Main container background
   - Balance overview card
   - Pending attestations banner
   - Top person to settle card
   - Activity cards

7. **YouTab.tsx** (`src/components/screens/YouTab.tsx`)
   - Main container background
   - Profile card
   - Quick insights card
   - All collapsible sections (General, Notifications, Security, Advanced, Help, Sign out, Delete account)
   - "Sign out" button now uses PSA styling

### Common Components
1. **BottomTabBar.tsx** (`src/components/BottomTabBar.tsx`)
   - Navigation bar background uses PSA panel styles
   - FAB (Floating Action Button) uses `pinkAccentButton` style with hover effects

2. **BottomSheet.tsx** (`src/components/BottomSheet.tsx`)
   - Base sheet component uses PSA panel styles (affects all modals)

3. **HelpSheet.tsx** (`src/components/HelpSheet.tsx`)
   - Sheet and FAQ items use PSA styles

4. **EmptyState.tsx** (`src/components/EmptyState.tsx`)
   - Empty state card uses PSA styles

5. **WalletBanner.tsx** (`src/components/WalletBanner.tsx`)
   - Wallet balance banner uses PSA card styles

## Design Tokens & Values

### Dark Mode
- **Background**: `#0A0A0A` with `background-polka-a_inverted.png` and radial gradients
- **Panel Background**: `rgba(255, 255, 255, 0.15)`
- **Card Background**: `rgba(255, 255, 255, 0.14)`
- **Border Colors**: `rgba(255, 255, 255, 0.35)` for panels, `rgba(255, 255, 255, 0.3)` for cards
- **Pink Button**: `rgba(255, 40, 103, 0.95)` (nearly opaque)
- **Text Color**: `#FAFAF9`

### Light Mode
- **Background**: `#FAFAF9` with `background-polka-a.png` and radial gradients
- **Panel Background**: `rgba(255, 255, 255, 0.3)`
- **Card Background**: `rgba(255, 255, 255, 0.7)` (increased from 0.45 for visibility)
- **Border Colors**: `rgba(255, 255, 255, 0.5)` for panels, `rgba(255, 255, 255, 0.8)` for cards
- **Pink Button**: `rgba(255, 40, 103, 0.98)` (nearly opaque)
- **Text Color**: `#1C1917`

### Blur & Effects
- **Backdrop Filter**: `blur(24px) saturate(180%)` (increased from 20px/150%)
- **Box Shadows**: Multi-layered with pink accent glows and inset highlights
- **Hover States**: Increased opacity and enhanced shadows

## Background Images

### Location
- `public/assets/background-polka-a.png` (light mode)
- `public/assets/background-polka-a_inverted.png` (dark mode)
- `public/assets/background-polka-b.png`, `-c.png`, `-d.png` (rotation for light mode)

### Rotation Logic
- **Dark mode**: Stays on inverted background (index 0), no rotation
- **Light mode**: Rotates through all 4 backgrounds every 12 seconds
- Backgrounds layered with radial gradients for depth

## Key Implementation Patterns

### Conditional Styling Pattern
```tsx
const { isPSA, psaStyles, psaClasses } = usePSAStyle();

<div
  className={isPSA ? psaClasses.card : 'card'}
  style={isPSA ? psaStyles.card : undefined}
  onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.cardHover) : undefined}
  onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.card) : undefined}
>
```

### Background Application Pattern
```tsx
<div
  className={`container ${isPSA ? '' : 'bg-background'}`}
  style={isPSA ? psaStyles.background : undefined}
>
```

### Pink Accent Button Pattern
```tsx
<button
  style={isPSA ? psaStyles.pinkAccentButton : { background: 'var(--accent)' }}
  onMouseEnter={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.pinkAccentButtonHover) : undefined}
  onMouseLeave={isPSA ? (e) => Object.assign(e.currentTarget.style, psaStyles.pinkAccentButton) : undefined}
>
```

## Settings Integration

**Location**: `src/components/screens/Settings.tsx`
- Added brand variant toggle in "Preferences" section
- Allows switching between "Default" and "PSA Glass" styles
- Preference persists across sessions

## Documentation Created

1. **CHOPDOT_SECOND_AGE_BRAND_KIT.md** (`src/CHOPDOT_SECOND_AGE_BRAND_KIT.md`)
   - Complete brand kit documentation
   - Design philosophy
   - Color system
   - Typography
   - Glassmorphism system
   - Usage guidelines

2. **PSA_STYLE_GUIDE.md** (`src/docs/PSA_STYLE_GUIDE.md`)
   - Quick reference for developers
   - Available styles and classes
   - Common patterns
   - Important notes

3. **PSA_APPLICATION_STATUS.md** (`src/docs/PSA_APPLICATION_STATUS.md`)
   - Progress tracking
   - Completed components
   - Pending tasks
   - Verification checklist

4. **PSA_IMPROVEMENTS_V2.md** (`src/docs/PSA_IMPROVEMENTS_V2.md`)
   - Improvement strategy
   - Issues addressed
   - Solutions implemented

5. **DESIGN_TOKENS.md** (`src/DESIGN_TOKENS.md`)
   - Updated with PSA section
   - Links to brand kit and style guide

## Critical Fixes Applied

1. **Background Override Issue**: Removed `bg-background` class when PSA is active to prevent Tailwind overriding inline styles
2. **Logo Visibility**: Added `useWhite` prop to `ChopDotMark` for dark mode
3. **Text Legibility**: All footer texts and labels are white in dark mode
4. **Email Button**: Dynamic theme based on panel mode
5. **Background Rotation**: Dark mode stays on inverted, light mode rotates
6. **Card Visibility**: Increased light mode card opacity from 0.45 to 0.7
7. **Pink Button Opacity**: Increased to 0.95 (dark) and 0.98 (light) to hide background lines

## Testing Checklist

- [x] Toggle between default and PSA styles works
- [x] Dark mode uses inverted backgrounds (no rotation)
- [x] Light mode rotates backgrounds
- [x] All text is legible in both modes
- [x] Logos are white in dark mode
- [x] Pink buttons have glassmorphism effect
- [x] Hover states work correctly
- [x] Background images load correctly
- [x] Settings toggle persists preference
- [x] Auto theme mode works correctly

## Files Modified Summary

**Core Utilities**:
- `src/utils/useTheme.ts`
- `src/utils/usePSAStyle.ts` (new)
- `src/styles/globals.css`

**Screens** (8 files):
- `src/components/screens/SignInScreen.tsx`
- `src/components/screens/PotsHome.tsx`
- `src/components/screens/PeopleHome.tsx`
- `src/components/screens/PeopleView.tsx`
- `src/components/screens/PotHome.tsx`
- `src/components/screens/ActivityHome.tsx`
- `src/components/screens/YouTab.tsx`
- `src/components/screens/Settings.tsx`

**Common Components** (5 files):
- `src/components/BottomTabBar.tsx`
- `src/components/BottomSheet.tsx`
- `src/components/HelpSheet.tsx`
- `src/components/EmptyState.tsx`
- `src/components/WalletBanner.tsx`

**Documentation** (5 files):
- `src/CHOPDOT_SECOND_AGE_BRAND_KIT.md` (new)
- `src/docs/PSA_STYLE_GUIDE.md` (new)
- `src/docs/PSA_APPLICATION_STATUS.md` (new)
- `src/docs/PSA_IMPROVEMENTS_V2.md` (new)
- `src/DESIGN_TOKENS.md` (updated)

## Design Principles

1. **Independence**: Default and PSA styles are completely independent - one can be deleted without affecting the other
2. **Consistency**: All PSA styles use the same design tokens and patterns
3. **Accessibility**: Text contrast targets WCAG AA in common viewing conditions
4. **Performance**: Backdrop filters use WebKit prefixes; older devices render without blur
5. **Responsiveness**: Styles adapt to light/dark/auto theme modes

## Known Considerations

- Backdrop filters may have performance impact on older mobile devices
- Background images add ~1.2MB to asset payload when loaded (not JS bundle size)
- Pink buttons are nearly opaque (0.95-0.98) to hide background elements
- Light mode cards increased opacity for better visibility
- Dark mode backgrounds don't rotate (stays on inverted version)

---

## Prompt for AI Inspection

```
You are inspecting a Polkadot Second Age (PSA) glassmorphism design system implementation in a React/TypeScript application. 

CONTEXT:
The application has a toggleable design system where users can switch between "Default" and "PSA Glass" styles. The PSA style features:
- Frosted glass effects with backdrop blur (24px, 180% saturation)
- Greyscale color palette with pink accents (#FF2867 / rgba(255, 40, 103))
- Rotating background images (wave patterns)
- Semi-transparent panels and cards
- Inset shadows for depth
- Pink accent buttons with glassmorphism

KEY FILES TO INSPECT:
1. src/utils/usePSAStyle.ts - Core hook providing PSA styles
2. src/utils/useTheme.ts - Theme management with brand variant
3. src/styles/globals.css - PSA CSS classes (.psa-glass-panel, .psa-glass-card, etc.)
4. src/components/screens/SignInScreen.tsx - Login screen with background rotation logic
5. src/components/BottomTabBar.tsx - Navigation bar with FAB button
6. src/components/screens/PotsHome.tsx - Example of PSA application pattern

INSPECTION TASKS:
1. Verify all PSA styles are properly conditional (check isPSA before applying)
2. Ensure background images are correctly referenced (public/assets/)
3. Check that dark mode uses inverted backgrounds and doesn't rotate
4. Verify text colors are legible in both light and dark modes
5. Confirm pink accent buttons have correct opacity (0.95 dark, 0.98 light)
6. Check that hover states work correctly with onMouseEnter/onMouseLeave
7. Verify backdrop-filter has webkit prefix for Safari compatibility
8. Ensure bg-background class is removed when PSA is active
9. Check that all components using PSA styles import usePSAStyle hook
10. Verify localStorage persistence for brand variant preference

ISSUES TO LOOK FOR:
- Missing conditional checks (isPSA)
- Hardcoded colors instead of using psaStyles
- Background class conflicts (bg-background overriding inline styles)
- Text contrast issues (especially in dark mode)
- Missing hover states
- Incorrect background image paths
- Performance issues with backdrop-filter
- Missing webkit prefixes

Please review the implementation and provide:
1. Any inconsistencies or bugs found
2. Suggestions for improvements
3. Missing components that should have PSA styles
4. Performance optimizations
5. Accessibility improvements
```
