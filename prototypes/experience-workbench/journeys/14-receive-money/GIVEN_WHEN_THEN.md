# Journey 14 — GIVEN / WHEN / THEN

| GIVEN | WHEN | THEN |
|---|---|---|
| The owner has saved receiving methods | They open Receive | Only their available methods appear; no amount or payment is invented |
| TWINT is selected | The owner chooses Marc and reviews | The exact number, currency, owner and single audience are shown |
| A reviewed share | Share with Marc is pressed | A create command is prepared; no accepted record or payment yet |
| The create command is accepted | Its exact result returns | One private 24-hour record becomes ready; no delivery/receipt claim |
| Marc's CHF 30.00 request is the origin | Details, preview and return are visited | Person, currency, amount, source items and request identity stay intact |
| A CHF-scoped request | A DOT destination is attempted | It is excluded/rejected; no implicit conversion |
| A wallet address on Demo network A | Another network is substituted | The review/code is blocked even if the ticker stays DOT |
| Dev can view Jeanine's shared details | Dev returns to the payment | CHF 54.30 and the method are retained; no new share authority or payment |
| A private link for Marc | Sam or an anonymous viewer tries it | No receiving fields are disclosed |
| A private recipient response | The audience opens it | Only selected receiving fields and approved optional amount are returned; no source group IDs |
| An unknown create result | Check status is pressed repeatedly | Only recovery occurs; no new create and no success manufacture |
| An unknown stop result | The user navigates away and returns | The same unresolved operation resumes; stopped is not asserted |
| Verified non-acceptance | Try again is pressed | The same command/payload is reused; one accepted share at most |
| A pending or accepted command | A duplicate click/result arrives | No duplicate accepted record or payment is created |
| An active matching share | The owner repeats the same reviewed share | The existing record is reused |
| A different audience | A new reviewed share is accepted | It has a separate scope; no access widening of the original |
| Destination or request version/amount/items changes before acceptance | The old result is submitted | It is rejected; the current details require new review |
| An active link's destination changes or is removed | The code or details are opened | The old version is blocked, not silently redirected |
| A stopped or expired link | Back navigation tries to reopen it | No QR or recipient detail disclosure is restored |
| Stop is requested | Before acceptance | The record remains active internally; the UI says stopping/checking, not stopped |
| A stop is accepted | The owner returns | Future link access is stopped; prior records, requests, balances and memberships remain |
| Raw details were copied | The link later expires/stops | The UI does not claim it can recall external copies |
| Clipboard is unavailable or denied | Copy details is pressed | No copied claim; selectable text is supplied |
| Copy is pending | The selected destination changes before its callback | The new destination is not falsely labelled copied |
| Sharing preview is opened, cancelled or fails | The user returns | The same record remains; delivery/payment is not confirmed |
| The client is offline | New sharing/recovery/copy is attempted | It is blocked; reconnection does not automatically share |
| A verified accepted result arrives while client offline | The client reconnects | The existing result is retained, not submitted again |
| Access is revoked | Old routes or Back are used | Destination data is hidden and only a non-sensitive exit remains |
| Unexpected secret-like fields appear | Copy or share is attempted | They are rejected, not exported |
| A QR is shown | It is decoded in this demo | It contains only an inert example.invalid reference, not payment instructions |

Executable evidence: 44 model scenarios / 151 assertions, plus 36 browser interaction runs and all 22 states at two phone sizes. These are prototype tests, not deployed-server guarantees.
