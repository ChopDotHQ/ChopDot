# Journey 14 — UI to domain events

The machine-readable mapping covers 86 rendered control/state combinations. Navigation and demonstration controls are distinguished from product commands.

| Primary action | Event | Authority / guard |
|---|---|---|
| prepare | ReceivingShareCreateRequested | Owner; exact reviewed destination/version, audience and context; online; no unresolved command |
| stop | ReceivingShareStopRequested | Owner; explicit confirmation; exact active sharing record; online |
| recover | ReceivingShareOutcomeQueryRequested | Existing unresolved command only; no execution retry |
| retry | ReceivingShareCommandRetried | Verified not-saved result; same identity and scope; current version and unexpired authorization |
| copy-raw | ReceivingDetailsClipboardWriteRequested | Exact preview; allowed receiving fields; current access; copy success requires browser callback |
| copy-link | ReceivingLinkClipboardWriteRequested | Current, active, unexpired audience-bound record; no raw detail leakage |
| start-share | ReceivingShareAudienceSelectionOpened | Destination owner only; preserves locked request recipient when present |
| recipient | ReceivingDetailsRecipientPreviewOpened | Labelled owner-side preview; actual read requires matching authenticated audience |
| share-preview | ReceivingLinkExternalHandoffPreviewOpened | Existing private link only; simulated external action, never a payment event |
| share-done | ReceivingLinkExternalHandoffReturned | Observation only; cannot confirm delivery or payment |
| share-cancel | ReceivingLinkExternalHandoffCancelled | Same record; no financial effect |
| share-fail | ReceivingLinkExternalHandoffFailed | Same record; fallback to code or copy |
| refresh | ReceivingDetailsReloadRequested | No unresolved command discarded; clear stale review and revalidate |
| code | ReceivingLinkCodeViewed | Current record; exact opaque reference; no transfer or receipt |
| exit | ReceivingDetailsOriginResumed | Preserve person, method, amount/currency, source context and unresolved outcome |
| manage | PaymentMethodsHandoffPreviewOpened | Journey 20 boundary only; no editing in this journey |
| noop | None | Disabled while pending |
| demo | PrototypeScenarioControlsOpened | Workshop only; not a product/domain event |

Only verified service results emit ReceivingShareCreateAccepted or ReceivingShareStopAccepted. Clipboard and external-handoff outcomes never emit payment authorization, receipt or completion. No user action marks a payment received.
