# ChopDot Platform Opportunity Matrix

This matrix maps product responsibilities to the verified Products Devnet
rails. It deliberately avoids selecting one technology as a universal
backend. Each responsibility keeps its own authority and recovery boundary.

| ChopDot responsibility | Candidate rail | Decision | What the rail may do | What it must never decide | Gate before use |
| --- | --- | --- | --- | --- | --- |
| Static app delivery | DotNS + content-addressed host | `ADOPT_AS_ADAPTER` | Resolve and execute a pinned bundle | User, member, organizer, or payment authority | Publish/resolve/rollback proof on the target network |
| Host signing and consent | Product SDK over TrUAPI | `ADOPT_AS_ADAPTER` | Obtain scoped signer actions with host consent | Business-event acceptance | Aligned SDK/host versions plus simulator and real-host tests |
| Device-local working state | Product SDK local/host storage | `ADOPT_AS_ADAPTER` | Fast private local projection | Canonical history or fresh-device recovery | Actor isolation, idempotency, export/import proof |
| Small cross-device notices | Statement Store | `ADOPT_AS_ADAPTER` | Carry signed, replay-safe envelopes | Durable ledger, delivery acceptance, membership | Expiry, duplicate, offline, and recovery scenarios |
| Receipt photos and larger blobs | Bulletin-backed storage | `INVESTIGATE` | Store encrypted content-addressed bytes | Meaning or acceptance of a receipt | Encryption, renewal, deletion, loss, and recovery experiment |
| Compact shared commitments | Asset Hub contract | `INVESTIGATE` | Enforce a minimal shared transition or index | Collapse claimed/cleared/approved/closed states | Product need, threat model, contract tests, audit plan |
| Contract dependency publication | CDM | `INVESTIGATE` | Pin build/deploy artifacts and dependencies | Decide that ChopDot needs a contract | Minimum-contract decision first |
| Durable operated indexing | App-owned service/database | `DEFER` by default | Search, notification, coordination, or recovery projection | Participant-signed product truth | Measured responsibility unmet by native/local rails |
| Hosted merchant settlement | Polkadot Pay server | `REJECT_FOR_V1` | Reference payment API and lifecycle tests | Replace ChopDot's group payout model | Reconsider only for a validated merchant-payment journey |
| Longer-duration decentralized storage | Web3 Storage | `DEFER` | Provider agreements and checkpoints | Business authority | Stable provider route and demonstrated Bulletin failure |

## Donor diligence

| Donor | Verified lesson | License signal | ChopDot use |
| --- | --- | --- | --- |
| Product SDK | High-level adapter over signing, storage, chains, DotNS | Apache-2.0 | Depend through adapter; do not bind domain state to SDK types |
| host-api-test-sdk | Thin iframe host simulator; version alignment is material | MIT | Fast integration gate, followed by real host proof |
| dotli-community | Static content-addressed host with sandboxed origins | AGPL-3.0 | Runtime target and architecture reference; no casual copying |
| Polkadot Desktop | Serverless host, permissions, Statement Store messaging | GPL-3.0 | Runtime target and behavior reference |
| LocalDOT | Host signer + Statement Store + Bulletin + contract can compose without an app server | GPL-3.0 | Pattern reference only; marketplace authority differs |
| Mercado | Escrow/dispute tests and Bulletin evidence | GitHub `NOASSERTION`, README GPL-3.0 | No reuse while license metadata conflicts |
| identity-backend-community | Native ecosystems still use Postgres-backed coordination when responsibility requires it | GPL-3.0 | Evidence against dogmatic “no backend ever”; not a ChopDot default |
| Polkadot Pay server | Operated settlement needs durable state and worker coordination | GPL-3.0 | Lifecycle test reference only |
| Survey/feedback/festival | Small contract indexes can point to Bulletin CIDs | GPL-family | Pattern comparison after the minimum shared-state need is locked |
| Web3 Storage | Longer-duration provider/checkpoint design exists but is not a proven ChopDot Devnet rail | Apache-2.0 | Track outside v1 critical path |

## Decision rule for the deployment plan

The next plan SHALL describe a composed product architecture, not “use
Devnet as the backend.” The default sequence is:

1. preserve participant-signed events and distinct money states;
2. use local/host storage for the fast private projection;
3. use Statement Store only as a bounded carrier;
4. investigate encrypted Bulletin blobs for receipts;
5. add a contract or operated service only when a named product
   responsibility and falsifier justify it;
6. publish the resulting static shell through DotNS only after product,
   recovery, host, and security gates pass.
