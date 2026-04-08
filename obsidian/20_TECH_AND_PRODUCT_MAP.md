# Tech And Product Map

## Product shape today

- `Pot` remains the implementation base.
- Shared Commitment is the product meaning layered on top.
- The web app remains the first client.

## Architecture rule

- stable domain core
- explicit action layer
- typed event history
- replaceable persistence and proof adapters
- web UI as one surface, not the only surface

## Important constraints

- API-ready now, API-product later
- coordination first, proof second
- no custody-first architecture
- no chain-specific semantics in the core domain

## Key docs

- [Tech Architecture Map](../docs/TECH_ARCHITECTURE_MAP.md)
- [API Readiness Plan](../docs/API_READINESS_PLAN.md)
- [Security / Privacy Review](../docs/SECURITY_PRIVACY_REVIEW.md)
- [Web3 Repo Best Practices Map](../docs/WEB3_REPO_BEST_PRACTICES_MAP.md)
