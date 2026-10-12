# J03 bounded repair — ready for user review

Runtime ae19153b73661750852875fdda979f7f0828d529; tree a2d7dd309d81c844accf6ba5510a9005092533e6.
Currency selection now updates the existing creation draft and returns to entry.
Only explicit Create group invokes the existing creation owner. The name/currency
survive Back/Forward/reload; success reload retains the created group without duplication.

54 focused normal-UI checks PASS at 393x852 and 430x890 for CHF/EUR/USD.
They preserve a prior group, local person and exact CHF 12.01 expense; validate
existing local Add people and expense handoffs; and return through Group Home/Home.
No page or console errors. Actual mobile entry/success/Home captures self-reviewed.
See browser/results.json, browser.log and the browser/ screenshots. The tested
package is review-prototype-ae19153b. Preview on port 4190 uses these tested bytes.

Creation now uses its existing owner/draft instead of overwriting local-group-1.
Local names carry their group ID and guest projections use existing scoped members;
this preserves the J03 success handoff without inviting or verifying remote people.
No frozen schema/Golden/C1, model, account or provider behavior changed.

Initial default headless executable was missing; installed Chrome completed checks.
Earlier diagnostic logs are preserved, not counted as final passes. No broad runner
or unrelated baseline investigation performed. Earlier keyboard baseline remains
separate. J02 acceptance stays pinned to c59073cf; not automatically transferred.

This is the bounded guest repair, not whole-J03, independent, account/offline/error,
physical-device, hosted/CI or user-comprehension qualification. Other J03 obligations
remain unassessed. User review is pending. Stop before J04; J05 remains parked.
Documentation: J03/finding and brief plan/result updated; no wiki/ADR required.
