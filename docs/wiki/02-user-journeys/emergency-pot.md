# Emergency pot journey

GIVEN a private request with trusted roles and a threshold, WHEN the threshold
approves release and the recipient confirms what arrived, THEN the group keeps
a minimally disclosed record. Reasons, recipient details, secrets, and recovery
capabilities must not leak into URLs, notifications, exports, logs, or public
storage.

The production workspace never asks for the private reason. It records a
request-scoped digest, exact target, chosen recipient, trusted approvers, and a
threshold inside the encrypted participant-held history. Contributions are
first recorded and then confirmed by the organizer. Reaching the threshold
does not move money; it only permits the organizer to record an external
payment. Only the recipient can confirm or dispute what arrived. The saved
support summary omits request identifiers, reason digests, payment references,
and request-specific recipient identity.

If the recipient disputes a recorded release, the disputed record remains in
immutable history. Trusted approvers separately authorize a correction using
the configured threshold; only then may the organizer record a new exact
external-payment successor. The recipient confirms that successor before the
request can close. When canonical membership removal affects a trusted
approver, the organizer must sign an explicit active-member policy
reconciliation; open approvals are filtered to the reconciled policy and no
departed member silently retains approval power.
