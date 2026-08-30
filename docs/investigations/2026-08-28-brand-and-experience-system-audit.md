# ChopDot Brand and Experience System Audit

**Kind:** measurement and governance-gap audit
**Status:** review required; no redesign accepted by this document
**Observed:** 2026-08-28
**Exact target:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Branch:** `codex/agent-loop-ci-hook-repair`
**HEAD:** `3b1715bb2c3f3f8d09d32974ad08d0297805bb65`
**Owner:** product experience, with operator approval and independent product assurance
**Authority:** evidence about the current surfaces and missing governance only. This audit cannot choose a permanent brand, navigation, visual direction, or product priority.

## 1. Executive verdict

The current experience fails as a coherent group-money application.

This is not primarily a color-polish problem. The deployed and current-source
Home screens are composed like a campaign or feature landing page: a large
receipt headline and promotional call to action dominate the first viewport.
The application homebase a participant expects is absent or subordinate:

- no meaningful identity mark beyond a text wordmark and initial avatar;
- no overview of total owed, owing, balance, or current group-money position;
- no activity or recent-change surface;
- no clear distinction between open groups, needs-attention work, and records;
- no group-first information architecture in primary navigation;
- no coherent placement model for People, payment methods, history, and
  settings; and
- no accepted brand-and-experience contract that explains what belongs where
  and why.

The existing product benchmark already requires clear balances, status,
activity/history, familiar group creation and responsive access through
`BASE-GROUP-01`, `BASE-STATUS-01`, `BASE-HISTORY-01`, and `BASE-ACCESS-01`.
The Home composition does not currently demonstrate those outcomes. Receipt
capture remains a valid `Catch` job, but it cannot stand in for the entire
application structure.

The next product-design action is therefore **not** “polish the receipt hero.”
It is to define and approve a Brand and Experience Contract that restores the
category application structure, then adds ChopDot's differentiation on top.

## 2. Evidence boundaries

### 2.1 Live deployed surface

The inspected public URL was:

`https://chopdotapp01.dot.li/?chainBackend=rpc-gateway`

The host loaded outer CID:

`bafybeifuwlobydydh2ezprm57qix6s6xwnm47fy3u6zvsnghd27i6cdztq`

Tracked release evidence binds that CID to:

- commit `cd61093b2af158ca1ba08f26c84c732f30007d4d`;
- tree `3b4b2807ed02880fdc3fea060f576548fcdc1dcb`;
- build ID `chopdot-cd61093b2af1-68ce7c04192f`; and
- CAR SHA-256 `b9fa8263b7f83c05a32547803078db1bbb47c232c5fc8d07b4f8f5657a34a6ae`.

Sources: `docs/release/current-release-state.json` and
`docs/release/frozen-candidate-cd61093b-evidence.json`.

### 2.2 Current exact-worktree source

The audited worktree is at commit
`3b1715bb2c3f3f8d09d32974ad08d0297805bb65`, not the deployed commit. A local
runtime was opened from this exact worktree only to observe current source.
The audit screenshots are not deployment proof.

### 2.3 Local frozen build directory

`dist-dot-host/release.json` describes a third identity:

- commit `89a5b136170fcac7f892b752af759c132e058307`;
- tree `034dadf99bc6e5c29764d3f820dcbe62e434146f`;
- branch `codex/chopdot-v1-launch`; and
- build ID `chopdot-89a5b136170f-c750928018a0`.

That local directory is neither the current HEAD nor the currently deployed
CID and cannot be used as current experience proof.

### 2.4 Product routing state

The following commands were newly executed from the exact worktree and all
failed closed with exit code `1`:

```text
npm run context:validate
npm run product:validate
npm run product:query -- "next"
```

Exact failure:

```text
context branch mismatch: codex/agent-loop-ci-hook-repair != codex/chopdot-v1-launch
```

The product source can be inspected, but the current branch cannot claim a
validator-approved Cockpit route until that mismatch is deliberately
reconciled.

## 3. Operator correction captured in this audit

