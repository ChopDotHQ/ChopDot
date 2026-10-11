# Independent J01 engineering and surface review — 2026-10-10

Reviewer: separate Codex conversation, read-only review; implementation owner remains in originating conversation. No delegated implementation writer. Bounded fixes supported; one-command verification NOT green. No user acceptance, readiness or whole-prototype clearance.

## Exact version and source scope

Live repair branch verified twice with `git ls-remote origin refs/heads/work/j01-surface-clarity-repair`; returned `de9ced5d281ec906f8cd3056164f864528ca7573`. Candidate tree `7f6c85d0e298ae6e0833b9165efb551a61b5c883`; actual parent `6dd36a2278881879caa6e9c5f727fdd168d9d571`, tree `a18626e957ccee202e17adaa1e24072746f5932e`. Main was not used as base. All six changed checkout blobs matched candidate Git objects; see exact-bytes.json and j01-diff.patch. Local worker commit 52fc33e7 was unavailable in fetched history and was not substituted as tested version.

Frozen schema object/tree verified: `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013` / `ce5b82d008dfa2f48e714607e30fdb6839b8305c`; live product-schema-v1 tag also matched. Frozen Golden/C1 object/tree verified: `4ba456e6595330e4ca8e21366e0d827f17e10881` / `cb424dafedff066fed433e106eb4468bec985d98`. Packaged J01 SHA-256 was independently read as `97f3da489c78cb842c354390b2e354397a6a6c3843228ec9928efebaf21089e8`.

Read FRAMEWORK.md, README.md, JOURNEY_PLAYBOOK.md, findings.json, journeys/J01.json, historical J01 REPORT/results, candidate repair REPORT/run.sh, frozen V1_USAGE_GUIDE, frozen composition ctx.entry and semantic-core session.enter, frozen J01 spec/approval, current J01 spec/decision-history/UI adapter, front-door decision and accepted prototype closeout. Front-door decision last source revision: 443a2157a13291774ce087bfabe8aa1293671697. Decision-history revision: 99ddc8962a233cbda88f5da5012fe331776b3eb2. Accepted prototype receipt: docs/prototype-closeout/ACCEPTED-d6c85f9e.md, receipt revision 0bf116b9301681ada8024faf21835def20aba5f7. No AGENTS.md found in candidate or workspace scan.

Exact six-file diff reviewed: repair REPORT.md; run.sh; integrated app.js; j01-surface.js; j01-browser-qa.mjs; scripts/surface-clarity.test.mjs. Disposable framework fixtures restore historical runtime only inside temporary fixture directories. All 18 cases remain; live case still requires stale runtime/evidence errors and INCOMPLETE blockers. This maintenance does not rebind live records or make browser claims.

Original checkout /workspace/ChopDot remained clean at HEAD 5082b80b73be2e1a4a32c0b99e86ff4253709976. Review used a new shared disposable clone, detached at published SHA. No worktree/reset/clean, source edit, push, merge, deploy, tag/frozen-source change, real account/provider or funds operation occurred.

## Finding dispositions within demonstrated scope

SC-J01-001 (historical P2): resolved for tested public code and wallet completion paths. At both 393x852 and 430x890, email states disclose no email is sent; code 123456 is visible before Continue; resend describes a prototype code. Wallet selection says no wallet connects/signs; pending/unknown show visible synthetic approved/declined/unknown controls. Ordinary handlers consume issued adapter evidence. Check again does not verify. Unknown can resolve with fresh same-attempt approval; stale results cannot. Ready explicitly says no real account was created. Declined/expired recovery retains inherited sign-in request wording; it has less local simulation disclosure than pending, a retained presentation limitation rather than observed external activity.

SC-J01-002 (historical P2): resolved for exercised normal Create Back, guest conversion Back to account wall/cancel/reopen, legacy invite Back and canonical invite Back. Native browser Back in code entry also passed. Canonical account-link entry completes back to its owner in existing create/join behavioral checks, preserving the participant and ledger; account-link-specific Back was source-inspected but not independently exercised as a dedicated Back case.

SC-J01-003 (historical P3): source-supported bounded same-tab reload repair resolved. ctx.entry preserves destination/invite identity; session.enter explicitly preserves original context without join/payment. Frozen J01 spec says URL is not proof and fresh document needs verification; D01 preserves interruptions and D02 rotates epoch/request provenance. Wrapper retains allowlisted flow/method in URL and existing canonical return context in sessionStorage, not OTP/email/provider evidence. Reload clears email/pending authority and creates a fresh epoch with visible restart explanation. Email S1 replay is rejected in committed browser tests; wallet S1 approval replay is rejected there and independent probes also reject stale approved, declined and unknown controls. Fresh S2 results still work. New-tab/full browser-session restoration of canonical sessionStorage context is unverified and not claimed.

Final conversion tests preserved people/group/exact expense objects (including CHF 12.01 fixture). Create/join behavioral checks preserved stable participant identity and exact CHF 10.01 guest expense through account linkage, with pending/unknown separate from binding completion. Canonical invite entry/reload produced zero members and retained pending invitation until separate Join consent.

