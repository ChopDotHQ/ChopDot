# Journey 14 — edge cases and ownership

| Case | Current coverage | Owning next integration |
|---|---|---|
| No receiving method for required currency | Empty view + typed filter tested | Journey 20 methods |
| Invalid or mismatched wallet network/asset | Typed binding and display consistency tested with synthetic data | Wallet/provider validation |
| Link expired, stopped, changed or removed | Current prototype + recipient-read checks | Authenticated share-record service |
| Wrong recipient or non-owner re-share | Current model/UI guards | Server identity and authorization |
| Create/stop timeout and duplicate attempts | Same-command recovery and safe retry tested | Durable command/outcome storage |
| Clipboard missing, rejected or late callback | Fallback and snapshot binding implemented | Device/browser integration |
| Share sheet cancellation/failure/return | Explicit boundary previews, not real delivery | Native web/app sharing |
| Offline and access loss | Fail closed for live receiving data | Shared offline/auth contracts |
| Raw copies exist after link stop | Honest warning; no false recall | No global recall is possible |

Root registry E18, E31, E32 and E40 link to this additional candidate QA without claiming those cross-journey cases are fully implemented.
