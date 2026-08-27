# ChopDot Public Beta Decision Contracts

**Kind:** guardrail
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** executable acceptance boundaries for current decisions

## DC-001 - Capture — reviewed 2026-08-24

- First screenshot has one dominant `Scan a receipt` action.
- Photo/import/link precede manual correction.
- OCR failure is visible and changes no shared state.
- Review shows amount, currency, payer, people and split before acceptance.

## DC-002 - Money and membership — reviewed 2026-08-24

- Wrong actor/signature/version/frontier/currency produces no state change.
- Contact verification never grants group membership.
- Account ownership and personhood never grant group membership or organizer authority.
- Marked paid, cleared, confirmed received, approved/released and closed remain distinct.
- Exact replay and checkpoint replay produce the same state hash.

## DC-003 - Recovery — reviewed 2026-08-24

- Fresh browser/device restores from account-authorized encrypted data.
- Wrong account/key/group/digest and stale head fail closed.
- Revoked members cannot read future data.
- Recovery-kit skip copy is honest and non-blocking.

## DC-004 - Modes — reviewed 2026-08-24

- Every mode completes its baseline through production UI.
- Every path names actor, transition, authority, privacy, offline/recovery and failure.
- No mode adds custody, guaranteed payout or parallel authority.

## DC-005 - Release — reviewed 2026-08-24

- Clean commit/tree, dependency lock, build aggregate, CAR hash and CID are recorded.
- Devnet and public root/app records resolve the same CID and release ID.
- Real host screenshots show no internal infrastructure language.
- Rollback bytes and previous mappings are read back before promotion.
- A live P0/P1 first-use failure invalidates the candidate even when byte and chain gates pass.

## DC-006 - Context and Cockpit — reviewed 2026-08-24

- Every default read path exists in the exact worktree and is typed, scoped,
  owned, and freshness-bounded.
- Cockpit `next` is selected by blocker severity and explicit priority, never
  Markdown file order.
- Missing, stale, cross-worktree, generated-as-authority, or ambiguous context
  fails validation.
- KG facts remain distinct from Repo Graph facts and direct source facts.
- `kg_known=true` requires active v2, no fallback, citations, and exact accepted
  root/branch/commit identity.

## DC-007 - First-use account setup — reviewed 2026-08-24

- A guest may capture locally without account ceremony.
- A shared signed action either completes account binding behind one
  plain-language action or presents one working recovery action before the
  final mutation.
- Group name and safe local draft state survive rejection, retry, and reload.
- The UI does not expose `Product Account`, host, adapter, chain, personhood, or
  protocol language as the cause of failure.
- Empty Home has one dominant receipt action, prioritized group cards, and one
  New Group action; modes live inside creation.

## DC-008 - Full release completion — reviewed 2026-08-27

- `implemented`, `tested`, `committed`, `pushed`, `candidate_built`, `staged`,
  `promoted`, `reachable`, `user_owned`, `user_proven`, and `kg_known` are
  measured and reported separately.
- `implemented=true` requires the normal journey and every named mode through
  the production entrypoint; service fixtures alone are insufficient.
- `tested=true` requires zero unresolved release-blocking authority, privacy,
  recovery, accessibility, dependency, contract, or release findings.
- `promoted=true` requires the same CAR SHA-256 and root/app CID as the staged
  candidate; rebuilding for a public environment is a failure.
- `reachable=true` requires fresh live readback from every advertised surface,
  not an upload receipt or local preview.
- `user_owned=true` requires post-transfer chain readback, and
  `user_proven=true` requires one real organizer plus two real participants.
- `kg_known=true` requires the current portable knowledge port to cite the
  exact accepted root, branch, commit, and outcome without fallback. A backend
  version name cannot satisfy this contract by itself.
- Any false verdict, byte mismatch, stale candidate, approval mismatch, live
  P0/P1, or unowned advertised name returns to the owning gate and preserves an
  explicit rollback target.
