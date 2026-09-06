# Journey 17 — State and authority

| State | Visible meaning | Authority allowed to advance |
|---|---|---|
| Prepared | Exact savings action reviewed | Member |
| Authorized | Required member/group approval exists | Member or configured group rule |
| Submitted / marked added | Action left UI or member states external action happened | Provider/wallet/member depending on control model |
| Waiting | Result/confirmation not final | Confirmation authority or provider |
| Confirmed | Exact amount changed the derived savings position | Verified provider/finality or configured confirmation authority |
| Failed | No money change confirmed | Provider/backend verification |
| Unknown | Result cannot yet be classified | Recovery service only |
| Returned | Earlier confirmed amount reopened | Verified return/reversal authority |
| Cancelled | Action stopped before completion | Authorized cancelling party |

The UI never upgrades `Submitted`, `Marked added` or `Unknown` to `Confirmed` on its own.