The operator confirmed that the visible experience is materially different
from the intended application and from the structural quality expected across
their other products. In particular, the current surface:

- looks like a front page instead of an application homebase;
- lacks a real logo and coherent brand placement;
- does not show activity;
- does not provide an overview of what the participant owes, is owed, or their
  balance; and
- does not establish a reliable hierarchy for where each product job belongs.

This correction is accepted as product-owner input for the next definition
step. It does not, by itself, select the final palette, logo, navigation labels,
or exact screen layout.

## 4. Fresh visual walkthrough

All deployed screenshots were captured through the official host at 390x844.
Current-source screenshots were captured from a local runtime of the exact
worktree. Browser scaling produced larger raster dimensions for the local
captures; the intended CSS viewport was 390x844 unless the filename says
desktop. All committed captures are JPEG-encoded and use `.jpg` filenames.

### 4.1 Deployed Home — **FAIL**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/01-deployed-home-mobile-host.jpg`

SHA-256:
`d3951d59697e59687351dcd80021c2d723c817fb87563f0d420e282af784e2a9`

Observed:

- “Start with the receipt” and the magenta receipt button consume the dominant
  hierarchy.
- `Your groups` is secondary, and the mode catalog begins below it.
- There is no balance overview, owed/owing summary, recent activity, or
  needs-attention region.
- The page reads as an acquisition or feature landing page inside an already
  entered product.

Why it fails:

The universal receipt composition conflicts with the job-specific benchmark
boundary and with the intended stable application homebase. The receipt action
is valid only when the participant's observed job is to capture a spend.

### 4.2 Deployed New Group — **FAIL / known P0**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/02-new-group-mobile.jpg`

SHA-256:
`5124c8097bf31d2dd7d7365cf047764c83ef91e19564bf893bfdf78e57effcfd`

Observed:

- Generic form composition with a large instructional trust panel and unused
  space.
- The enabled action can reach a hidden account-authority failure with no
  useful recovery path, as recorded in
  `docs/release/2026-08-24-live-first-use-findings.md`.
- This surface uses mint, black, white, and gray while Home relies on a more
  expressive magenta hero, without a documented relationship between the two.

### 4.3 Deployed People — **PARTIAL**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/03-friends-mobile.jpg`

SHA-256:
`740ee3bd4ebeb40462cb8e27717cd55c3f5c83014c1b726c3cb3c31e5d80b848`

Strengths:

- One contained job and a readable single-card hierarchy.
- Copy correctly states that contact verification does not add someone to a
  group.

Problems:

- Navigation says `Friends`; the page says `People`; the conceptual model is
  unresolved.
- “Both of you sign the same short exchange” exposes implementation-shaped
  ceremony rather than the simplest trust outcome.
- `Use my account` is setup language, not a clear statement of the user result.
- This job may belong under a People/contact area or the invitation flow; the
  current primary-nav placement is not justified by evidence.

### 4.4 Deployed Pay — **FAIL / information-architecture mismatch**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/04-pay-mobile.jpg`

SHA-256:
`b8b2d0757f9c4689ea616b78e87a73de7474ab13ccd2e067b7a1c1ddfd8761ee`

Observed:

- Navigation promises `Pay`; the page is `Receive Money` configuration.
- Cash, bank details, payment link, and wallet connection are method settings,
  not a complete pay/request/record/settle experience.
- `Connect PAS wallet` exposes rail language without explaining its user value.

Why it fails:

A primary navigation destination and its page purpose do not match. Payment
methods may be important, but the current placement makes configuration look
like the product's payout journey.

### 4.5 Deployed History — **PARTIAL**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/05-history-mobile.jpg`

SHA-256:
`d21d8213c17298e44fa09dde8e5b22ae48e63ab6a04a37d6fe1642b9c4b83baa`

Strengths:

- Calm, understandable empty state.

Problems:

- It describes only finished-group summaries.
- It does not cover recent activity, corrections, open history, or “what
  changed,” even though `BASE-HISTORY-01` requires those outcomes.
