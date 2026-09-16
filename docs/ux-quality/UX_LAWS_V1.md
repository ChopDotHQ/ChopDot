# ChopDot UX Laws Review Standard V1

Status: **pilot standard**
Scope: UX/UI review of approved journeys while integrating them into the continuous ChopDot product.

This standard adds a psychology/usability review layer **after Golden fidelity and continuity are established, but before a stage is accepted**.

It does **not** replace the approved journey Goldens, product contracts, financial/security invariants, accessibility requirements, or human usability testing. It is a structured lens for finding friction that a fidelity check alone will not catch.

## Sources and interpretation

Starter source selected by Devinson:
- MockFlow, “7 Top Laws of UX That Shape Intuitive User Interfaces” (2026): https://mockflow.com/blog/top-laws-of-ux-for-ui-ux-designers

Primary reference used to normalize the definitions:
- Jon Yablonski, Laws of UX: https://lawsofux.com/
- Laws index: https://lawsofux.com/laws/

Important interpretation rule: these are **principles, not literal pass/fail formulas**. Not every law applies equally to every screen. A journey review must mark a law as `APPLIES`, `PARTIAL`, or `N/A`, explain why, and record concrete evidence.

We do not assign a single UX score. False precision is less useful than explicit findings, severity, evidence, and a fix hypothesis.

## The seven V1 laws

### UX-01 — Hick’s Law

**Definition**
The time required to make a decision increases as the number and complexity of choices increase.

**ChopDot questions**
- Is the primary action obvious without scanning many competing choices?
- Are secondary/advanced options progressively disclosed rather than dumped into the common path?
- Are choices grouped into understandable categories?
- If a decision is genuinely complex, have we broken it into smaller decisions without hiding necessary truth?
- Have we simplified so far that the user loses meaning or control?

**Common ChopDot risks**
- money flows presenting too many methods/actions at once;
- account/settings screens becoming a settings directory rather than a task;
- expense splitting exposing every advanced option before the common Equal case is established;
- Home showing too many equal-weight calls to action.

### UX-02 — Peak-End Rule

**Definition**
People disproportionately remember the most intense moments of an experience and how the experience ends.

**ChopDot questions**
- What is the peak moment in this journey: success, uncertainty, conflict, payment, joining, recovery?
- Does the UI make that moment understandable and trustworthy?
- Does the journey end with a clear state and meaningful next step?
- Do error/recovery endings preserve confidence rather than feeling like a dead end?
- Does a successful completion feel complete without fake celebration or overstating financial finality?

**Common ChopDot risks**
- ambiguous settlement endings;
- “success” screens that imply more certainty than the system actually has;
- recovery that technically works but leaves the user unsure what happened;
- abrupt handoffs between journeys.

### UX-03 — Zeigarnik Effect

**Definition**
Incomplete or interrupted tasks tend to remain salient in memory.

**ChopDot questions**
- If a task is incomplete, can the user see that it is incomplete?
- Can they safely resume it later without reconstructing context from memory?
- Are progress/status indicators useful where a multi-step task truly exists?
- Does Home/Activity surface genuinely unfinished obligations without nagging?
- Do we preserve drafts/context after interruption or failure?

**Ethical boundary**
Do not deliberately create artificial incompleteness merely to drive engagement. Use this principle to make real unfinished work visible and resumable.

**Common ChopDot risks**
- pending invites, reviews, settlements, or account linking disappearing from view;
- lost drafts;
- a user returning to an operation but not knowing which step/state they are in.

### UX-04 — Tesler’s Law / Conservation of Complexity

**Definition**
Every system contains irreducible complexity; good design decides where that complexity should live rather than pretending it can disappear.

**ChopDot questions**
- Are we asking the user to understand complexity the product can safely handle?
- Are smart defaults doing useful work without silently making financial/identity decisions for the user?
- Is advanced complexity available only when needed?
- Are unavoidable consequences still visible at decision time?
- Have we hidden complexity that is actually necessary for informed consent, money, identity, or recovery?

**ChopDot-specific boundary**
“Hide complexity” never means hide authority, financial scope, participant identity, uncertainty, or consequences. In sensitive flows the product should absorb operational complexity while exposing the minimum truth required for informed action.

### UX-05 — Jakob’s Law

