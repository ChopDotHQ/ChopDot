# ChopDot Portable Shell Trial

This branch is an isolated candidate shell for testing whether one clean
ChopDot journey can run across multiple mini-app environments without forking
the product experience.

It is not the production ChopDot repo and should not be merged wholesale.

## Product Spine

The shell keeps one simple group-money loop:

```text
Guest setup
-> Create group
-> Add spend
-> Review split
-> Settle up
-> Payer marks paid
-> Organizer confirms received
-> Finish group
-> History
```

## Trial Rule

This branch exists to test portability, not to add product complexity.

Scope in:

- mobile web shell
- clean local state journey
- environment capability seams
- screenshots per environment
- one product flow across hosts

Scope out:

- real payments
- wallet integrations
- OCR or receipt scanning
- backend sync
- savings, emergency, or community fund flows
- environment-specific product forks

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run build
```

See [PORTABLE_SHELL_TRIAL.md](./PORTABLE_SHELL_TRIAL.md) for the full trial
contract and falsifiers.