- The relationship between `Activity`, `History`, and `Saved records` is not
  defined.

### 4.6 Deployed Settings — **PARTIAL**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/06-settings-mobile.jpg`

SHA-256:
`80e7f5f2c80ad51655e0a2ea683377d276508f7c968f636bc3087f0076543e80`

Strengths:

- Familiar grouping for appearance, currency, privacy, and about.
- Destructive data clearing is visually distinct.

Problems:

- Settings occupies scarce primary-navigation space despite being a secondary
  application destination.
- Public deployment says `Version 1.0.0 (Local)`, which is contradictory.
- A dark-mode toggle exists, but no governed color-mode or semantic-token
  contract explains the result.

### 4.7 Current-worktree Home — **FAIL, despite a partial source repair**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/08-current-worktree-guest-home-mobile.jpg`

SHA-256:
`67b4ba8f801a4996b6eddac164cbdf7f4f296de47de0212c1da14ba691458845`

Observed source improvement:

- The large mode catalog and duplicated empty-state group button were removed
  in commit `74d81cba8edd7200246b837c5a31ec4f00456409`.

Remaining failure:

- The receipt hero still defines the Home hierarchy.
- Groups remain subordinate.
- Balances, owed/owing, activity, and needs-attention information remain
  absent.
- The primary navigation still omits a group or activity destination while
  elevating Friends, payment-method configuration, and Settings.

This proves that the source repair reduced overload but did not repair the
fundamental application composition.

### 4.8 Current-worktree New Group — **PARTIAL, unreleased**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/09-current-worktree-new-group-mobile.jpg`

SHA-256:
`23035047970856dd10ad1c8b8e0e700fadcedf83c6d5be3aa13e0f0ebe9f2b5b`

Improvements:

- Plain-language mode selection exists.
- The large trust panel was removed.
- The boundary “Only you are added now” is shorter and closer to the action.
- The current implementation preserves the group name and provides retry copy
  around authority setup.

Open design questions:

- The exact first-use journey still needs live multi-account proof.
- The disabled magenta action is very faint; the measured composite text-to-
  background contrast is approximately 2.27:1. Disabled controls are not
  judged as ordinary active text under WCAG, but the state is still weak as
  product feedback.
- Mode selection is useful here, but the mode taxonomy and explanation require
  the same-task baseline and operator review before final acceptance.

### 4.9 Current-worktree dark mode — **PARTIAL**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/10-current-worktree-home-dark-mobile.jpg`

SHA-256:
`81b6b17c12a0dfe8b8b2b9b79fc85044f6f2196369f6305705ebbb6361f062a3`

The dark surface is readable and the magenta action remains prominent, but it
inherits the same wrong Home composition. Color-mode coherence cannot rescue
an incorrect information hierarchy.

### 4.10 Current-worktree desktop — **FAIL / mobile shell enlarged**

Evidence:
`docs/investigations/evidence/2026-08-28-brand-experience/11-current-worktree-home-desktop-1280x800.jpg`

SHA-256:
`50556637eac1a4ac824ba90e240a3bbce0e856394fd6cffc485c0f1ab9e1bdf2`

`src/App.tsx` bounds the product to `sm:max-w-[640px] lg:max-w-[720px]` and a
fixed-height centered shell. The current desktop result is therefore a mobile
composition inside a large unused canvas, not a desktop information
architecture. The code is wider than the deployed 375-pixel candidate, but it
does not yet provide a responsive desktop experience.

## 5. Brand-system audit

### 5.1 What exists

- Inter is declared as the primary font.
- `#e6007a` is the de facto bright brand/action accent.
- `#c40068` is used for smaller light-theme accent text.
- `#f7f6f4` is the principal warm canvas in newer surfaces.
- near-black and white provide the high-contrast base.
- Lucide supplies a generally consistent outline-icon family.
- pill actions, large radii, soft borders, and soft shadows recur across the
  newer work.
- a dark color mode and reduced-motion rule exist.

These are useful ingredients, not yet a governed brand system.