**Definition**
Users bring expectations from the other products they already use and generally prefer familiar interaction patterns.

**ChopDot questions**
- Are navigation, back/cancel, sign-in, forms, tabs, settings, confirmation, and error patterns familiar?
- Do icons use recognizable semantics rather than custom symbols that require learning?
- When ChopDot intentionally diverges from Splitwise/banking/wallet conventions, is the benefit clear enough to justify the learning cost?
- Are the same action and concept named consistently across journeys?
- Does the design behave according to the host platform’s conventions where appropriate?

**Common ChopDot risks**
- custom Web3 language leaking into ordinary expense tasks;
- wallet/provider concepts replacing familiar user intent;
- similar actions using different labels in different journeys.

### UX-06 — Miller’s Law / Chunking

**Definition**
Working memory is limited. In interface design, the useful lesson is to **chunk related information into meaningful groups**, not to enforce a magical maximum of seven menu items.

The Laws of UX material explicitly warns that Miller’s “7 ± 2” finding is frequently misused to justify arbitrary interface limits. ChopDot reviews therefore use this law as a **chunking and memory-load principle**, not a numeric menu rule.

**ChopDot questions**
- Is related information grouped into meaningful units?
- Can the user understand the current decision without remembering details from the previous screen?
- Are important context and consequences visible at the moment of action?
- Are long forms/lists structured for scanning?
- Are we relying on recognition rather than recall where possible?

**Common ChopDot risks**
- settlement scope requiring memory of earlier balances/groups;
- expense forms with too many undifferentiated controls;
- recovery asking users to remember what operation failed.

### UX-07 — Fitts’s Law

**Definition**
The time and effort required to acquire a target depend on its size and distance.

**ChopDot questions**
- Are high-frequency and primary actions large and easy to acquire?
- Are touch targets comfortably tappable at mobile sizes?
- Is there enough spacing to avoid accidental taps?
- Are destructive or financially consequential actions protected from accidental activation?
- Are related controls spatially close while incompatible/destructive controls are sufficiently separated?
- Are frequent mobile actions placed where they are reachable without awkward hand movement?

**Common ChopDot risks**
- tiny edit/delete/back controls;
- crowded wallet/payment actions;
- small icon-only targets with no clear hit area;
- destructive confirmation adjacent to cancellation.

## Finding format

Every law review finding uses this shape:

```text
ID: UX-05-J01-001
Journey/state: J01 / Welcome
Law: Jakob’s Law
Applicability: APPLIES
Severity: MAJOR
Evidence: Wallet-first language/icon behaves unlike the approved/familiar sign-in hierarchy.
User consequence: New users may interpret wallet ownership as required to use ChopDot.
Recommendation: Keep email as primary familiar path; wallet remains alternate.
Owner: Gate A integration
Status: OPEN
```

Severity:
- **BLOCKER** — likely prevents task completion, creates dangerous misunderstanding, or violates a product/safety contract.
- **MAJOR** — substantial friction, confusion, loss of control, or journey breakdown.
- **MINOR** — localized usability problem that should be improved but does not undermine the journey.
- **OBSERVATION** — worth tracking; evidence is not strong enough to require a change yet.

## Review unit

Review at three levels:

1. **Screen/state** — what is visible and actionable now?
2. **Journey** — does the sequence reduce friction and end clearly?
3. **Cross-journey transition** — does the next journey preserve persona, context, object identity, terminology, and mental model?

The third level is mandatory. The Gate A screenshot exercise showed that individually-correct screens can still produce a wrong product when the transition changes persona, fixtures, visual system, or state.

## Acceptance rule

A journey/stage is not UX-law reviewed merely because all seven rows exist.

Acceptance requires:
- every applicable law reviewed with evidence;
- BLOCKER and MAJOR findings resolved or explicitly human-deferred with rationale;
- screenshot/contact-sheet evidence refreshed after material fixes;
- no UX-law fix may silently override a Golden/product/security contract;
- Devinson performs the final human walkthrough.

## Expansion rule

V1 intentionally starts with these seven laws because they are compact enough to practice repeatedly.

After two stage gates, review whether to add a second checklist layer (for example Nielsen’s usability heuristics, accessibility, or platform-specific HIG criteria). Do not add more frameworks simply to make the checklist longer; add them when they repeatedly catch defects the V1 laws miss.
