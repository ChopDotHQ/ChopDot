# Builder Quickstart

## Who this is for

This is for builders who want to experiment with the ChopDot Shared Commitment Kernel.

The current kernel is intended for:

- group deposits
- trip funding
- event funding
- service-linked shared funding

## What you are building on

You are building on top of one primitive:

- `SharedCommitment`

Before changing product behavior, read:

- [SHARED_COMMITMENT_KERNEL_SPEC.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SHARED_COMMITMENT_KERNEL_SPEC.md)
- [REFERENCE_FLOWS.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/REFERENCE_FLOWS.md)
- [KERNEL_VERIFICATION.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/KERNEL_VERIFICATION.md)

## Core rule

You may change surfaces, adapters, and presentation.

You should not break:

- commitment lifecycle
- contribution semantics
- approval / release semantics
- counterparty confirmation
- typed event history
- visible closure

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

If the current build requires Supabase values, provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Open:

- `http://localhost:5173`

## What to inspect first

Start with the commitment loop, not the broader app:

1. create a shared pot / commitment
2. add members
3. add contributions or expenses
4. request / record settlement
5. confirm the counterparty side
6. inspect history and closure

## Recommended hackathon directions

Good builder directions:

- provider-side approval dashboard
- alternate contribution proof adapter
- group deposit workflow for a specific niche
- better commitment history visualization
- messaging entry surface
- agent-prepared but human-approved commitment assistant

Bad first directions:

- tokenomics
- yield
- full booking engine
- deep chain protocol work
- replacing the commitment model with app-specific CRUD

## Minimal extension strategy

If you are building on top of the kernel, prefer one of these:

- new surface
- new workflow around the same commitment object
- new release/approval visualization
- new adapter that still preserves the same lifecycle

## What to ask yourself before changing anything

- does this still look like a shared commitment?
- can a group still tell what state they are in?
- is release still explicit?
- can a counterparty still confirm?
- is closure still visible?

## If you only have one hour

Do this:

1. read the kernel spec
2. walk one reference flow
3. run the verification checklist
4. pick one narrow extension

## Feedback we want

When you build on this, tell us:

- what was unclear
- what lifecycle rule felt underspecified
- what you had to fake or work around
- what object or event was missing
- what would make the kernel easier to adopt
