# QUALITY-002 Preflight — Mobile, accessibility + consumer polish

Status: BUILDING
Branch: `chatgpt/chopdot-v1-completion`

## Goal

Make the safer v1 flows comfortable and understandable on real phones and assistive input without reopening financial authority or protocol architecture.

## Audit order

1. shared touch targets and visible keyboard focus;
2. safe-area / viewport behavior on notched and home-indicator devices;
3. semantic headings, main content and screen-reader labels/status;
4. loading/disabled/error feedback on async actions;
5. long names, long group titles and large amounts;
6. bottom navigation state semantics and safe-area behavior;
7. copy consistency and crypto jargon leakage;
8. reduced-motion / high-contrast issues where current UI creates a real usability problem.

## Findings so far

- shared `Button` removed native focus outline but did not provide a `focus-visible` replacement;
- icon buttons used padding that could produce a target below 44px;
- muted buttons had no minimum touch height;
- shared buttons did not default to `type="button"`, making future form nesting capable of accidental submission;
- `ScreenHeader` used hard-coded top padding rather than `env(safe-area-inset-top)`;
- header back icon was not explicitly hidden from screen readers even though the button already has the accessible name;
- `ScreenContent` was a generic `div` rather than the primary content landmark;
- bottom action already respects bottom safe area; preserve it.

## Implemented so far

- shared `Button` now has a minimum 44px touch height, 44px icon target, visible `focus-visible` ring, disabled state, and defaults to `type="button"`;
- `ScreenHeader` now respects top safe area, uses balanced 44px side slots, and marks the decorative back icon `aria-hidden`;
- `ScreenContent` now renders as `<main>` and uses overscroll containment.

## Rules

- do not change monetary state semantics for visual convenience;
- never hide an error solely to simplify a screen;
- keyboard focus must be visible;
- touch actions should meet approximately 44x44 CSS px where practical;
- safe-area handling belongs in shared layout primitives where possible;
- icon-only controls require accessible names;
- async success/failure should be exposed in text/ARIA status, not only color/icon;
- long content must truncate/wrap without hiding the identity of a payment or creditor;
- no fake haptics, wallet capability or native behavior.

## Verification required before DONE

- `npm run lint`
- `npm run build`
- relevant unit tests
- keyboard-only walkthrough of onboarding → group → spend → request → payer return → confirmation → history;
- mobile viewport proof on at least narrow iPhone-class and Android-class sizes;
- safe-area proof in standalone/embedded host;
- VoiceOver/TalkBack or equivalent semantic spot-check on navigation, money actions, error/status text and icon-only controls;
- long-name / large-amount screenshots.

Written changes are not runtime evidence. Do not mark DONE without execution proof and current-source reconciliation.
