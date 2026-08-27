# Community fund journey

**Kind:** reference
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** scoped journey reference derived from Product Truth, current Cockpit decisions and contracts, ADRs, and exact mode evidence; it cannot set priority or release status
**Sources:** P-008, DC-004, One Chop Core tests

GIVEN roles, contributions, and a bounded proposal, WHEN the configured
threshold approves release and the recipient or steward confirms handoff, THEN
the group records a readable report. Reject, expiry, amendment, recovery, and
steward transfer are explicit. No token voting or unilateral organizer release
is implied.

The production workspace starts with one steward, named reviewers, and an
approval threshold. Contributions count only after the steward confirms what
arrived. Proposals keep a short group-readable summary, exact amount, recipient,
expiry, and digest; amendments clear prior approvals. The steward can record an
external payment only after the threshold is met, and only its recipient can
confirm arrival. Steward transfer is a two-person propose/accept handoff.
Readable fund updates are signed into the same history, while payment
references remain outside the redacted report.

Canonical removal of the steward or an approver requires an organizer-signed
policy reconciliation to active members. Pending handoff is cleared and open
proposal approvals are retained only for people still named by the new policy;
there is no silent authority transfer. Once every contribution and proposal is
resolved and no handoff is pending, only the current steward may sign the fund
close. A closed fund rejects every later proposal, contribution, release,
handoff, report, or policy change while preserving the complete history.
