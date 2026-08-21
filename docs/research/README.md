# ChopDot Research Index

## Platform architecture

- `RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md` — first-party architecture review that established the hybrid Postgres + Polkadot target.
- `RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md` — full Products Devnet chains, hosts, SDKs, tools, reference products and ChopDot decisions.
- `PARITY_PRODUCTS_DEVNET_CATALOG.json` — machine-readable catalog index for agents/tooling.
- `CHOPDOT_PLATFORM_OPPORTUNITY_MATRIX.md` — prioritized adopt/investigate/defer/reject roadmap.
- `LIVE_DEVNET_REGISTRY_REFRESH.md` — procedure for querying the dynamic Browse/Playground deployment inventory and recording timestamped snapshots.

## Usage rule

Before implementing a platform-dependent feature, agents must:

1. read the catalog and opportunity matrix;
2. verify the current SDK/host/network/deployment version;
3. distinguish source/documentation evidence from simulator and real-host/chain evidence;
4. update the catalog or execution board when a verified platform change alters a ChopDot decision.

The catalog is a dated snapshot. The live deployed-app registry is dynamic and must not be inferred solely from repository names.