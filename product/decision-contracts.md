# ChopDot Public Beta Decision Contracts

## DC-001 - Capture

- First screenshot has one dominant `Scan a receipt` action.
- Photo/import/link precede manual correction.
- OCR failure is visible and changes no shared state.
- Review shows amount, currency, payer, people and split before acceptance.

## DC-002 - Money and membership

- Wrong actor/signature/version/frontier/currency produces no state change.
- Contact verification never grants group membership.
- Marked paid, cleared, confirmed received, approved/released and closed remain distinct.
- Exact replay and checkpoint replay produce the same state hash.

## DC-003 - Recovery

- Fresh browser/device restores from account-authorized encrypted data.
- Wrong account/key/group/digest and stale head fail closed.
- Revoked members cannot read future data.
- Recovery-kit skip copy is honest and non-blocking.

## DC-004 - Modes

- Every mode completes its baseline through production UI.
- Every path names actor, transition, authority, privacy, offline/recovery and failure.
- No mode adds custody, guaranteed payout or parallel authority.

## DC-005 - Release

- Clean commit/tree, dependency lock, build aggregate, CAR hash and CID are recorded.
- Devnet and public root/app records resolve the same CID and release ID.
- Real host screenshots show no internal infrastructure language.
- Rollback bytes and previous mappings are read back before promotion.
