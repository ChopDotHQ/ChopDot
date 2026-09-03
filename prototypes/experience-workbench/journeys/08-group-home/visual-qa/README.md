# Journey 08 — Group Home V1 Visual QA

## Reference
Golden inheritance:
- Journey 02 Home V1.4
- Journey 03 Create Group V2
- Journey 04 Invite / Join V1

## Render method
Browser plugin was not available in this workspace. Local Playwright + system Chromium was used as the documented fallback by loading the HTML with `page.set_content()` and rendering each hash state.

## Viewports
Rendered and inspected at:
- 393 × 852
- 430 × 890

## States visually inspected
- active / needs review
- nothing needs you
- new / empty group
- settlement in progress
- everyone square
- offline / saved data

## Fidelity ledger

### 1. Frame
**Golden evidence:** fixed header and bottom navigation; center-only scrolling.  
**Render:** same three-region shell.  
**Result:** pass.

### 2. Typography
**Golden evidence:** confident 26px state headline, compact utility text.  
**Render:** `One thing needs you.`, `Nothing needs you.`, `Everyone’s square.` retain the same hierarchy.  
**Result:** pass.

### 3. Components
**Golden evidence:** restrained white cards, 18px radius, thin borders, subtle shadow.  
**Render:** attention, position, recent activity, empty, and progress cards remain within the family.  
**Result:** pass.

### 4. Iconography
**Golden evidence:** Lucide-style currentColor line icons.  
**Render:** header, attention, expense rows, bottom navigation, people, settle, and add-expense controls all use the same line language.  
**Result:** pass.

### 5. Color semantics
**Golden evidence:** pink = strategic action/attention; green = positive financial state; obligations not alarm-red.  
**Render:** pink is limited to unresolved attention / CTA / center action; green is used for money owed to the user and settled/caught-up status.  
**Result:** pass.

### 6. Copy
**Golden evidence:** short, scannable, action-led.  
**Render:** `One thing needs you.`, `Review dinner`, `You’re owed`, `Nothing needs you.`, `Ready when you are.`, `Settlement in progress.`, `Everyone’s square.`  
**Result:** pass.

## Automated structural QA
- internal hash links: 96
- broken internal links: 0
- placeholder icon glyphs: 0
- horizontal overflow: 0 at 393 × 852 and 430 × 890
- header/content overlap: 0
- content/footer overlap: 0

## Semantic QA correction
The first build used technically valid links that looped the back button and global tabs inside Group Home. Before handoff:
- Back now exits toward Home.
- Bottom Pots exits toward Home.
- Bottom People / Activity / You exit toward their global areas.
- Recent `See all` opens the expense-list handoff.

## Remaining review gate
No known layout/blocking defects remain in the prototype. User review is required before Golden approval.
