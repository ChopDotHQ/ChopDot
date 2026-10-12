# Gate C source attribution decision

Status: **UNDECIDED**. Finding: `GC-SOURCE-PARTIAL-ATTRIBUTION-01`.

This decision is about what the integrated prototype displays and records when a confirmed payment reduces debts across groups. It does not require production payment infrastructure.

Approved example: Devinson owes Jeanine CHF 74.30 in Apartment; Jeanine owes Devinson CHF 20.00 in Ski Trip. Their net is CHF 54.30. A confirmed CHF 20.00 payment leaves CHF 34.30 owed to Jeanine. Original expense bytes and source history must remain intact.

The approved sources require recomputing affected group balances, but do not specify how the offset and paid amount are attributed to the source groups/items. The separate read-only review documents the precise gap. Two distinct numeric group residuals produce the approved pair remainder:

| Illustration, not approval | Apartment owed | Ski Trip owed back | Net owed |
| --- | ---: | ---: | ---: |
| Apply payment to Apartment; keep offset open | CHF 54.30 | CHF 20.00 | CHF 34.30 |
| Consume offset, then apply payment | CHF 34.30 | CHF 0.00 | CHF 34.30 |

## Proposed decision for user consideration

Use the second rule: after an accepted exact result, consume included same-pair/same-currency offsets and apply the confirmed paid amount to the remaining positive source obligations. Within several items, use oldest accepted expense first, then stable expense ID to break ties. Freeze and show the planned source application before authorization; if the recipient confirms less, apply only that confirmed amount. Record exact per-item applications as settlement history, without rewriting the original expenses. A verified reversal restores the exact recorded applications. Later payments use the resulting residuals. An open partial remainder retains the original lineage and required dependency protection.

For this example, CHF 20.00 of payment plus the CHF 20.00 included offset reduces the Apartment obligation to CHF 34.30 and leaves no Ski Trip obligation for this pair. Only CHF 20.00 is represented as money paid; the internal offset remains separately traceable. No effect is applied merely because a payment is prepared, sent, received-but-not-closed, refreshed or unknown.

This is a **new proposed product decision**, not an inference that the frozen contract selected this policy. Do not implement it or mark it accepted without a user decision. Record any accepted decision alongside Gate C; do not rewrite the frozen V1 schema or Golden/C1 sources.

## Executable evidence

Run `./run.sh` from this directory; Node.js 20+ is the only prerequisite. It validates 19 copied sources against their SHA-256 and git blob IDs, exercises 10 focused checks on the unchanged approved J12 reducer, and shows both arithmetic illustrations. Exit 0 means the source demonstration ran; it does **not** mean Gate C is complete or either policy is accepted.
