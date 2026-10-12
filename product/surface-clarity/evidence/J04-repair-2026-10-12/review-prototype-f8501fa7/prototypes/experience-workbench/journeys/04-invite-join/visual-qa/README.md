# Journey 04 — Visual QA

## Render method
Local Playwright + system Chromium fallback because the browser surface was unavailable for direct file/localhost rendering.

## Viewports
- 393 × 852
- 430 × 890

## Reviewed states
- Invite people
- Share invite
- Invite complete
- Open invite
- Joined
- Expired
- Offline

## Visual comparison to Golden references

### 1. Frame
PASS — fixed header + fixed action footer; center content is the only scroll region.

### 2. Typography
PASS — same headline scale, card text hierarchy, utility labels, and control sizing as Create Group V2.

### 3. Palette
PASS — same background, surface, borders, black primary action, pink accent, green success state.

### 4. Card language
PASS — same 18px card radius, restrained shadow, interior spacing, and separators.

### 5. Iconography
PASS — line SVG/Lucide-style icons; no Unicode/emoji placeholder icons.

### 6. Density
PASS — low-density, calm screens. No screen tries to show configuration, payment rails, or wallet details.

### 7. Copy
PASS after revision — removed access-control assumptions and shortened privacy text.

## Structural checks
- 14 states
- 37/37 internal hash links resolve
- 393×852: zero horizontal overflow; zero frame overlap across all states
- 430×890: zero horizontal overflow; zero frame overlap across all states

## Candidate fidelity verdict
Journey 04 V1 is consistent with Home V1.4 and Create Group V2 and is ready for user review as Golden Candidate #3.