### 5.2 The tracked design document is stale and contradictory

`DESIGN.md` was last changed by commit
`3ead3ea692d2186fff92634aba014646f1d1938f` on 2026-07-06. It defines neutral
gray primary actions and blue interactive links. Current source uses magenta
primary actions and focus treatment extensively, including source changed on
2026-08-24.

The document does not define:

- the ChopDot brand promise or personality;
- logo/wordmark rules;
- semantic color tokens and permitted color roles;
- iconography, illustration, photography, or empty-state imagery;
- responsive information architecture;
- navigation and page-composition rules;
- tone-of-voice patterns by product state;
- activity, balance, group-card, and needs-attention components; or
- visual acceptance examples for mobile, tablet, desktop, light, and dark.

### 5.3 Styling is distributed instead of tokenized

Newly measured source counts:

| Measurement | Result |
|---|---:|
| Hard-coded hex occurrences in `src` | 141 |
| Source files containing hard-coded hex values | 37 |
| Direct `#e6007a` occurrences | 57 |
| Raw `<button>` elements in `src/components` and `src/App.tsx` | 87 |
| Shared `<Button>` component uses | 36 |
| Component TSX files importing shared primitives | 19 of 44 |

These counts do not prove every direct style is wrong. They prove that visual
roles are not centrally governed and that changing the brand safely would
require broad manual edits.

### 5.4 Typography is externally dependent

`src/index.css` imports Inter from `fonts.googleapis.com`, and the built CSS
retains that external request. Offline, privacy, CSP, and deterministic-host
behavior therefore depend on the fallback stack unless the font is already
available. A durable brand contract should either bundle the approved font or
explicitly accept the system-font fallback as the design.

### 5.5 Color measurements

Measured from the declared colors:

| Pair | Contrast |
|---|---:|
| white on `#e6007a` | 4.52:1 |
| `#e6007a` on `#f7f6f4` | 4.19:1 |
| `#c40068` on `#f7f6f4` | 5.48:1 |
| Tailwind gray-600 (`#4b5563`) on `#f7f6f4` | 7.00:1 |
| white on dark canvas `#030712` | 20.13:1 |

White on the magenta primary action barely clears the 4.5:1 normal-text
threshold. The bright magenta should not be used indiscriminately for small
text on the warm canvas. Full accessibility still requires computed-state,
focus, zoom, screen-reader, keyboard, and real-device testing; these samples
are not a compliance verdict.

## 6. Information-architecture finding

The current navigation is:

```text
Home | Friends | Pay | History | Settings
```

The product's actual enduring objects and jobs are closer to:

```text
money position | groups | open actions | activity/history | people |
payment methods | settings
```

The current navigation therefore over-promotes secondary configuration and
under-represents the product's primary object: the group and its shared money
state.

### Candidate application-home structure for operator review

This is a hypothesis to review, not an accepted wireframe:

1. **Brand and account header** — actual ChopDot identity, participant/profile,
   and unobtrusive access to account-level controls.
2. **Money overview** — what the participant owes, is owed, and net position,
   with currency and scope stated plainly.
3. **Needs attention** — only when real pending actions exist; no fabricated
   universal action.
4. **Your groups** — the primary working set, with role-appropriate status,
   amount, people, and next state.
5. **Recent activity** — readable changes, requests, claims, confirmations,
   corrections, and closeouts.
6. **Create or join** — visible but secondary to continuing existing work when
   existing work exists.
7. **Receipt capture** — reachable as an Add/Catch action and contextually
   elevated when the participant is actually capturing a spend.

Likely primary navigation should represent the persistent product model, not
the current implementation modules. A plausible direction is `Home`, `Groups`,
`Activity`, plus a bounded create/add action and an account/profile destination.
People, payment methods, and settings may sit under their relevant context or
account area. The exact labels and placement require operator approval and
same-task evidence.

## 7. Required Brand and Experience Contract

The repository needs one tracked, dated, revocable contract subordinate to
`PRODUCT_TRUTH.md` and current product decisions. It should define:

