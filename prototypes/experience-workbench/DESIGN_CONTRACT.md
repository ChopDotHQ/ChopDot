# ChopDot UX Design Contract

This file defines stable UX/product rules for the Experience Workbench. It does **not** replace journey specifications, approval records, Golden checksums, or production architecture.

## Authority

When sources disagree, use this order for current product-design truth:

1. `registry/progress.json` and `registry/journeys.json` for current journey/status.
2. `registry/approvals/*.json` for human design approval.
3. `registry/golden-artifact-locks.json` / generated `registry/goldens.manifest.json` for immutable approved artifacts.
4. The current journey's `spec.md`, `STATE_INVENTORY.md`, `EDGE_CASES.md`, and `source/decision-history.md` for journey-local behavior.
5. This contract for shared UX rules.
6. Historical prose, screenshots, and implementation code as reference only.

Approved Goldens are product truth. Existing production code is implementation truth. Neither silently overwrites the other.

## Canonical vocabulary

- **Journey** — one bounded user job with explicit entry, exit, ownership, states, and adjacent journeys.
- **Candidate** — mutable journey artifact under build/review.
- **REVIEWABLE** — mechanical/semantic evidence is sufficient for independent product review, but one or more review lenses remain uncleared.
- **GOLDEN-READY** — independent review found no material blocker on the exact candidate. This is not approval.
- **Golden** — exact artifact explicitly approved by Devinson and checksum-locked in the canonical registry.
- **Shared improvement** — cross-journey issue recorded in `shared/improvements.md`; journey workers may discover it but may not solve it locally.
- **Implementation truth** — what production code actually does today; never use it to retroactively redefine a Golden.

## Shared experience rules

### Navigation and continuity
- Preserve the approved ChopDot shell, navigation language, entry/exit behavior, and adjacent-journey ownership unless a separately reviewed shared-system change is opened.
- Carry the user's intent and relevant context through every state. Do not bounce users to a generic home state merely because an operation is pending, failed, or unavailable.
- Reuse an existing Golden route/pattern before creating a new navigation concept.

### Hierarchy and decisions
- Each state should make the user's current situation and next useful action obvious.
- Prefer one clear primary action; secondary proof, metadata, and advanced controls stay subordinate.
- Do not expose implementation/protocol machinery in the primary customer flow unless the user needs it to make a decision.

### Interaction semantics
- Controls must reflect what the user can actually do in the current state; copy or visual emphasis cannot create authority that the underlying state does not have.
- Pending, success, failure, cancelled/rejected, unavailable, stale, offline, and unknown-result states must be distinct when material to the journey.
- Retry/recovery must preserve idempotency and user context where the underlying product contract requires it.

### Trust, privacy, and authority
- Reveal the minimum sensitive information needed for the current task.
- A saved preference or destination is not payment authority, settlement execution, wallet signing, or permission to share private details.
- Do not present fixture/demo/prototype behavior as live production evidence.
- Do not infer permissions across journey boundaries; follow the owning journey's contract.

### Visual system
- Inherit approved Golden frame, spacing rhythm, typography, components, icon language, status treatment, and interaction density before inventing a new pattern.
- New shared visual patterns require explicit evidence that no approved pattern fits and must be reviewed as shared-system work.
- `TYPO-01` remains deferred. Do not locally alter Golden typography/readability to solve it inside an active journey.

### Responsive and accessibility baseline
- Material journey states must remain usable at the canonical mobile review viewports `393×852` and `430×890`; wider layouts may be added when relevant but cannot substitute for those checks.
- No clipped/hidden required actions, accidental horizontal overflow, frame overlap, or unreachable content.
- Use semantic controls and labels; preserve keyboard/focus behavior where applicable; touch targets must be practical; state meaning must not depend on color alone.
- Automated layout/interaction checks are evidence, not visual approval. A reviewer must directly inspect rendered output before `GOLDEN-READY`.

### Copy
- Prefer plain user language over internal architecture, blockchain, storage, or protocol terminology.
- Status and recovery copy must say what happened, what is still true, and what the user can do next.
- Do not overclaim completion, privacy, settlement, sharing, or verification beyond available evidence.

## Active context bundle rule

Agents must not load the entire history as active instructions. For journey work, compose the working context from:

1. this `DESIGN_CONTRACT.md`;
2. canonical `registry/progress.json` / current journey entry;
3. current journey `spec.md`, `STATE_INVENTORY.md`, `EDGE_CASES.md`, and `source/decision-history.md`;
4. only the adjacent/reused Golden patterns needed for the task;
5. `shared/improvements.md`;
6. the exact current task/reviewer finding.

Everything else is reference evidence, not competing instruction. If the bundle exposes a contradiction, stop scope expansion and record the exact conflict instead of improvising a new product rule.

## Change rule

Journey work may discover a shared-system problem. It may record it. It may not solve it locally. Approved Golden HTML is never edited in place; any visual or behavioral change requires a separately reviewed version and explicit human approval.