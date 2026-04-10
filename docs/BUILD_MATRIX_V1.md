# Build Matrix V1

<discovery_plan>
- Translate the future-tech doctrine into one practical build table
- Clarify what belongs now, later, and not now
- Give product and engineering a shared evaluation surface
</discovery_plan>

## FACTS

- ChopDot needs to be API-ready now, not API-product first.
- ChopDot needs current product proof before major platform expansion.

## INFERENCES

- A build matrix is the cleanest way to prevent:
  - chain drift
  - platform drift
  - wallet-first drift

## ASSUMPTIONS

- “Now” means current shared-commitment recovery work.
- “Later” means after kernel proof and founder validation.

| Capability | Best now | Best later | Why | Tradeoff | Ignore for now |
| --- | --- | --- | --- | --- | --- |
| Commitment engine | TypeScript domain/services + Postgres | append-only / protocol-linked read models if earned | fastest way to stabilize product truth | backend still centralized today | putting core state fully onchain |
| Identity surface | keep current auth working | passkeys + embedded wallets + external wallets | identity flexibility matters; auth must not equal authority | more moving parts later | wallet-only identity dogma |
| Authority model | explicit organizer / participant / approver roles | delegated approvals / bounded agent grants | business authority is more important than login method | requires clearer policy design | implicit authority from session/provider |
| Local execution | fiat/manual-safe flows | local processors / regional adapters / QR / phone rails | real adoption depends on local behavior | more integrations later | pretending one chain replaces local execution |
| Selective enforcement | none or minimal for current proof slice | EVM-style selective enforcement where it clearly helps | hard enforcement should be earned, not default | contract layer increases legal and technical overhead | broad contract-first architecture |
| Credentials | app roles and scoped visibility | verifiable credentials / selective disclosure | better trust without overexposure later | extra complexity before real need | full credentials stack now |
| Interoperability | none | modular messaging only when a real multichain need exists | avoids becoming a bridge company | later routing complexity | DIY bridge ambition |
| Portable action surfaces | web app first | action links / QR / bot / wallet surfaces | increases reach without changing the kernel | should follow proof, not lead it | overbuilding portable surfaces before kernel works |
| API exposure | explicit internal action contracts | external builder/API product | keeps UI from being the only client | needs clean services and state transitions | API-business-first posture |
| Value capture | subscriptions | premium trust actions + ecosystem funding + API/platform | stable business now, broader leverage later | later layers need proof and measurement | token-first or custody-first revenue |

## Decision rule

If a proposed technology does not strengthen one of the matrix rows in a way that supports the shared commitment kernel, it should probably wait.

## Next move

- Use this matrix in founder reviews and Teddy implementation reviews.
