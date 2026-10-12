# Home V1.4 — Visual QA Record

## Required renders
Home V1.4 was rendered and visually reviewed at:
- 393 × 852
- 430 × 890

A scrolled-state render was also used while validating the fixed header/footer behavior.

## What the screenshots caught

### 1. V1.2 visual regression
The viewport/frame work was technically cleaner but the product was compressed too aggressively: smaller type, weaker spacing, thinner rhythm, and too much effort to make every card visible at once.

**Correction:** preserve the reliable frame but restore the proportions and breathing room of the original Home. The center is allowed to scroll.

### 2. V1.3 flex-shrink overlap bug
The scroll column was a flex container and direct children were allowed to shrink. The attention card collapsed to almost zero height while its children continued to paint, visually overlapping the wallet.

**Root fix:** direct children in the scrolling column must not shrink (`flex: 0 0 auto` or equivalent layout discipline).

This is the strongest proof in this thread that CSS/structure review alone is insufficient.

### 3. Wallet correction
Wallet context had been removed too aggressively. It was restored as a compact secondary strip while keeping human attention/group state above infrastructure.

### 4. Icon correction
Later prototypes used placeholder glyphs that did not inherit the production icon language. V1.4 uses Lucide-style line icons and the production semantic mappings.

## V1.4 result
After correction:
- visual hierarchy regained the original calm/confident character
- cards have adequate breathing room
- type is readable and not artificially compressed
- header/footer remain in frame while center content scrolls
- no content is intentionally covered by a floating control
- wallet is visible without becoming the product hero
- icon family/stroke/scale is coherent
- variable text is designed to clamp/truncate safely

## Regeneration checklist for a future session
Because binary screenshots are derived artifacts, source HTML + this QA record are the durable reference. Re-render `../v1.4-inherited-icons.html` at 393×852 and 430×890 and compare visually before modifying the Golden Screen.

## Status
**Visual QA: PASS for Golden reference.**  
**Production comparison: NOT YET PERFORMED.**
