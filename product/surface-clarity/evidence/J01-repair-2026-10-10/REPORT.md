# J01 bounded integration repair

Proposal based on the committed battle test `6dd36a2278881879caa6e9c5f727fdd168d9d571`
(tree `a18626e957ccee202e17adaa1e24072746f5932e`). This reuses the audit's
findings and sources. It is not independent clearance, human comprehension
evidence or approval of a new product design.

## Repair and existing authority

SC-J01-001: the integrated wrapper now places the public synthetic code `123456`
beside code entry, explains that no email is sent, and exposes separate simulated
wallet outcomes beside the pending result. Source event handlers still consume
their own issued, request-bound evidence. Checking again does not mint authority.
Resend and ready copy identify simulation; no provider, wallet, real account,
signing or funds are introduced. Reviewer fixture panels remain hidden.

SC-J01-002: account-entry Back returns to the incoming guest account boundary,
normal front door or actual canonical invitation/account-link owner. The old
marketing welcome is not an integrated exit. Cancelling clears only entry intent
and unloads the old verification document; saved business history remains.

SC-J01-003: existing authority supplies the bounded behavior; no new product
decision is needed. Frozen `ctx.entry` requires intended destination/invite
preservation. `session.enter` says sign-in preserves original destination/invite
context and does not join or authorize payment. J01-D01 preserves destination
through interruptions; J01-D02 requires a new verification epoch after reload.
The approved front-door decision preserves local work and invite context.
Therefore only the flow/method is retained in the URL, alongside the existing
canonical membership return context. Reload reopens the corresponding fresh
email/wallet step and explicitly asks for fresh verification. Email values, OTP,
pending requests and provider evidence are not persisted for this repair.
S1-issued email/wallet results are rejected by the S2 ordinary result controls.

Frozen schema `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`, tree
`ce5b82d008dfa2f48e714607e30fdb6839b8305c`, and Golden/C1 authority
`4ba456e6595330e4ca8e21366e0d827f17e10881`, tree
`cb424dafedff066fed433e106eb4468bec985d98`, remain unchanged. J01 is regenerated
normally by the existing packager and retains accepted SHA-256
`97f3da489c78cb842c354390b2e354397a6a6c3843228ec9928efebaf21089e8`.
The source model, Golden HTML, schema/tag and production files are not edited.

## Changed files

- `prototypes/integrated-product-preview-v2/app.js`: safe integration routing,
  incoming Back, intent-preserving fresh restart and decoration installation.
- `prototypes/integrated-product-preview-v2/j01-surface.js`: prototype-specific
  truthful instructions and controls, keeping verification in the sealed source.
- `prototypes/integrated-product-preview-v2/j01-browser-qa.mjs`: isolated browser
  regressions with stable J01-R IDs and canonical viewport captures.
- `scripts/surface-clarity.test.mjs`: disposable method-unit fixtures use the
  declared historical implementation; live changed-runtime evidence must remain
  stale. All original 18 cases are retained; no readiness check is weakened.
- This report and `run.sh`: reusable local execution receipt/reproducer.

## Executed checks

Node v24.19.0; Playwright and Chromium version are recorded by the runner.
Local Chromium used here: 153.0.8010.0. Exact commands/exits and raw suite logs
are retained in the engineering evidence output.

| Suite | Result |
|---|---|
| Current J01 model | 50 checks, exit 0 |
| Current subject/request binding model | 163 checks, exit 0 |
| Surface Clarity method regressions | 18 tests, exit 0 |
| New integrated J01 browser regression | 53 checks, exit 0 |
| Existing Gate A browser, exact-money and range/boundary suites | All three exit 0 |
| Existing create/join browser | 31 checks, exit 0 |
| Existing create/join recovery browser | 16 checks, exit 0 |
| Existing Gate D recovery browser | 11 checks, exit 0 |

The J01 browser suite operates real rendered controls in fresh browser contexts
at 393×852 and 430×890. It covers guest first-use/keyboard/reload, account boundary
Back/cancel/reopen, incorrect code, fresh restart, prior-proof replay rejection,
final conversion preserving exact canonical history, returning account (no name
step), context-preserving legacy and canonical invitation entry, wallet
unknown/declined/verified/expired and recovery. Contextual entry alone creates no
member. Existing create/join tests exercise counterpart consent, scoped stable
Participant, account linkage and accepted expense history.

Some recovery tests inject explicit source-supported synthetic preconditions
(offline, expired, reauthentication, load failure, wallet expiry), then operate
the real visible recovery controls. They are not claims of real network/provider
failure reproduction. No borrowed model PASS is relabeled browser PASS.

Earlier new-harness attempts are retained separately as failed development runs:
they exposed a wrong converted-label expectation after reload, incorrect locator
callback argument binding, an ambiguous Back selector and an incorrect fixture
destination expectation. Only the corrected final execution supports the repair.

## Clarity readiness and retained limitations

Runtime bytes changed, so prior clarity records/evidence are stale. The actual
checker must reject them; this repair does not reset bindings, mark findings
fixed in the live register, or mark J01 cleared. The replacement exact-version
surface review and independent engineering review belong to the parent owner.

Canonical screenshots are available for review; capture and overflow checks are
not pixel-perfect Golden comparison or full accessibility qualification.
Keyboard coverage includes the guest primary action, not every focus transition.
No independent reviewer or unfamiliar-person comprehension study ran here.
Hosted Actions and a newly served hosted preview were not executed by this worker.

After completed local conversion, an ordinary full reload retains accepted work
and the local account-created record but does not resurrect a current verified
session; the existing host presents guest Home. This existing limitation is
retained and explicitly tested; no auth proof is restored merely to preserve a
label. Legacy `entry=invite` remains an approved reference-view handoff, while
actual canonical invitations are tested through create/join. Neither path is
remote sharing or real authentication.

The historical standalone subject-binding browser script has an obsolete exact
predecessor-hash precondition and a build that replaces its input. It is not run
against frozen source. Current source model checks and the new ordinary-path
integrated replay regressions are identified separately above.

## One-command reproduction

Prerequisites: Git with the evidence lineage and both pinned authority objects,
Node, Playwright in `CHOPDOT_TEST_NODE_MODULES` (or the checkout's node_modules),
and installed Chromium or `CHOPDOT_CHROMIUM_EXECUTABLE`.

```bash
CHOPDOT_TEST_NODE_MODULES=/absolute/path/to/node_modules \
CHOPDOT_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
bash product/surface-clarity/evidence/J01-repair-2026-10-10/run.sh
```

The runner archives committed HEAD into its own temporary source directory,
packages a separate preview, runs the checks and retains logs/screenshots in the
printed evidence directory. Cleanup removes only its created source/preview;
`KEEP_J01_WORK=1` retains them. It does not reset/clean a user's checkout, touch
browser storage, use real credentials or push. Finalization/publication and
separate exact-version review are the parent's next actions.
