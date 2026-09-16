# ChopDot Journey UX Review Template

Use one copy per integrated journey or bounded stage.

## Header

- Journey / stage:
- Golden source/version:
- Integrated build SHA:
- Viewports reviewed:
- Reviewer:
- Date:
- Screenshot/contact-sheet evidence:
- Status: `NOT REVIEWED | REVIEWING | CHANGES REQUIRED | HUMAN REVIEW | ACCEPTED`

## 0. Preconditions

Before applying UX laws, confirm:

- [ ] Golden source is identified.
- [ ] Required screens/states/actions are present.
- [ ] Shared persona/object/session state is coherent across inbound/outbound transitions.
- [ ] Reviewer/demo chrome is hidden in normal product mode.
- [ ] Required icons/visual vocabulary are present.
- [ ] Primary path works through visible UI.
- [ ] Relevant failure/recovery path is reachable.

If these fail, fix fidelity/continuity first. Do not use UX-law findings to rationalize a broken integration.

## 1. Screenshot + transition audit

Capture every meaningful state in the bounded review scope, including:
- primary path;
- alternate entry/method path;
- success/ending;
- important pending/unknown state;
- important error/recovery state;
- inbound and outbound transition states.

Review the contact sheet twice:

### Pass A — screen-by-screen
- hierarchy;
- copy;
- icons;
- action discoverability;
- density;
- target size/spacing;
- system status;
- accidental reviewer/prototype UI.

### Pass B — sequence-as-product
- same person?
- same group/expense/payment?
- same currency/amount?
- same terminology?
- same visual system?
- correct before/after state?
- did navigation itself accidentally manufacture a result?

Record findings before applying the laws.

## 2. Seven-law review

Use `docs/ux-quality/UX_LAWS_V1.md` as the definitions and questions.

| Law | Applicability | Evidence / finding IDs | Status |
|---|---|---|---|
| UX-01 Hick’s Law |  |  |  |
| UX-02 Peak-End Rule |  |  |  |
| UX-03 Zeigarnik Effect |  |  |  |
| UX-04 Tesler’s Law |  |  |  |
| UX-05 Jakob’s Law |  |  |  |
| UX-06 Miller’s Law / Chunking |  |  |  |
| UX-07 Fitts’s Law |  |  |  |

Applicability is `APPLIES | PARTIAL | N/A`. `N/A` requires one short reason.

## 3. Findings

Copy this block for each finding:

```text
ID:
Journey/state:
Law or audit source:
Applicability:
Severity: BLOCKER | MAJOR | MINOR | OBSERVATION
Evidence:
User consequence:
Recommendation:
Contract conflict? YES/NO
Owner:
Status: OPEN | FIXED | DEFERRED | NOT-A-FINDING
Verification:
```

## 4. Fix review

After fixes:

- [ ] Re-run primary visible path.
- [ ] Re-run affected alternate/error paths.
- [ ] Refresh screenshots/contact sheet.
- [ ] Confirm fix did not regress another Golden state.
- [ ] Confirm shared-state continuity still holds.
- [ ] Confirm no new reviewer/demo chrome leaked into product mode.
- [ ] Re-check affected UX laws.

## 5. Acceptance summary

### What is strong

- 

### What remains weak

- 

### Human-deferred items

- 

### Evidence

- 

### Final status

`CHANGES REQUIRED | READY FOR HUMAN REVIEW | ACCEPTED`

A stage is not `ACCEPTED` until the human walkthrough is complete.
