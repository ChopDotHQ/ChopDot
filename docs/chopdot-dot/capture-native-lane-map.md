# Capture and native lane map

Receipt capture starts locally before account ceremony. Photo/import/link/OCR
creates a reviewable draft and changes no shared truth. Mina's reviewed signed
event is the authority boundary.

| Capability | Local/product lane | Native rail |
| --- | --- | --- |
| Camera/import/link/OCR | Local encrypted draft | None required |
| Split and request | One Chop Core signed event | Replaceable delivery |
| Manual/TWINT/bank payment | External handoff | Evidence pointer only |
| Product payment | Exact supported rail | Exact cleared evidence only |
| Receipt/checkpoint retention | Local encrypted blob | Encrypted Bulletin blob |
| Wake-up notification | Minimum disclosure | Statement Store hint |
| Recovery locator | Account-authorized stream | `RecoveryHeadIndex` digest |
| App distribution | Static immutable bundle | DotNS/IPFS/Desktop |

No lane may turn contact proof into membership, payment observation into
receiver confirmation, a checkpoint into truth, or a host into product
authority.