J01-REV-001 (P3, reproducibility/test infrastructure): one-command runner exits 1 at CJ-B16-browser-health after 30 successful create/join behavior checks. Reproduce with the exact committed run.sh and required environment variables below. Actual console error is 404 from /favicon.ico; separate resource probe captured its URL. Candidate does not change test-server.mjs or introduce a favicon. This matches the supplied baseline missing-favicon diagnosis but occurs here in create/join health, not the historical keyboard suite. Smallest correction: serve a valid local favicon or explicitly provide an inert favicon in the disposable preview fixture, retaining the zero-console-error assertion and all 31 checks. Do not filter errors or report the failed health check as PASS. Implementation remains with owner.

## Actual commands and exits

Environment: Node v24.19.0, installed Playwright 1.62.1, Chromium 154.0.8037.57. Canonical CSS viewports 393x852 and 430x890.

`CHOPDOT_TEST_NODE_MODULES=/workspace/chopdot-prototype-tools/node_modules CHOPDOT_CHROMIUM_EXECUTABLE=/usr/bin/chromium KEEP_J01_WORK=1 bash product/surface-clarity/evidence/J01-repair-2026-10-10/run.sh`

Executed from disposable exact-candidate HEAD. Initial restrictive sandbox execution exited 1 at framework subprocess permissions; diagnostic direct execution exposed spawnSync git EPERM. Manual J01 browser launch in that sandbox exited 1 before browser checks with localhost listen EPERM. Unchanged permitted runner was then executed; its exit is 1 due to create/join health. No repeated unchanged product failure run.

| Committed runner stage | Exit | Actual result |
|---|---:|---|
| package | 0 | Accepted J01 seal retained |
| J01 model | 0 | 50 checks |
| subject binding | 0 | 163 checks |
| framework | 0 | 18 tests |
| J01 browser | 0 | 53 checks |
| Gate A wrapper | 0 | browser 118 / exact-money 84 / boundary 60, all child exits 0 |
| create/join | 1 | 30 checks pass; 31st console-health assertion fails |
| create/join recovery | unexecuted by runner | Then separately executed, exit 0, 16 checks |
| Gate D recovery | unexecuted by runner | Then separately executed, exit 0, 11 checks |
| stale checker | unexecuted by runner | Then separately executed, exit 1, expected stale bindings/evidence |

Separate recovery commands used identical PREVIEW_ROOT, Chromium and EVIDENCE_DIR values with the committed recovery scripts; exits/logs retained in recovery-exits.txt and respective logs. Checker command was `node scripts/surface-clarity.mjs check`; current runtime digest `5ca09c9a4c364d955bd8adf627502e48de3949ce1719631ece7ef4f493e9982e`, readiness INCOMPLETE, stale J01 runtime and all three old evidence records. This is not readiness or clearance.

Total across requested browser suites: 372 successful checks; expected 373rd health assertion failed. Models/framework remain distinct. Independent script `node /workspace/work/independent-j01.mjs` exited 0, recording 26 observations (not 26 equivalent suite assertions) and 18 screenshots. Resource diagnostic script exited 1 due to reviewer fetch-response API mistake after retaining console URL and screenshot; its failed exit is retained and is not product failure or PASS evidence. URL evidence is in resource-probe.json. No rerun was needed to identify the favicon.

## Visual/accessibility evidence and limits

Visually inspected all eight committed J01 captures: front-door, code, wallet pending and converted Home at both viewports. Visible guest-first hierarchy matches selected front-door copy. Code instructions are beside code field; wallet outcomes precede Check again/Cancel. Captures are actual local browser screens, not pixel-perfect frozen Golden certification. Independent captures add resend, unknown, ready, declined, expired, recovered and reload states at both sizes. Screenshots and DOM measurements are retained; no horizontal overflow appeared in sampled J01 surfaces.

Measured new wallet result buttons: 32 CSS px tall; code secondary controls 30, Back 36, primary Continue 46. These measurements do not establish comprehensive accessibility conformance; no chosen-standard audit, screen reader, zoom/reflow, physical touch device or contrast certification occurred. Body held focus after multiple rerenders in pointer-driven probes; focus was not automatically placed on new headings. Full keyboard transition/announcement behavior remains unverified; committed keyboard coverage tests only the guest primary action. No cold-person comprehension evidence or population success claim.

No hosted preview/Actions, full repo CI, standalone obsolete-hash subject-binding browser script, or unrelated remaining-family expansion was executed. Supplied older 6dd baseline remains historical: model 50+163/framework18 and Gate B63 interaction+83 recovery passed; keyboard stopped on missing favicon after362 behavior checks, later stages unrun; qa-demo Dinner versus expected Integrated fixture mismatch. Those results were not borrowed as repair evidence, and the historical keyboard/qa-demo failures were not rerun.

## Evidence locations

Stable copied evidence: `/workspace/work/j01-review-evidence/`. Original exact runner artifacts: `/tmp/chopdot-j01-repair.bC2Mz4K7/evidence/`; version.txt, commands.txt, all reached-stage logs/results/screenshots retained. Copied runner artifacts under runner-evidence/; later recovery logs/results are included. Independent DOM/text/screens under independent-surface/. Exact candidate blob inventory and six-file diff are retained alongside failed sandbox/diagnostic logs.

The prescribed user-facing output directory under /codex/browser/projectless could not be created in this execution host (read-only filesystem/permission denied, including permitted command). Receipt is retained with review evidence and communicated inline; no unsupported downloadable output link is claimed.

Findings register/Goldens/schema were left unchanged. This receipt supports bounded engineering dispositions; it neither accepts J01 for the user nor clears its stale bookkeeping or the whole prototype.
