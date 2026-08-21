# Live Products Devnet Registry Refresh

> Companion to `RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md`.

## Why this exists

A repository catalog and a live deployed-app catalog are different things.

Parity's open repositories describe capabilities and reference implementations. The live Browse/Playground registries describe which `.dot` applications are actually published on a particular network at a particular moment.

The live set changes without this repository changing. Therefore:

> Never claim that a static Markdown file contains every app currently deployed on Products Devnet.

## Canonical discovery path

The current Browse implementation performs roughly this sequence:

```text
Publisher.getPublished(offset, limit)
        ↓ labelhashes
DotNS Registrar.labelOf(labelhash)
        ↓ labels
DotNS ContentResolver.contenthash(namehash(label.dot))
        ↓ CID
ContentResolver manifest text
        ↓ display name / description / icon
Attestation resolver + AttestationService
        ↓ counts / active certificates / user attestation
Publisher.publicationOf(labelhash)
        ↓ publication timestamp
```

Important behavior in the implementation:

- there may be more than one deployed Publisher contract;
- each Publisher is paginated;
- labels are deduplicated across Publishers;
- ordering is not treated as stable;
- contenthash is the live/not-live check;
- app metadata is hydrated in bounded chunks;
- active certificates must not be revoked or expired;
- the latest publication timestamp is retained;
- DotNS/content/network configuration is environment-specific.

The relevant implementation donor is:

```text
paritytech/browse
app/src/state/apps/remote.ts
packages/browse-sdk
```

## Preferred refresh method

Use the current tagged `@parity/browse-sdk` release or the exact Browse source revision deployed against the target Devnet.

Do not copy contract addresses out of an old screenshot or chat message. Resolve them from the matching environment/config package or deployment record.

A refresh operation must accept these explicit inputs:

```text
network label
network genesis hash
Publisher address set
DotNS registrar/resolver addresses
Attestation resolver/service addresses
Bulletin/IPFS gateway or light-client backend
Browse SDK/source version
host/backend mode
```

## Required output

Write a timestamped snapshot rather than overwriting architectural truth:

```text
docs/research/devnet-registry-snapshots/
  YYYY-MM-DD_<network>_<short-genesis>.json
```

Suggested schema:

```json
{
  "capturedAt": "ISO-8601",
  "network": "paseo-next-v2",
  "genesisHash": "0x...",
  "source": {
    "repository": "paritytech/browse",
    "commitOrTag": "...",
    "browseSdkVersion": "..."
  },
  "configuration": {
    "publishers": ["0x..."],
    "registrar": "0x...",
    "contentResolver": "0x...",
    "attestationService": "0x...",
    "backend": "smoldot | rpc-gateway"
  },
  "apps": [
    {
      "label": "example",
      "dotName": "example.dot",
      "displayName": "Example",
      "description": "...",
      "contentCid": "bafy...",
      "iconCid": "bafy...",
      "publishedAt": 0,
      "attestationCount": 0,
      "certificates": [],
      "repository": null,
      "owner": null,
      "sourceRegistry": "browse | playground | both",
      "reachable": true,
      "hostCompatibility": {
        "web": "untested",
        "desktop": "untested",
        "ios": "untested",
        "android": "untested"
      }
    }
  ]
}
```

## Validation rules

1. Record the exact network genesis hash.
2. Record source commit/tag and package versions.
3. Treat a missing contenthash as unpublished/not live.
4. Do not infer security from popularity or attestation count.
5. Verify certificate revocation and expiration.
6. Do not treat an IPFS gateway response as light-client verification.
7. Preserve the distinction between:
   - published;
   - resolvable;
   - fetchable;
   - host-compatible;
   - chain-executable;
   - independently security-reviewed.
8. Never execute app transactions while cataloging unless a separate, funded and approved test plan explicitly requires it.
9. Avoid collecting personal information from application content.
10. Store only public deployment metadata in the snapshot.

## Host compatibility pass

Discovery does not prove an app works inside every host.

For apps relevant to ChopDot, run a separate compatibility pass using:

- TrUAPI Playground diagnosis/compatibility reports;
- Host API Test SDK for deterministic simulation;
- dotli web host;
- Polkadot Desktop;
- Polkadot iOS/Android where available.

Record each capability separately:

```text
render
product account
identity/login
sign raw
sign transaction
chain connection
local storage
navigation/deeplink
Statement Store
Bulletin upload/read
contract query/tx
payment-specific host surface
```

`Supported` must mean observed against a named host version. Do not turn a README claim into test evidence.

## ChopDot refresh workflow

When Codex has a fully reconciled local environment:

1. Pin a Browse SDK/source version.
2. Add a tooling-only script under `scripts/research/`.
3. Keep it out of the ChopDot production bundle.
4. Run it against the explicit Devnet environment.
5. Validate the JSON schema.
6. Diff against the previous snapshot.
7. Summarize additions/removals/version changes.
8. Review newly relevant apps manually.
9. Update `RESEARCH-002` only when the platform capability model changes.
10. Update the execution board if a newly proven capability changes a ChopDot decision.

## Refresh cadence

Refresh after:

- a Products Devnet network/genesis change;
- Browse/Publisher/DotNS deployment changes;
- Product SDK/TrUAPI host release changes;
- major Playground catalog updates;
- before a ChopDot Devnet release;
- before claiming compatibility with a specific current product or feature.

A monthly snapshot is useful during active Devnet development, but event-driven refreshes are more important than calendar frequency.