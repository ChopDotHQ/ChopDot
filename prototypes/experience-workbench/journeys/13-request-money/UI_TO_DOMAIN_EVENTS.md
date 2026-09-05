# UI to domain events — Journey 13 V1

72 screen/action mappings, generated from the rendered 393px state inventory plus note input. Disabled and prototype-only actions are identified rather than counted as domain writes.

`review` → **RequestReviewed**. Authorized, online, positive exact balance; no overlapping active request.
`send` → **CreateRequestRequested**. Current reviewed scope and note; immutable command and replay exclusion.
`recover` → **CommandOutcomeCheckRequested**. Existing unresolved command; online; never implies success.
`retry` → **RetrySameCommandRequested**. Verified not saved; same command ID/payload; online.
`retry-delivery` → **RequestDeliveryRetryRequested**. Existing active request; delivery failed; online; same request ID.
`withdraw-review` → **WithdrawalReviewOpened**. Active request owned by current requester; online.
`withdraw` → **WithdrawRequestRequested**. Current actor, request version, active state; no payment in progress.
`open-existing` → **ExistingRequestOpened**. Current authorized request and unresolved-operation recovery.
`refresh-review` → **SourceSnapshotReviewRestarted**. Rejected stale command; re-review current balance.
`return` → **Journey09ReturnRequested**. Preserve person, currency, group scope and original return context.
`safe-return` → **AuthorizedPeopleReturnRequested**. Do not expose revoked scope.
`settle` → **Journey11HandoffPreviewed**. Reverse balance; no payment execution.
`payment` → **Journey12HandoffPreviewed**. Exact request context; no invented payment result.
`issue` → **Journey07HandoffPreviewed**. Dependent item only.
`resume` → **RequestContextResumed**. Never undo accepted changes; unresolved commands first.
`sources` → **RequestSourceBreakdownOpened**. One person, currency and source scope.
`edit` → **RequestDraftReopened**. No accepted or unresolved create may be reopened as a new draft.
`back` → **NavigationBackRequested**. No business-state rollback or access escalation.
`reload-request` → **RequestReadRetried**. Restore existing state; no new send.
`demo` → **PrototypeControlsOpened**. Development only; no production event.
`noop` → **NoCommand**. Disabled transient control.

Acceptance and delivery originate from the synthetic service result controls, not from status-check buttons. The production counterpart must authenticate and validate each result using the approved storage-neutral contract.
