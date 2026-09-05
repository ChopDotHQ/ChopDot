# Entry states and authority

| State | Meaning | Authority to advance |
|---|---|---|
| Welcome / invite / email | Destination chosen; no session | Person may choose or edit entry information |
| Code requested | Current sign-in challenge exists | Delivery service; not proof of identity |
| Code being checked | Verification requested | Authentication provider only |
| Profile | Verified new identity lacks a display name | Signed-in person may supply name |
| Wallet waiting | Sign-in approval requested for chosen account | Verified result for that exact request |
| Wallet unknown | Result unavailable | Recover existing request; refresh is read-only |
| Wallet declined / expired | Prior request cannot authenticate | Person may request a fresh sign-in approval |
| Offline | Cannot establish or refresh a session | Restore connectivity, then repeat the appropriate step |
| Session expired | Reauthentication needed | Provider verifies original identity before private destination access |
| Wrong account | Identity does not match the saved private context | Switch sign-in; no implicit account linking |
| Ready | Identity verified; destination retained | Person opens Home or continues to invitation review |
| Home / Invite reference | Boundary to existing approved journey | Existing journey owns its next actions |

The browser model is an explicit simulation. Its `demo-provider` results are test fixtures, not authority in a production application. A sign-in result never emits a payment or membership event.
