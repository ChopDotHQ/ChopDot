# ChopDot — working brain (shadow candidate)

**Status:** shadow candidate, not yet canonical  
**Purpose:** the smallest cold-start context for humans and agents working on ChopDot.

## What ChopDot is

ChopDot helps people coordinate shared money without turning one person into the group accountant.

The durable product boundaries are simple:

- Money states are distinct. A payer saying they paid is not the same as the receiver confirming receipt.
- Normal users never need to understand ChopDot's infrastructure.
- The product is broader than one payment rail, chain, prototype, or use case.
- Chains and hosts are replaceable rails, never the source of product truth.
- Shared authority comes from participant-held signed events.

For exact current wording, product law remains in `PRODUCT_TRUTH.md`. Do not duplicate or reinterpret it here.

## Product decision lens

A feature request is a **hypothesis**, not an implementation order.

Before adding a materially new product concept:

1. What user problem actually exists?
2. Does ChopDot already solve it?
3. Is the difference only data or an optional property?
4. Is the difference only presentation, wording, or a shortcut?
5. What genuinely new behavior is missing?
6. Can that behavior be generalized rather than tied to one use case?
7. Is the user value worth permanently increasing product complexity?

A new use case does not automatically imply a new capability.

Do not create a named mode, template, object, or workflow merely because a real-world scenario has a different name. If existing Group behavior plus existing properties already solve the job, **no new feature** is the preferred result.

## Experience lens

- The group and the people doing something together are more important than internal records or infrastructure.
- One obvious next action for the person's current state.
- Shared-money state should feel calm and understandable, not like bookkeeping software.
- Capture can reduce typing, but generated/OCR input remains reviewable until a participant accepts the shared change.
- Receiver confirmation remains visible where money truth depends on it.
- Avoid dashboard overload and infrastructure language.
- Visual taste must come from founder-approved golden references when available. Do not invent a permanent aesthetic from words such as “premium” or “modern.”

## Context rule

Do **not** recursively read the repository.

For a non-trivial task:

1. Start with the user's actual request.
2. Retrieve the smallest relevant current context pack.
3. Prefer current canonical authority over generated, historical, research, or machine-local material.
4. Expand only when a real uncertainty remains.
5. If the Context Engine is stale or unavailable, fall back to exact repository sources.
6. A knowledge provider, graph, generated summary, or another checkout never becomes product authority.

Current priority, implementation state, release state, and historical reasoning are retrieved from their current sources when the task needs them. They are intentionally not copied into this file.

## Work loop

### Plan
Understand and challenge the request. Define the smallest observable outcome. Identify what does **not** need to change.

### Build
Make the smallest coherent change. Retrieve more context only when needed. Keep ordinary engineering ordinary.

### Review
Check whether the original problem was solved and whether unnecessary concepts or behavior were introduced. Run the relevant tests. Increase review depth only when risk justifies it.

### Deploy
Put the exact reviewed thing where it needs to run. Normal code changes do not require release-grade proof. A real release does.

### Iterate
Observe what actually happened. Evaluate it against the planned outcome. Turn durable learning into the single relevant canonical source or a Context Engine regression case; discard temporary reasoning.

## Conditional context

Load only when relevant:

- **Current product priority / scope:** current product cards or their future replacement.
- **UI / experience work:** founder-approved golden screens plus the relevant UI source and tests.
- **Architecture / authority / security:** the relevant product law and ADR only.
- **Release work:** current release state, immutable-candidate decision, deployment/readback tooling.
- **Historical question:** Git history or archived evidence, explicitly labelled historical.

The method must never cost more than the decision it is helping to make.
