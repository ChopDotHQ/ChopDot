# ChopDot UX Quality Process

Status: **pilot process for Integrated Preview V2**

The Gate A exercise established that route coverage, isolated Golden fidelity, and green CI are not enough. ChopDot now reviews each bounded integration stage through the same repeatable sequence.

## Stage gate sequence

```text
1. Golden extraction
      ↓
2. Integrate plumbing + shared state
      ↓
3. Automated primary/alternate/recovery paths
      ↓
4. Screenshot every meaningful state
      ↓
5. Contact-sheet + transition audit
      ↓
6. Fix fidelity / continuity defects
      ↓
7. UX Laws V1 review
      ↓
8. Fix BLOCKER / MAJOR UX findings
      ↓
9. Re-capture affected screenshots + regression paths
      ↓
10. Human walkthrough / acceptance
      ↓
11. Only then expand to the next gate
```

## Why the order matters

### Fidelity before optimization
A UX law must not be used to rationalize changing an approved Golden. First determine whether the integrated screen is actually the approved product.

### Continuity before polish
If J01 says the user is Sam and J02 becomes Devinson, button polish is irrelevant. Fix shared identity/context/object state first.

### Screenshots before abstract review
A contact sheet exposes visual drift, prototype chrome, inconsistent fixtures, bad endings, and product transitions that are easy to miss while clicking one screen at a time.

### Laws before final acceptance
The seven-law review is used after the experience is coherent enough to judge. This lets us distinguish a fidelity bug from a deeper usability problem.

### Human acceptance remains final
Automation and heuristics can identify likely problems. They do not substitute for a person using ChopDot and judging whether the experience makes sense.

## Required evidence per stage

Every Gate A/B/C/... review packet should contain:

- exact integrated source SHA;
- Golden sources/versions in scope;
- primary visible path result;
- relevant alternate path result;
- relevant failure/recovery result;
- screenshots for all meaningful states;
- one contact sheet in sequence order;
- continuity findings;
- completed seven-law table;
- open BLOCKER/MAJOR findings;
- refreshed screenshots after material fixes;
- human acceptance comment/reference.

## What counts as a meaningful screenshot state

Capture a state when it changes what the user must understand or decide, including:

- first entry;
- new vs returning user where behavior differs;
- important form step;
- confirmation/ending;
- pending/unknown result;
- error/recovery result;
- permission/capability boundary;
- cross-journey handoff;
- empty/first-use state when materially different;
- alternate method when its mental model differs.

Do not capture every trivial hover/focus state simply to inflate coverage.

## Two-pass screenshot review

### Pass A — individual screens
Check hierarchy, copy, icons, density, affordances, target sizes, system status, and accidental internal/reviewer UI.

### Pass B — sequence
Check that the same person, objects, values, terminology, visual system, authority and unfinished work survive the transitions.

Pass B is mandatory. Gate A demonstrated that all individual screens can be valid artifacts while the sequence still becomes the wrong product.

## UX-law review

Use:
- `docs/ux-quality/UX_LAWS_V1.md`
- `docs/ux-quality/JOURNEY_UX_REVIEW_TEMPLATE.md`

V1 covers:
- Hick’s Law;
- Peak-End Rule;
- Zeigarnik Effect;
- Tesler’s Law;
- Jakob’s Law;
- Miller’s Law / chunking;
- Fitts’s Law.

Do not produce an overall numeric UX score. Record concrete findings and severity.

## Scope-control rule

If a UX-law recommendation conflicts with a Golden, product contract, financial invariant, security invariant, identity boundary, or recovery truth:

**stop and record the conflict.**

Do not silently “improve” the product in integration code. The smallest required product decision must be reviewed explicitly.

## Learning loop

This is intentionally a practice loop rather than a supposedly perfect methodology on day one.

After Gates A and B, review the process itself:
- Which laws repeatedly found useful defects?
- Which checks produced noise?
- What did human review catch that the framework did not?
- Did the process materially slow implementation?
- Should we add a second layer such as Nielsen’s usability heuristics, accessibility checks, or platform-specific guidelines?

Only add criteria that improve defect discovery or decision quality enough to justify their cost.
