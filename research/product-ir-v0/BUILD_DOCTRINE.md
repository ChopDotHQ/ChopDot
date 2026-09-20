# Product IR V0 — build doctrine

This is a research doctrine, not new product authority.

## Goal

Make ChopDot faster to understand, change, validate, and extend by representing a small amount of irreducible product meaning once and deriving everything else that can be derived.

## Four layers

### 1. Authority

Approved product decisions, contracts and Goldens remain authoritative.

Product IR may reference and operationalize them; it does not silently replace them.

### 2. Semantic core

Human-authored only where meaning cannot be derived:

- domain primitives;
- invariants/laws;
- composition contracts;
- genuine semantic dependencies;
- state transitions when temporal behavior requires them.

### 3. Derived machinery

Machine-produced or mechanically traversed:

- validation;
- impact;
- change plans;
- test cases;
- context packets;
- explanations;
- coverage views.

These are disposable and must not become independent truth.

### 4. Implementation

UI, persistence, services, providers and runtime code implement the semantic core but remain replaceable technical choices.

## Design rules

1. **One semantic fact, one owner.**
2. **Derive before declaring.**
3. **Composition before journey duplication.**
4. **Money laws above UI.**
5. **Unknown stays unknown.**
6. **Projections do not mutate domain truth unless an owning operation says they may.**
7. **Every added abstraction must remove more maintenance than it adds.**
8. **No infrastructure until a measured limitation requires it.**
9. **A failed derivation is evidence; repair the product model, not the expected output.**
10. **Delete scaffolding once derivation replaces it.**

## What Product IR is not

- not a knowledge graph platform;
- not a database;
- not a second requirements repository;
- not a UI schema;
- not a generated-app framework;
- not an agent memory system;
- not permission to redesign approved ChopDot behavior.

## Target development loop

```text
approved product intent
        |
        v
semantic change
        |
        +--> laws/invariants
        |
        +--> composition
        |
        +--> derived blast radius
        |
        +--> ordered change plan
        |
        v
implementation
        |
        v
generated + explicit verification
        |
        v
review evidence
```

## Expansion rule

Do not model all of ChopDot.

Add the next semantic block only when a real product task crosses the current boundary and the existing representation has demonstrated measurable value.

Candidate adjacent blocks after ExpenseAccounting proves itself could include SettlementAccounting or ParticipantIdentity, but neither is authorized by V0.

## Success definition

Product IR succeeds if a future engineer/agent can make a meaningful ChopDot change with:

- less context;
- fewer independent semantic edits;
- fewer missed dependencies;
- stronger invariant coverage;
- clearer review evidence;
- no material increase in maintenance overhead.

The end state should feel simpler than the repository does today.
