# Live Products Devnet Registry Refresh

Observation time: `2026-08-22T20:22:00Z`

## Read path and provenance

- Operator surface: `https://dotmetrics.dev-dot.li/?chainBackend=rpc-gateway`
- Active read path: `rpc-gateway`
- Directory CID:
  `bafybeigpxrhnyqstly3r27do6kj2lnfmsuxjt72hbykpr2usbumysj6vde`
- Directory response SHA-256:
  `d25adfd140a11959043215c96d5badc6381f44273262554b0c0787b79c17d30c`
- Directory snapshot payload SHA-256:
  `7dd760070407595236b45e98c6fb2585211508968e3a8b1117282d4b89a9a98e`
- Deployed network-bundle SHA-256:
  `36c4ba37b7139c117efc28e31d00d8bf0d26db2169fc17852c7396c633576037`

The IPFS gateway returned the directory with an ETag equal to the CID. The
snapshot therefore pins the exact directory bytes observed. It does not prove
that every indexed application was alive before or after the observation.

## Reconciliation

| Measure | Count |
| --- | ---: |
| Directory top-level keys | 251 |
| Metadata keys (`excluded`, `generatedAt`) | 2 |
| Application records | 249 |
| Unique application records | 249 |
| Published records | 80 |
| Deployed records | 113 |
| Name-only records | 56 |

`80 + 113 + 56 = 249`; the snapshot reconciles exactly. The separate
`excluded` metadata array contains 187 labels rejected by the upstream
directory generator and is retained verbatim in the snapshot.

## Network identity

| Surface | Observed identity |
| --- | --- |
| Relay genesis | `0x374057be67b355151f271ff70c3db98308c62c8adc48dc6724b6a009a1a014fd` |
| Asset Hub genesis | `0xd6eec26135305a8ad257a20d003357284c8aa03d0bdb2b357ab0a22371e11ef2` |
| Bulletin genesis | `0xe101f0fa4627d29a257645e02be86d80378fea1a2bf8fa6a918d150ebc760a59` |
| People genesis | `0xe6c30d6e148f250b887105237bcaa5cb9f16dd203bf7b5b9d4f1da7387cb86ec` |
| DotNS registry | `0x527b08a640b527a3dae0C4BE04D7344E430B6E50` |
| DotNS content resolver | `0x326bdE29315199c814B1c58b431D84D16EA5cE41` |

These values were parsed from the JavaScript bundle deployed by DotMetrics,
then stored with the bundle URL, headers, and hash in the snapshot.

## What the live catalog proves

- A substantial Products Devnet application ecosystem exists.
- Static product shells can be named through DotNS and delivered by
  content-addressed bundles.
- The live directory is large enough that screenshots or a handful of app
  cards are not an adequate census.

## What it does not prove

- A registry description is not verified source architecture.
- A deployed content hash is not a security review or user-flow test.
- An answering iframe is not durable data, recovery, payment, or membership
  proof.
- The presence of serverless examples does not prove every ChopDot
  responsibility can be serverless.

The complete 249-record evidence is
`devnet-registry-snapshots/2026-08-22T20-22-00Z.json`; no row is omitted from
the machine catalog.
