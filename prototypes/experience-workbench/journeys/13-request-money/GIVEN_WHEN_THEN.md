# Acceptance cases — Journey 13 V1

Given Marc owes CHF 30.00 in Zurich Weekend, when Dev reviews and sends, then exactly one private request binds that amount and its source item; no expense or membership changes.

Given a note has been reviewed, when the note changes, then another review is required before sending. Markup in a note is rendered as text, never executed.

Given a record was accepted but delivery is queued, when its detail opens, then it says Request created, not Request sent or paid.

Given delivery failed, when retry delivery is selected, then the same request goes back to queued; no second request is created.

Given the save outcome is unknown, when Check status is selected repeatedly, then no acceptance or retry is inferred. Given verified non-acceptance, retry uses the same command identity and payload.

Given an existing request overlaps a new group/all-groups scope, when sending is attempted, then the existing request opens instead. Separate currencies remain independent.

Given a source amount, version or membership changes after review, when acceptance is attempted, then the old payload is rejected. A changed amount is displayed for a new review, not silently substituted.

Given an expense issue affects Marc's Zurich item, when Sam's unrelated balance is requested, then Sam remains available.

Given a request is active, when its requester withdraws and the save is accepted, then the record is retained as withdrawn; the original payload, expenses, balance and other memberships stay intact.

Given a withdrawal has an unknown result, when status is checked, then the request stays active until the service result is known. A failed withdrawal retries the same command.

Given payment is in progress or the request version changes during withdrawal, when withdrawal acceptance is attempted, then it is rejected for current-state review.

Given a verified paid observation from the payment journey, when this request is revisited, then it is complete and its settled items cannot create a new request. No sender-side mark-paid action exists.

Given an offline draft, when connectivity returns, then the note stays but nothing sends automatically. Given access is revoked, Back cannot restore the old private view.

Given an accepted operation, when navigating back or resuming, then the accepted result is not undone and an unresolved operation is not replaced by a fresh composer.
