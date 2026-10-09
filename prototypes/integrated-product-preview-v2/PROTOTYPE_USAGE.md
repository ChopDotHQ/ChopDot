# ChopDot local prototype

Open `demo.html` for the walkthrough and optional test controls. Normal entry is `index.html?home=1`; an empty browser starts at Entry. Work is stored only in this browser. Keep one writable tab open. On another device, storage is separate.

## Launch locally

From the repository root, use Node 24+:

```sh
node scripts/package-preview-v2-gate-b.mjs /tmp/chopdot-preview-unique
python3 -m http.server 4173 --directory /tmp/chopdot-preview-unique
```

Choose a new output directory; packaging refuses an existing directory. Open `http://localhost:4173/prototypes/integrated-product-preview-v2/demo.html`. Stop the server with Ctrl-C. Remove only the output directory you created when finished. Do not open the HTML through `file://`; the prototype requires Web Locks and same-origin fetches.

## Try the prototype

1. Continue as guest. Create a group and add local people. A local name is not a verified account or a new authenticated Participant.
2. Add an expense. Change the payer and included people. Go Back, reopen, and reload before saving. Inspect the saved expense and its exact allocation.
3. Open a group to inspect/correct an expense and review its history. Use the explicit test controls for other Participants, failure/retry, review reset and issue lifecycle. Test controls are reached from the demo guide and hidden by default.
4. Visit People to inspect a person's position, a selected group's debt or the scoped settlement route. Selection matters: a net total does not erase individual unresolved items. Settlement and savings finality use simulated external preconditions only.
5. From Home explore Savings, Insights, group settings, payment methods, wallet/QR boundaries, Import / export, and Storage & recovery. These remain bounded local simulations.

There is one local record: `chopdot.preview-v2.guest`. Home projects accepted records; it has no parallel outcome fixture store. Guest equal-split controls and the integrated expense editor share a canonical draft. Exact/shares, existing-expense corrections, and drafts with selected dates/receipts stay with the integrated editor. Existing guest/integrated draft collisions are preserved under recovered drafts. Open the demo guide to swap the recovered and active drafts; neither becomes an accepted expense until saved.

The demo guide's reset requires an explicit checkbox and clears only this prototype record and this tab's namespaced prototype session keys. Export any work you want to retain first. Reset does not affect other browser applications, real accounts or another device.

## Schema and evidence

The immutable contract is `product-schema-v1`, commit `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`, tree `ce5b82d008dfa2f48e714607e30fdb6839b8305c`. Start with that tag's `product-schema/V1_USAGE_GUIDE.md` and `product-schema/generated/GATE_B_CONSTRUCTION.md` to trace screen/control → operation → laws → certified task path. The prototype consumes the pinned contract copies and preserves their manifests. Source integrity verifies copied bytes; model/browser tests verify only their asserted behaviors. Neither is universal proof of product correctness or production readiness.

Run the existing retained A–D, membership and remaining-family suite from a committed checkout:

```sh
CHOPDOT_TEST_NODE_MODULES=/absolute/tools/node_modules \
CHOPDOT_CHROMIUM_EXECUTABLE=/absolute/chromium \
CHOPDOT_EVIDENCE_DIR=/absolute/new-evidence \
bash prototypes/integrated-product-preview-v2/expansion/run.sh
```

Requires Python 3, Node 24+, Playwright 1.62.1 and Chromium. The runner archives committed HEAD into its own temporary directory and writes command/exit logs outside the checkout. It does not reset or clean your checkout. Mobile viewport simulation is not actual iPhone Safari or Android hardware qualification. Authentication, shared server storage, real funds/signing/providers, production security and multi-device synchronization are not implemented or qualified.

The user accepted the earlier implementation at `d6c85f9e53a3dbb66795c13cb41d6153f68a68f0`. Subsequent demo polish does not change that immutable acceptance record or imply acceptance of unseen successor bytes.
