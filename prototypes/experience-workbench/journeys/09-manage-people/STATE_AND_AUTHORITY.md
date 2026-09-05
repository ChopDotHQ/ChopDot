# Journey 09 — State and Authority

| State | Authority / meaning | Allowed next action |
|---|---|---|
| members / directory / person / groups | Authorized read model, not a writable balance | Inspect exact relationship or scope |
| preferences | Recipient controls disclosure and destination; viewer cannot edit another person's details | Read preference; own methods route to J20 |
| roles | Selected-group role, never global payment authority | Read capabilities |
| manage | Group owner may propose a member change | Review removal |
| remove-confirm | Eligibility reviewed; no membership change yet | Request exact removal |
| remove-saving | Scoped request submitted to simulated service | Wait; do not claim completion |
| remove-unknown | Acceptance unknown | Reconcile same command; no execution retry |
| remove-failed | Verified no change accepted | Retry same command, fresh guards |
| removed | Service accepted exact command once | Read updated roster; retain history |
| remove-blocked | Dependent open group items exist | Inspect balance; no mutation |
| access-changed | Identity/role/version/member access no longer valid | Leave stale context; no bypass |
| offline | Cached read only | Read saved roster; reconnect for changes |
| loading / error | Read unavailable | Retry read without changing records |
| handoff | Navigation boundary only | Return with context; no payment/request authorization |

Only verified current-group authority may accept a membership change. Command acceptance rechecks actor, group owner, version and open items. Removing a member is not settling a payment or deleting an expense. An accepted retry returns the prior result; it does not remove another person.

Prototype actions run entirely in memory. Demo service controls explicitly inject accepted, not-saved, or permission-lost results. These are not production authentication, permissions, storage or realtime implementations. Production checks must be authoritative backend code.
