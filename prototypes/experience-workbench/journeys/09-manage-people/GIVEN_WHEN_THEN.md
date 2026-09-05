# Journey 09 — GIVEN / WHEN / THEN

| GIVEN | WHEN | THEN |
|---|---|---|
| Four active Zurich members plus Nina invited | Open People | Count four members and one invitation separately; Nina gets no member authority |
| Jeanine has zero in Zurich and −CHF 54.30 elsewhere | Inspect group, then all groups | Keep the scopes separate; derive exact global amount from Apartment and Ski Trip |
| Sam has CHF and DOT items | Request one currency | Include only that currency's items and correct method suggestion |
| Luca has EUR 18.00 | Open the Settle boundary and return | Retain EUR, Luca, Lisbon and Bank transfer |
| Directory search is “jean” | Open a detail, scope, handoff, then return | Preserve the search and identity |
| Recipient did not share payment preferences | Open preferences | Reveal no destination; no edit-other-person control |
| Viewer is a member, not owner | Open or force a manage route | Guard denies removal; no member record changes |
| Marc has open Zurich items | Review removal | Block removal; navigate to that balance without closing it |
| Jeanine has no open Zurich items | Owner requests removal | Remove only after mock acceptance; leave Apartment membership and all ledger items intact |
| A removal response is unknown | Repeatedly check status | Keep one command identity; show no execution-retry action |
| The same response is verified not saved | Retry | Recheck guards and reuse the same command identity |
| Permission changes while saving | A stale acceptance arrives | Reject the command; do not remove the member |
| Stream version changes or a new open item appears | Removal result arrives | Reject stale acceptance; no false success |
| An accepted removal is received twice | Apply both results | Remove once; preserve all history |
| A different removal is requested while one is unknown | Submit | Resume/block against the existing operation; do not reuse it for another person |
| Offline with a saved roster | Read people or attempt invite/payment/removal | Allow reading only; require reconnection for writes |
| Only Marc's Zurich item is disputed | Inspect Sam or Marc's unaffected Ski scope | Keep unrelated amounts actionable; global Marc scope remains blocked |
| Viewer lost Zurich access | Return to directory or use browser Back | Do not reveal the revoked group; other shared groups remain available |
| An invitation or payment boundary is opened | Go back | No invitation sent, payment started, receipt confirmed, or balance changed |
| Any approved Golden exists | Build/replay gate | Its HTML checksum is unchanged; TYPO-01 remains deferred |
