# Product Schema V1 engineering completion evidence

The published candidate is `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`, tree `ce5b82d008dfa2f48e714607e30fdb6839b8305c`.

Start with `REPORT.md`, `results.json`, `DISPOSITIONS.md` and `V1_USAGE_GUIDE.md`.

## Reproduce

Prerequisites: Git, Node 22, Python 3 with PyYAML; a readable full ChopDot clone containing the published candidate, frozen authority and accepted Gate A evidence ref. Network access is needed only when those objects are absent. The checked-in workflow is extracted dynamically. No npm dependencies are needed for the local schema chain.

```sh
./tools/run-final.sh --repo /path/to/readable/ChopDot --out /tmp/chopdot-v1-new-results
```

The output directory must not exist. This creates and cleans its own temporary clones, never resets or cleans the supplied checkout, preserves the exact candidate/tree pins, runs every shell check even after expected mutant failures, and retains commands, exit codes, diffs and detector classifications. The harness's `baseline` phase name means “test the pinned published implementation without applying a patch”; its published matrix is the repaired implementation.

`proposed-final.patch` is the integrated diff from bc7473c8, already published. Do not apply it again to the final candidate. `tools/mutations.py` contains stable reconstructed SEC case IDs. Shipped settlement and witness regression files are part of the candidate's actual workflow chain.

## Evidence provenance

- `published-matrix-5107e64b/`: fresh full 25-case local execution on the published SHA.
- `hosted/`: actual GitHub Actions records and logs, separate from local evidence.
- `security-review/PUBLICATION-RECEIPT.*` and `reconstruction-review/PUBLICATION-RECEIPT.*`: separate final-version reviews; each states which same-tree earlier executions it reuses.
- `final-matrix-8d9064e5/`: same-tree prepublication execution, retained with its original SHA.
- `local-final-matrix/`: superseded f939277 execution, never labeled as final.
- Review subdirectories preserve failed earlier experiments and subsequent fixes. Consult their receipts for exact execution SHAs.
- `prior-evidence/sec-schema-001-handoff.zip` in the complete download package: original hash-verified investigation, including baseline and repaired results. Its old scheduled handoff instructions are superseded by CODEX_LED_COMPLETION.

No freeze, tag, protected merge, Gate B, runtime change or production deployment is included.

The coordination branch also carries `local-and-review-evidence.tar.gz` (SHA-256 `2cf6e3992d701c67e00569398e8cafca508c2146992dc49f8377b4a955c3d546`), containing the published matrix, reviewer experiments/receipts and reproduction tools. Hosted logs and top-level summaries are adjacent. The complete download package additionally retains the original investigation archive and superseded owner matrices.
