# ChopDot Wiki

**Kind:** guardrail
**Status:** active
**Owner:** documentation
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** documentation-routing guardrail subordinate to Product Truth, current Cockpit decisions and contracts, ADRs, and exact evidence; source wiki pages explain scoped claims only

This directory explains the current launch architecture, journeys, and proof
gates. `PRODUCT_TRUTH.md` remains the only product-law file. Source pages are
hand-maintained; `*.generated.md` files are disposable read models.

Run `npm run wiki:sync` after changing a source page.

The operative hierarchy is registered in `product/context-authority.json`.
Wiki pages explain scoped claims from registered authorities; they do not create
product law, decide current priority, or prove release state.
