# Payment and Agentic Compatibility Contract

This contract keeps ChopDot's product model independent of any single payment network or agent protocol.

## Domain boundary

ChopDot owns:

- people and group relationships;
- source expenses and payment items;
- exact settlement scope;
- typed payment lifecycle;
- authority rules;
- deterministic verification;
- resulting derived balances.

Replaceable integrations own:

- opening an external payment app;
- payment-network submission;
- card/bank/wallet execution;
- network finality;
- payment credentials and secrets.

## Compatibility statement

AP2, Visa Trusted Agent Protocol, x402, Polkadot, card, bank, TWINT, PayPal and future systems can remain compatible as replaceable integrations. They may prepare, execute or report a narrowly scoped payment according to their capabilities, but none becomes ChopDot's product core or authority model. Secrets remain with the appropriate wallet/provider and are never stored as ChopDot domain data.
