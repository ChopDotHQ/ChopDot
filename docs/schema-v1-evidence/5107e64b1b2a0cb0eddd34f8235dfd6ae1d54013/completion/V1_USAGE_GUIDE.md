# Product Schema V1 — practical usage guide

V1 is a source-bound model of the approved product, with executable checks for specific safety, composition and reconstruction contracts. It is not a payment backend, a complete UI generator or permission to implement Gate B. The approval packet identifies the exact schema commit; product authority remains `4ba456e6595330e4ca8e21366e0d827f17e10881` plus the explicitly pinned approved decisions/overlays.

## Start with the question

| Need | Read first | Follow through |
|---|---|---|
| Find a visible screen/control/field | `generated/ui-surface-inventory.json` | `generated/reconstruction-pieces.json`, then its frozen `authority_refs` |
| Understand an effect | `semantic-core.json` operations | owner, reads, changes, invalidates, laws, sources |
| Explain how journeys share meaning | `composition-graph.json` | journey entry/effect/emitted contexts, ownership, continuity, composition units |
| Follow a user task | `task-paths-v1.json` | `generated/certified-task-metrics.json` and `generated/TASK_FRICTION.md` |
| Assess change impact | `generated/blast-radius.json` | direct dependencies versus bounded downstream consumers |
| Understand verification and limits | `generated/PRODUCT_SCHEMA_CLOSURE.md` | `generated/reconstruction-coverage.json`, mutation/closure coverage reports |

Paths in this guide are relative to `product-schema/` unless otherwise stated. Run commands from the repository root. Examples use Python 3 for read-only JSON queries; schema verification uses Node 22 and Git history, without app dependency installation.

## Locate a screen or control precisely

Do not search only by a repeated label such as Continue or Back. Use journey + state + control label + target, then preserve the resulting `piece_id` in the change/review record.

```bash
python3 - <<'PY'
import json
pieces=json.load(open('product-schema/generated/reconstruction-pieces.json'))['pieces']
for p in pieces:
    if p['journey']=='17' and p.get('state')=='withdraw-review':
        print(json.dumps(p,indent=2))
PY
```

This finds J17's withdrawal review and its `Confirm withdrawal` control. The bound control references `savings.withdraw`, relation `initiates`, and the frozen prototype. A control may instead be navigation, selection/draft, recovery, system progression or presentation/demo chrome. These classes are meaningful; a click does not automatically imply a domain write.

For the raw surface including fields:

```bash
python3 - <<'PY'
import json
x=json.load(open('product-schema/generated/ui-surface-inventory.json'))
j=next(j for j in x['journeys'] if j['journey']=='17')
print('Frozen artifact:',j['artifact'])
print(json.dumps([s for s in j['states'] if s['id']=='withdraw-review'],indent=2))
PY
```

A dynamic prototype can have richer extraction in `reconstruction-pieces.json` than in the basic surface inventory. If either view lacks a field or binding, read the frozen source; do not invent an operation. Empty `schema_refs` on a product requirement means authority-accounted, not an executable semantic implementation.

## Trace operation, law and ownership

```bash
python3 - <<'PY'
import json
r='product-schema/'
core=json.load(open(r+'semantic-core.json'))
graph=json.load(open(r+'composition-graph.json'))
op=next(o for o in core['operations'] if o['id']=='settlement.close')
print('OPERATION',json.dumps(op,indent=2))
objects={op['owner'],*op.get('reads',[]),*op.get('changes',[])}
print('LAWS APPLYING TO ITS OBJECTS',json.dumps([
    l for l in core['laws'] if objects.intersection(l.get('applies_to',[]))
],indent=2))
for j in graph['journey_projections']:
    if op['id'] in j['owns_operations']+j['participates_operations']:
        print('JOURNEY',json.dumps(j,indent=2))
        ids=set(j['entry_contexts_any']+j['ambient_contexts_required']+
                j['effect_contexts_required']+j['emits_contexts'])
        print('CONTEXTS',json.dumps([c for c in graph['contexts'] if c['id'] in ids],indent=2))
PY
```

Operation `law_refs` alone is not the complete governing contract. Also inspect laws applying to its objects, context laws and composition-unit laws. The query provides related laws; inspect their applicability rather than assuming each applies in every route. Ownership and participation are different: recovery can coordinate an operation without owning the underlying result. Reads do not imply writes; invalidating Position means recomputing a projection, not directly overwriting money truth.

To inspect actual approval evidence, resolve an operation/law's `sources` keys in `semantic-core.json.sources`. Read its declared `commit`, or the frozen product-authority commit when omitted, with `git show COMMIT:path`. Do not substitute today's working copy for the declared frozen source. Approved later decisions carry their own immutable commits.

## Inspect dependencies and task paths

