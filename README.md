# ChopDot

ChopDot is a group expense app built around a simple idea:

everyday coordination should stay easy and familiar, but the final moment of settlement can become verifiable, portable, and Polkadot-native.

Instead of putting every group interaction onchain, ChopDot keeps the social and operational parts of shared spending offchain, then uses smart contracts only where they add real value:

- anchoring a final closeout snapshot
- recording settlement proof
- creating a stronger shared source of truth around who paid what

That makes ChopDot less like "crypto expense tracking" and more like a practical bridge between normal group money behavior and Polkadot-native settlement rails.

## Why This Matters

Most group expense apps stop at calculation.

They tell you who owes whom, but they do not help create a verifiable final state once money starts moving.

ChopDot is exploring a different model:

- lightweight offchain collaboration for day-to-day use
- onchain proof only at the closeout layer
- a product surface that can evolve toward more agent-ready, wallet-native, and verifiable coordination over time

That is why this project fits the broader Polkadot direction:

- use the chain where it improves trust and composability
- avoid forcing everything onchain just because it can be
- design for real users first, protocol leverage second

## What Exists Today

The current release already ships a real closeout-driven settlement path on Polkadot Hub testnet.

Current highlights:

- guided `Settle Up` flow with `Pay normally` and `Smart settle`
- final closeout snapshots anchored onchain
- settlement proof recorded onchain
- DOT and USDC support in the closeout-driven flow
- confirmation screens that expose payment and proof details
- account-picker support for multi-account Polkadot wallet users

Current live contract path:

- EVM smart contract on Polkadot Hub testnet

Background context:

- earlier PVM / closeout exploration is still preserved in the repo as research and implementation history

## What ChopDot Is Not Pretending To Be

ChopDot is still a work in progress.

This is not presented as a finished global payments product or a fully generalized production banking system.

Right now, ChopDot is best understood as:

- a serious product prototype
- a live experiment in witnessed group closeout
- a Polkadot-native expense coordination direction that is already testable, but not finished

There are still rough edges around:

- wallet complexity
- release hardening
- runtime stability
- simplifying the path between "who owes whom" and "proof this was actually settled"

Feedback is very welcome, especially from people thinking about:

- Polkadot-native product design
- wallet UX
- EVM vs PVM product strategy
- social-finance coordination tools
- agent-ready interfaces for real apps

## Product Thesis

ChopDot is built around a simple product thesis:

1. shared expenses are social first
2. settlement is where trust breaks down
3. closeout should become explicit, reviewable, and provable
4. Polkadot is most useful here when it powers finality and evidence, not unnecessary complexity

## Current Wallet Model

This release currently uses a hybrid wallet model:

- a Polkadot-compatible wallet for DOT or USDC asset settlement
- an EVM-compatible wallet for Polkadot Hub contract writes

That is useful for shipping the closeout path now, but it is also one of the biggest areas we want to improve over time.

## Try ChopDot

Website:

- [chopdot.xyz](https://www.chopdot.xyz/)

App:

- [app.chopdot.xyz](https://app.chopdot.xyz/)

### Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Then open:

- [http://localhost:5173](http://localhost:5173)

Minimum required environment values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WALLETCONNECT_PROJECT_ID`

For closeout-enabled releases:

- `VITE_ENABLE_PVM_CLOSEOUT=1`
- `VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS=<deployed contract>`

## Current Release Notes

Important release context:

- the previously deployed contract at `0xBD55c27D3f9c2c832B50e4bAD289f5e03F65a142` should now be treated as demo-only
- the launch-intended contract address is `0xfC4D75c8a56Caa6aDc9dD28d5879D6C1fF9467f7`
- frontend and wallet-auth rollout should happen in lockstep with the active contract address and auth message format

If you are validating the current smart-settlement flow, the minimum meaningful smoke path is:

1. open a DOT or USDC pot with final balances
2. start `Smart settle`
3. approve package creation
4. approve payment
5. approve proof recording
6. confirm the app lands on the final confirmation state with payment and proof details

## For Builders And Reviewers

Useful repo entry points:

- orientation and operator rules: [`AGENTS.md`](AGENTS.md)
- cross-IDE collaboration guide: [`docs/CROSS_IDE_COLLABORATION.md`](docs/CROSS_IDE_COLLABORATION.md)
- long-horizon strategy and positioning: [`docs/CHOPDOT_2030_STRATEGIC_PLAN.md`](docs/CHOPDOT_2030_STRATEGIC_PLAN.md)
- Polkadot Hub contract experiments: [`docs/POLKADOT_HUB_CONTRACT_EXPERIMENTS.md`](docs/POLKADOT_HUB_CONTRACT_EXPERIMENTS.md)
- contract lab: [`scripts/polkadot-contract-lab/README.md`](scripts/polkadot-contract-lab/README.md)
- hackathon closeout brief: [`docs/HACKATHON_PVM_CLOSEOUT_DEVELOPER_BRIEF.md`](docs/HACKATHON_PVM_CLOSEOUT_DEVELOPER_BRIEF.md)

## Verification

Core repo verification:

```bash
npx tsc --noEmit
npm run build
npx playwright test
```

Additional validation paths:

- `node scripts/smoke-pvm-closeout.cjs`
- `npm --prefix scripts/polkadot-contract-lab run test`

## AgentOps

This repo has an active AgentOps workflow.

Start here:

- [`AGENTS.md`](AGENTS.md)
- [`docs/AGENTOPS_INTEGRATION.md`](docs/AGENTOPS_INTEGRATION.md)
- [`docs/AGENTOPS_OPERATOR_BRIEF.md`](docs/AGENTOPS_OPERATOR_BRIEF.md)
- [`docs/AGENTOPS_TASK_QUEUE.md`](docs/AGENTOPS_TASK_QUEUE.md)
- `.knowns/tasks/`

If you are continuing work in a new thread or IDE, prefer `.knowns/tasks` as the execution surface rather than treating generated summaries as the primary truth.
