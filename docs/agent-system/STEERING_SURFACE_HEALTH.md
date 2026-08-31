# Steering surface health

**Kind:** generated read model
**Authority:** inventory and monitoring only; never product law, priority, approval, or release proof
**Registry:** `governance/agent-system/steering-surface-registry.v1.json` v1.0.0 (active)
**Registry semantic digest:** `de324a6a42d279f746427025b869df5c9e1388eda3b1deeb231474a0c111caea`
**Repository manifest aggregate:** `5a9660f4fb38e3869d292ae34a7f0e1c636a9b2d55e92f0252e15fec17504ab1`
**Catalog digest:** `eef8fa527d8f4e26afb0688e07cf52486bc5a14642d81895fac9d73af9f1121c`

This file is deterministic. Current branch, dirty state, optional machine-local availability, and hash drift are reported by `npm run agent:steering:report`. Update sources deliberately, run `npm run agent:steering:build`, review the diff, then run `npm run agent:steering:check`. The monitor never rewrites authority during a check.

## Baseline

- Repository surfaces: 717
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
| active | 249 |
| degraded | 52 |
| historical | 416 |

## Governed groups

| Group | Lifecycle | Files | Ordered manifest SHA-256 |
|---|---|---:|---|
| agent-evaluation-system | active | 8 | fa82e2b2f76c68a772b85326043c73ff1cbeebcfb8c9a0d0660053acdb9c3f4a |
| agent-governance-runtime | active | 30 | fe0f40ed9209372d2cc90a9fa4d1f8fa72ac5f2017e14a16424d0c49bf9b15b8 |
| agent-policies-and-foundation | active | 10 | fa044bbc3e97aca0ce2248fb7e39cbb7c5193a6d6c487904fc4408de8f95adbd |
| agent-system-runtime | active | 41 | 695e927510853811a98865e9516be3b780c136dd70c9c2f6c2c8c9d2dd9fb5f7 |
| architecture-decisions | active | 6 | 79dfb5edd75893720e24f59828b9f03c442ea8f7a18213945cca4956245ff811 |
| definition-frameworks | active | 1 | 426935c74c44de7d200d80494e27a01eaaf8d3bd2963f1f7a794588a275b0f7d |
| definition-profiles | active | 1 | 68e492127a763057c64db65142d17044d708995a2e20f9c92e4b5143b98dc3f3 |
| deployment-context | active | 10 | d09cf4c1c8a12c12947b1895b37d3324a8d476eaa2693637bcb510801e2713f7 |
| historical-plans-and-investigations | historical | 59 | 43dc381394e3c3d56d0ba97867d62bb4c42c26183845c20a45e0aa36d3890ade |
| knowledge-and-wiki-sources | active | 15 | 641722ba023359926d5aebd3e0cf3f8d5e9f0e20c8a74baaa74cfb7aa4c105b4 |
| legacy-steering-documents | degraded | 10 | d5a81d892973840dce72a73b0e35d46c33a67136776cdee77706318d1b4acfd0 |
| native-and-release-context | active | 15 | a54cdcfc22ae6367c0a8d801782b245c55dad0ae4aa314ab8ae07840fb94ddd7 |
| operating-documentation | degraded | 8 | 8d36e568848c8ef3891e71f96fe72eb8f2ec94fbd730d49166e23b82cc2a38d7 |
| portable-agent-contracts | active | 30 | 0b5e9b4de51f04a52a327c0e6d2615babbf97a2f4e2c2d32fe039dc3145d4d32 |
| portable-agent-loops | active | 14 | c66294cb68ae40c86d0f5ee7dc5cbd72562275d03b4e01e3e508e633ca352aa9 |
| product-context-and-history | active | 7 | 460dc0e2439425db1cb6f9047d3b7f3702db7b20abe48646a7d962338b1b64d3 |
| product-decisions | active | 6 | 1df8d5aa0f40ef148abdfb3219e3191c5cf295f14a3343cfaca7659842550609 |
| product-generated-read-models | active | 2 | 04f581082696c3dcb50c27e321b72c1c10c06ab351550fb6b05a81e00709e4c6 |
| product-law | active | 1 | 5451a6a0aa3d3d15327b8ecf5b5654e3539170fb09dc968bb6e9db5371c20211 |
| proof-evidence | historical | 345 | f9835225cc38c790877189d550c3ed0806e2f559e2b56aaa7ea5e4ccae73a234 |
| repository-enforcement | active | 7 | dbd3c6e74f3b80670874b85499e0a6b6f12bed9c2fa206a92c9516db1b929b0a |
| repository-entrypoints | active | 3 | ef06c4b845b0ea2693cddf925743d54d54b6b15066f55b07ac8f57cb0d2706db |
| research-and-benchmark-context | degraded | 17 | 29998d57d5a36ca8e2c1029280d1fc925eb410e8b9260831a9670460138d700a |
| research-script-tools | degraded | 15 | 7e7fa3aceeaae51418ca5bb1df211207ef37079db70ec277a3ffcc5129094610 |
| root-script-runtime | active | 33 | 698144e700fc50504322c761952a259c11e2463a54de01e4badbddc6ab09bd17 |
| shared-script-libraries | active | 9 | 2e3ea50a85398d5d590a25c22c72e10e3675ce71a24aa1920f61d6b1493fd4e6 |
| tracked-judgment-methods | degraded | 2 | b04fd513ec97c8545a0fe4799cc0db37a2a855fd81d357dd22575a41ef177964 |
| tracked-root-plans | historical | 12 | ba803c726980044b9ba90c7603a02ce9793a83b19064144c40dda5260825c6b1 |

## Expected monitor outcomes

- **Pass:** registry and catalog are current; repository hashes, framework/profile bindings, and present external digests match.
- **Degraded:** an optional external surface is unavailable or an explicitly degraded surface remains guarded.
- **Blocked:** registry/schema semantics fail, a controlled file is uncatalogued, generated outputs are stale, an external digest changes, or a required surface is missing.
- **Upgrade:** change lifecycle or trusted identity only in the registry, with an accountable owner and reviewed evidence; regenerate and re-run hostile tests.
- **Retire:** disable activation first, name the replacement or reason, preserve historical evidence, then move to superseded or retired.