```bash
python3 - <<'PY'
import json
r='product-schema/'
b=json.load(open(r+'generated/blast-radius.json'))
print(b['model'])
print(json.dumps(next(p for p in b['probes'] if p['id']=='settlement_guard'),indent=2))
t=json.load(open(r+'task-paths-v1.json'))
print(json.dumps(next(t for t in t['tasks'] if t['id']=='TASK-J05-COMMON-EQUAL'),indent=2))
m=json.load(open(r+'generated/certified-task-metrics.json'))
print(json.dumps(next(t for t in m['tasks'] if t['id']=='TASK-J05-COMMON-EQUAL'),indent=2))
PY
```

`direct` is the first dependency neighborhood. `transitive` is a bounded possible downstream impact set. An operation reached as a consumer is **not assumed to execute**; write/invalidation propagation is limited to an origin operation. Task impact follows actual semantic-operation links, not every task in an affected journey. A CRITICAL tier is a modelled review footprint, not proof that all those screens change.

The equal-expense task distinguishes two required inputs, one submit action, and the entry handoff. Metrics are certified-path counts, not observed user timing. There are 31 certified tasks across six journeys and one semantic-only task; these are not exhaustive task coverage for all 28 journeys. `journey-path-metrics.json` contains inferred topology metrics with explicit confidence; do not substitute these for certified task evidence.

## Make a bounded change

1. Record the exact starting SHA/tree, relevant piece/task IDs, owning operation and frozen source. State whether the proposal preserves approved meaning or needs a new product decision.
2. Trace affected objects, contexts, laws, operation owners and direct/downstream consumers. Include normal and recovery paths. For settlement, retain the same payment identity, payer, recipient, currency, exact amount, source lineage and accepted result across actual carriers; an alternate context ID does not remove obligations.
3. Edit authored schema/verification only in an isolated branch or worktree. Keep immutable product authority intact. Update tests for the demonstrated defect and retain valid controls. Do not hand-edit generated JSON or broaden scope into Gate B/runtime.
4. Regenerate with the four existing commands, in order:

```bash
node product-schema/derive-stage-4.mjs
node product-schema/derive-ux-diagnostics.mjs
node product-schema/derive-task-metrics.mjs
node product-schema/derive-stage-5.mjs
```

5. Inspect the diff, then run **all current `run:` commands from `.github/workflows/product-schema-v1.yml`**, including its Gate A evidence fetch, semantic checks, batteries, reconstruction/mechanical checks and deterministic-output block. The workflow is authoritative; generators returning exit 0 alone do not prove closure PASS. The completion package contains the runnable exact-version matrix and command logs.
6. A composition/source change can correctly fail `AUTHORED-BLOB-DRIFT` even if semantically valid. Do not reset hashes to make it pass. Explain changed meaning/bytes and obtain the separately authorized independent review/baseline process. This V1 repair changes detectors and derived diagnostics without altering seal constants.
7. Keep trusted detector changes visible as a separate review concern. Hashes in candidate-owned validators are integrity checks, not independent proof of the validator itself. Compare the detector diff against an immutable reviewed base; acceptance applies only to the reviewed exact tree and same-SHA hosted checks.

For inspection without affecting a normal checkout, create a new temporary detached worktree or use the package's disposable-clone harness. Never run `git reset --hard` or `git clean` against someone else's work to reproduce the evidence.

## What the checks establish—and what they do not

Machine checks cover pinned sources, reference and route consistency, named semantic/safety obligations, operation/control witnesses, required-state scope, deterministic generation and finite mutation regressions. See per-case semantic versus seal-only outcomes: an authored-hash rejection is not a proof of product meaning. A valid-control seal rejection is not automatically a semantic false positive.

Retained V1 limits:

- 4,418 pieces are authority-accounted/classified; this does not mean all are executable reconstruction mappings.
- 667 `PRODUCT_REQUIREMENT` states remain authority-only.
- 35 draft fields lack semantic references.
- 59 duplicate control-evidence instances are retained, with zero conflicting operation assignments; duplicates are not new behavior.
- Construction-required state verification is 21/21 for J05/J06/J08 only.
- Object/law source membership is source grounding, not universal entailment of arbitrary proposed definitions. Exact inventory seals and independent source review remain necessary for such changes.
- Contract-only, coordinated, external-precondition and future-only capabilities remain distinct from user-facing implemented features. Generated Gate B construction material is a downstream packet, not authorization or evidence of Gate B implementation.
- Local verification, separate review and hosted CI are separate evidence. Smoke's path-filtered jobs may be skipped; a green workflow must be described with its actual job scope.

The completion packet supplies the final exact SHA, findings/dispositions, separate review receipts, local matrix and hosted run IDs. Final human freeze approval is a distinct step; this guide grants none.
