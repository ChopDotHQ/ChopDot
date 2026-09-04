# Journey 11 V1.1 State Inventory

## Journey 11 selection and review

The original 56 Journey 11 states remain. Their visible design is preserved except for the minimum wording and boundary corrections required by the payment contract.

## Journey 12 boundary previews

- `twint-handoff`, `bank-handoff`, `paypal-handoff`, `eur-handoff`, `partial-handoff` — external payment started, not sent;
- `wallet-handoff`, `dot-handoff` — wallet approval requested, provider/network status required;
- `twint-sent`, `external-handoff`, `paypal-sent`, `cash-handoff`, `partial-sent`, `payment-sent-eur` — payer marked sent;
- `payment-waiting`, `partial-waiting`, `j12-progress` — waiting for confirmation;
- `payment-received` — receiver confirmed external/manual receipt;
- `wallet-received`, `wallet-received-dot` — provider/network reported exact receipt or finality;
- `payment-failed` — failed with safe retry;
- `payment-complete`, `wallet-complete`, `wallet-complete-dot` — exact item closed and balances refreshed;
- `partial-complete` — confirmed partial amount closed, remainder preserved.

## Total

88 explicit screens, each mapped in `SCREEN_STATE_MAPPING.json`.
