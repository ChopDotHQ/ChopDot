# Steering surface health

**Kind:** generated read model
**Authority:** inventory and monitoring only; never product law, priority, approval, or release proof
**Registry:** `governance/agent-system/steering-surface-registry.v1.json` v1.0.0 (active)
**Registry semantic digest:** `718254de52c28a01ba858e38c8d3bea06266f6b68cece9b919adfb9d03796650`
**Repository manifest aggregate:** `228eece6327dc061f4bf2fe5b9de49b0fd079d6e41f0deeab3461829f44b2fed`
**Catalog digest:** `ac13cb0605788dae8617fb95d2239229b85c56bd0e3b51d9563eb6d5d297cd64`

This file is deterministic. Current branch, dirty state, optional machine-local availability, and hash drift are reported by `npm run agent:steering:report`. Update sources deliberately, run `npm run agent:steering:build`, review the diff, then run `npm run agent:steering:check`. The monitor never rewrites authority during a check.

## Baseline

- Repository surfaces: 687
- External discovery censuses declared: 4
- External surfaces declared: 54
- Runtime classes declared: 4
- Catalog validation issues: 0
- Registry reviewed: 2026-08-28; interval: 30 days

External skill-package manifests exclude only deterministic incidental paths: directories `.cache`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`, `__pycache__`, files `.DS_Store`, and suffixes `.pyc`. All other package files are identity-bearing.

Degraded repository groups: `legacy-steering-documents`, `operating-documentation`, `research-and-benchmark-context`, `research-script-tools`, `tracked-judgment-methods`. These remain visible but cannot produce a `pass` verdict.

## Lifecycle census

| Lifecycle | Repository files |
|---|---:|
| active | 241 |
| degraded | 49 |
| historical | 397 |

## Governed groups

| Group | Lifecycle | Files | Ordered manifest SHA-256 |
|---|---|---:|---|
| agent-evaluation-system | active | 8 | 56388ea341278c1be9b1e18c6cd557bbfe319b1eed49889ee044846050a33ba4 |
| agent-governance-runtime | active | 29 | 4a1fd8e934bad8296ebf0b41b9994872910ff96999420e4cbc07779001253754 |
| agent-policies-and-foundation | active | 9 | b93973eae48edf4c056486a900050bcfcc65868d22f1e0c9c6c68f8004e0e931 |
| agent-system-runtime | active | 38 | 680ee80de65efab71558f14e8ec5343067f820ee439da8b4590941bf265fbedb |
| architecture-decisions | active | 6 | c655d48db90d88c8252dbd9f769d1e2e48e3a709e8212013311357b4682a6944 |
| definition-frameworks | active | 1 | 426935c74c44de7d200d80494e27a01eaaf8d3bd2963f1f7a794588a275b0f7d |
| definition-profiles | active | 1 | 68e492127a763057c64db65142d17044d708995a2e20f9c92e4b5143b98dc3f3 |
| deployment-context | active | 10 | d09cf4c1c8a12c12947b1895b37d3324a8d476eaa2693637bcb510801e2713f7 |
| historical-plans-and-investigations | historical | 40 | 976513e46ae48a93af1003cfe95786de9ad929cdb986890ec0e5d6e863700732 |
| knowledge-and-wiki-sources | active | 15 | a21f10625a941924b09fb8dbfa6cd883b487e68837db3b9cc9114af1029c25be |
| legacy-steering-documents | degraded | 10 | d5a81d892973840dce72a73b0e35d46c33a67136776cdee77706318d1b4acfd0 |
| native-and-release-context | active | 15 | a54cdcfc22ae6367c0a8d801782b245c55dad0ae4aa314ab8ae07840fb94ddd7 |
| operating-documentation | degraded | 5 | 8f9c27687ca35f3cf691dedf719e90eb4633d1d8d8db2d0358d9acb5c1f4f6a3 |
| portable-agent-contracts | active | 27 | 6cb5b0e43c35fcd362d98da76d971dee0872242647fd80fde26e15beda437d60 |
| portable-agent-loops | active | 14 | 6f197602235a3e68abeb4aedd58e43ba8a32aa1b495a1a9d58b5a3c42950803e |
| product-context-and-history | active | 7 | 56dfc8811e27105eff1756a928ed354eb138df21c004c2c678580ab108fa6d8f |
| product-decisions | active | 6 | f1efa5b85841bb3c3192026682364b8ceb5a7b441a90b1a4259cb1e5f4f95392 |
| product-generated-read-models | active | 2 | 04f581082696c3dcb50c27e321b72c1c10c06ab351550fb6b05a81e00709e4c6 |
| product-law | active | 1 | 5451a6a0aa3d3d15327b8ecf5b5654e3539170fb09dc968bb6e9db5371c20211 |
| proof-evidence | historical | 345 | f9835225cc38c790877189d550c3ed0806e2f559e2b56aaa7ea5e4ccae73a234 |
| repository-enforcement | active | 7 | 95e96316d13b688d00d31559442e6778c577b26b3e0f76ec8db2df80bc801b20 |
| repository-entrypoints | active | 3 | 7eb00c6fd6f49ef4654414a337b55961869fa96ae4e8c9d9eb5c858352acb33a |
| research-and-benchmark-context | degraded | 17 | 29998d57d5a36ca8e2c1029280d1fc925eb410e8b9260831a9670460138d700a |
| research-script-tools | degraded | 15 | c56355605a40ca8f61b4b64792a04b4a32cabb984312821ec682dffc32e4de20 |
| root-script-runtime | active | 33 | 41a91589be7417f45a9a0af95749d5fed80c56408fbb197a986e606ca2da9e5e |
| shared-script-libraries | active | 9 | 2e3ea50a85398d5d590a25c22c72e10e3675ce71a24aa1920f61d6b1493fd4e6 |
| tracked-judgment-methods | degraded | 2 | b04fd513ec97c8545a0fe4799cc0db37a2a855fd81d357dd22575a41ef177964 |
| tracked-root-plans | historical | 12 | ba803c726980044b9ba90c7603a02ce9793a83b19064144c40dda5260825c6b1 |

## Expected monitor outcomes

- **Pass:** registry and catalog are current; repository hashes, framework/profile bindings, and present external digests match.
- **Degraded:** an optional external surface is unavailable or an explicitly degraded surface remains guarded.
- **Blocked:** registry/schema semantics fail, a controlled file is uncatalogued, generated outputs are stale, an external digest changes, or a required surface is missing.
- **Upgrade:** change lifecycle or trusted identity only in the registry, with an accountable owner and reviewed evidence; regenerate and re-run hostile tests.
- **Retire:** disable activation first, name the replacement or reason, preserve historical evidence, then move to superseded or retired.
