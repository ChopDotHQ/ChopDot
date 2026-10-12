# Gate C approved-source review

**Conclusion: a precise partial-settlement attribution decision is missing from the examined approved sources.**

Frozen authority: `4ba456e6595330e4ca8e21366e0d827f17e10881`  
Frozen schema: `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`  
Accepted Gate B base: `28775726dc06b1823e231d50b4d84080a07530fb`

This is a read-only source review, not a review or clearance of the developing Gate C implementation. I independently verified 19 source records against frozen git objects, including all three copied Gate C Goldens. Hashes and blob IDs are in `source-hashes.json`.

## What is explicit

- J10 permits netting only the same pair in one currency. Its example is CHF 74.30 owed in Apartment offset by CHF 20.00 owed back in Ski Trip, producing CHF 54.30. The group-level offsets must remain visible.
- J11 permits eligible multi-group person scopes, requires exact source items, and requires a partial payment to show paid-now amount, remainder and included items. Only the confirmed partial amount closes; its source lineage remains.
- J12 explicitly defines CHF 54.30 minus confirmed CHF 20.00 as CHF 34.30 remaining and requires affected group balances to be recomputed.
- The approved J12 reducer carries both group names and signed source item IDs, but computes only `original - settled`. It has no per-group residual allocation. The approved continuity UI displays pair remainder plus group names, not a numeric allocation to each group.
- Schema LAW-PAY-03 and approved LOCK-02 retain source dependencies while a partial remainder is open. Neither selects an allocation policy.

## Precise gap: GC-SOURCE-PARTIAL-ATTRIBUTION-01

For the approved example, the pair remainder after CHF 20.00 confirmation is unambiguously CHF 34.30. The written constraints alone do not distinguish, for example, keeping Apartment CHF 54.30 owed and Ski Trip CHF 20.00 owed back, from recognizing the cross-group offset and leaving Apartment CHF 34.30 with no Ski Trip remainder. These are illustrations of the missing choice, **not approved implementations**. Both preserve the same pair arithmetic; they expose different group obligations and future settlement scopes.

The sources do not say which groups/items receive each confirmed minor unit, when opposing credit lineage is consumed, or how order/proportions/rounding and reversal attribution are chosen. A deterministic implementation choice alone does not turn one of those policies into approved product truth. The expense-split MoneyV1 remainder rule applies to expense allocation and cannot be borrowed as settlement attribution authority.

The smallest decision needed, if the integrated prototype must publish numeric group/item residuals for this ambiguous case, is the expected source-application rule and exact residuals for that example, including offset credits, later settlement and reversal. Pair-level remainder, immutable scope/lineage, authority gates and recovery can be implemented and tested independently. A genuinely single-source-group settlement has no cross-group attribution ambiguity, but that does not certify the approved multi-group case or justify silently omitting it.

## Source anchors