1. **Brand role** — what ChopDot should feel like and what it must never feel
   like.
2. **Identity assets** — logo, wordmark, icon, avatar, favicon/app icon, safe
   area, sizes, light/dark use, and prohibited substitutions.
3. **Semantic visual tokens** — canvas, surface, text, action, trust, success,
   warning, danger, focus, disabled, radius, spacing, elevation, type, and
   motion.
4. **Information architecture** — persistent destinations, object hierarchy,
   and placement rules for Home, groups, activity, people, money methods,
   history, and settings.
5. **Home-state contract** — empty, first group, returning, owes, owed,
   needs-attention, all-clear, offline, error, and privacy-sensitive states.
6. **Core components** — money overview, group card, activity row,
   needs-attention prompt, person row, method row, empty state, action patterns,
   and navigation.
7. **Content design** — plain group-money terms, trust/authority distinctions,
   error and recovery voice, and internal-language exclusions.
8. **Responsive behavior** — mobile, tablet, desktop, host frame, reflow,
   density, and input-mode rules.
9. **Accessibility** — contrast, focus, keyboard, touch targets, semantics,
   screen-reader names, reduced motion, zoom, and reflow.
10. **Evidence and override rules** — how product cards specify bounded art
    direction without silently rewriting the durable system.

`DESIGN.md` should be replaced or explicitly superseded after the new contract
is approved. The current frontend-design method should load the accepted
contract; it should not invent a palette or infer page structure from generic
one-action rules.

## 8. Objective Brand and Experience loop

### Expected outcome

A participant entering ChopDot can identify the product, understand their
current group-money position, find their groups and recent activity, recognize
any real open action, and reach the relevant job without interpreting a
promotional front page or infrastructure language. The same accepted visual
and information system is recognizable across mobile, desktop, light, dark,
empty, active, error, and recovery states.

### Proving evidence

- accepted Brand and Experience Contract with operator approval;
- current E2 category/visual walkthroughs for the same Home and normal-group
  jobs;
- token and component conformance report;
- production-entrypoint screenshots at declared states and viewports;
- keyboard, screen-reader, contrast, touch, reflow, and reduced-motion results;
- independent product and visual review against the accepted contract;
- immutable candidate identity and separate live readback; and
- real participant comprehension of balances, groups, activity, open actions,
  and payment state.

### Failure outcome

The package remains rejected if Home still reads as a landing page; required
balance, group, activity, or status information is missing; a navigation label
does not match its destination; styling depends on contradictory sources; the
wrong actor appears able to act; a viewport is clipped or underused; or local
and live candidate identities differ.

### Accountable owners

- Product owner/operator: brand and experience intent approval.
- Product experience: information architecture, interaction, content, and
  visual system.
- Frontend implementation: faithful implementation only.
- Independent product/accessibility/visual assurance: acceptance evidence.
- Release integrator: exact candidate and live identity.

### Retry and exit

A failed state returns to the owning source or component with one changed
hypothesis. Cosmetic retries do not count. The loop exits only when the bounded
normal product passes the accepted contract locally, independently, in the
frozen candidate, and live as separate verdicts.

## 9. Decision and next move

**Decision: REPAIR THE PRODUCT DEFINITION BEFORE UI IMPLEMENTATION.**

The repo is not too contaminated to continue, but the visual and experience
authority is missing and the existing design document is stale. Starting a new
repo would discard substantial working authority and release evidence without
solving the decision problem.

The next bounded move is:

1. review this audit with the operator;
2. select the intended product personality and application-home structure from
   three visual/experience directions grounded in real references;
3. write the accepted Brand and Experience Contract;
4. reconcile P-022 and the frontend-design method to that contract;
5. replace scattered style values with semantic tokens and shared components;
6. implement the Home/group/activity/navigation vertical slice;
7. independently test it against the category baseline and this loop; and
8. only then freeze and deploy a new candidate.

No product source, brand asset, deployment mapping, or release candidate was
changed by this audit.