- [J10-NETTING](https://github.com/ChopDotHQ/ChopDot/blob/4ba456e6595330e4ca8e21366e0d827f17e10881/prototypes/experience-workbench/journeys/10-overall-position/spec.md#L53-L66): same pair/currency offset; Apartment74.30 minus SkiTrip20.00; visible group-level offsets.
- [J11-PARTIAL](https://github.com/ChopDotHQ/ChopDot/blob/4ba456e6595330e4ca8e21366e0d827f17e10881/prototypes/experience-workbench/journeys/11-settle-up/spec.md#L103-L143): exact partial close, source lineage, same-pair/currency eligible multi-group scope, partial amount/remainder/items display and maximum eligible amount.
- [J12-RESULT](https://github.com/ChopDotHQ/ChopDot/blob/4ba456e6595330e4ca8e21366e0d827f17e10881/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#L49-L78): 54.30 minus20.00 equals34.30; source lineage; recompute affected groups; Saved record.
- [J12-DEMO-MODEL](https://github.com/ChopDotHQ/ChopDot/blob/4ba456e6595330e4ca8e21366e0d827f17e10881/prototypes/experience-workbench/journeys/12-complete-settlement/source/continuity-model.cjs): multi-group source arrays but only aggregate original-settled balance; no group residual allocation.
- [J12-RETURN](https://github.com/ChopDotHQ/ChopDot/blob/4ba456e6595330e4ca8e21366e0d827f17e10881/prototypes/experience-workbench/journeys/12-complete-settlement/RETURN_CONTEXT_MAPPING.json): payment context and pair-level resulting amounts only.
- [SCHEMA-PAY-03](https://github.com/ChopDotHQ/ChopDot/blob/5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013/product-schema/semantic-core.json#L3273-L3289): partial remainder source lineage and dependency preservation, no allocation policy.
- [LOCK-02](https://github.com/ChopDotHQ/ChopDot/blob/5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013/product-schema/product-decisions-v2.json#L17-L35): current/proposed economic dependency guard; issues invalidate prepared intents; partial remainder retains dependency.

## Source-supported implementation checklist

- **GC-SOURCE-01 — J10 position:** Derived read model; People default, Groups secondary; show net and gross owed/owing, same-pair same-currency offsets and explainable groups/items; separate currency partitions and explicitly optional estimates, never use estimate as payment instruction. Source: J10 spec primary view/netting/currency/readiness.
- **GC-SOURCE-02 — J11 scope and preparation:** Resolve and preserve exact payer/recipient, one currency/asset, source groups/items, selected method, expiry and stable payment/idempotency identity before final review/authorization. J11 prepares/requests authorization; opening a method does not complete. Source: J11 spec contract1–5, scope/amount rules; schema ctx.settlement.
- **GC-SOURCE-03 — Eligibility and effect boundary:** Positive selected amount cannot exceed current eligible scope. Revalidate balance change/dispute before execution; disputed sources block only dependent items. Later unrelated expenses must not silently mutate frozen prepared lineage. Source: J11 spec/GIVEN_WHEN_THEN; DEC-EXPENSE-SETTLEMENT-LOCK-02; settlement.prepare.
- **GC-SOURCE-04 — External/manual authority:** Payer sent claim gives Sent/Waiting only. Canonical recipient separately confirms exact received amount; Not yet leaves open. Do not derive recipient authority from refresh/navigation or workshop persona role controls. Source: J12 spec core external/manual and STATE_AND_AUTHORITY.
- **GC-SOURCE-05 — Wallet authority:** Approval request is not authorization. Explicitly labelled simulated verified result may advance the prototype; exact payer/recipient/amount/asset/currency/method/source/expiry/payment/idempotency matching governs receipt/closure. No actual provider/funds/secrets. Source: J11 compatibility closeout; J12 wallet path and prototype boundary.
- **GC-SOURCE-06 — Typed progress and result:** Keep sent, waiting, received and complete visibly/semantically distinct. Only accepted exact result closes a payment item; recompute position, do not edit display totals. Partial closes confirmed amount only, shows remaining amount and preserved lineage; no replacement retry for open partial. Source: J12 spec partial/result; LAW-PAY-01/02/03 and LAW-OP-01.
- **GC-SOURCE-07 — Unknown and retry:** Timeout/disconnect/missing callback means unknown; reconcile existing identity. Retry/method change requires trusted scope-matched nonexecution and consumes eligibility once. Repeated clicks/reconnect/replay never repeat effects or create replacement identity. Source: J12 V1.1 continuity, STATE_AND_AUTHORITY, GIVEN_WHEN_THEN C06–C08; LAW-OP-01.
- **GC-SOURCE-08 — Continuity:** Every Back/Done/position/history/record/review handoff retains payment identity, person, method, original currency, source lineage and latest accepted result. Reads/refresh are pure and cannot reset to TWINT/default fixture or switch viewer identity. Source: J12 RETURN_CONTEXT_MAPPING, spec one payment context, C01–C10.
- **GC-SOURCE-09 — Post-start dispute and reversal:** Post-start disputed dependency prevents dependent closure while independent payments remain usable; verified reversal reopens only exact affected item and recomputes read models. Do not unlock unresolved or partial-dependent expense mutations without authoritative safe release. Source: J12 failure/recovery; LOCK-02.
- **GC-SOURCE-10 — Saved record and replay:** Keep human-readable record distinct from durable accepted event. Preserve amount/currency/payer/recipient/method/source groups/items/timestamps/confirmation reference. Delayed record retrieval never undoes or repeats settlement. Replay reconstructs accepted state without execution. Source: J11 storage/replay closeout; J12 Saved record and C09.
- **GC-SOURCE-11 — Recovery and bounded exits:** Approved surfaces include offline/loading, no method/request details, balance changed/already in progress, wallet approval rejected/expired/disconnected/unknown/recovering, known no-effect failed/expired/cancelled, receiver not yet/amount different, issue after send and record unavailable. Make unsupported future methods/requests/history support explicit bounded handoffs, not false success. Source: J11/J12 inventories and manifest screen IDs; J12 prototype boundary.
- **GC-SOURCE-12 — Local prototype disclosure:** One canonical browser-local state can demonstrate these rules; fixture provider/receiver actions must be labelled. Browser state is not backend authorization, production durable storage, ordinary authenticated API or real payment finality. Keep implementation terms outside normal product UI. Source: J12 prototype boundary; J11 visible UI rules.

## Source precedence and limits

The earlier J11 GIVEN/WHEN/THEN text loosely permits resumption/retry after timeout. The later approved J12 V1.1 contract and schema LAW-OP-01 are precise: unknown outcome requires recovery of the existing identity; only trusted nonexecution permits one eligible retry. Do not implement the earlier wording as timeout-driven replacement execution.

The broader external-provider phrase in J12 DECISIONS does not override the updated manual-path spec: TWINT, bank, PayPal and cash require canonical recipient confirmation; the exact-wallet exception cannot become payer self-confirmation.

Search/absence confidence is bounded to the examined frozen specifications, state/authority and GIVEN/WHEN/THEN records, approved reducer/UI, Golden artifacts, schema laws/context and approved decision documents. No universal claim about every historical conversation is made. No product authority, source file or candidate implementation was changed.
