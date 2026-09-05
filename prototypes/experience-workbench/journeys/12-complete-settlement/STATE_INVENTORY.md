# Journey 12 state inventory

## External/manual lifecycle

`twint-return`, `twint-sent`, `twint-waiting`, `receiver-review`, `receiver-not-yet`, `receiver-confirming`, `payment-received`, `payment-complete`, `position-updated`, `saved-record`, `receiver-breakdown`, `receiver-problem`, `amount-different`, `partial-received-different`, `partial-different-complete`, `position-partial-different`

## Bank transfer

`bank-return`, `bank-sent`, `bank-waiting`, `bank-receiver`, `bank-received`, `bank-complete`, `saved-record-bank`

## Cash / paid elsewhere

`cash-sent`, `cash-waiting`, `cash-receiver`, `cash-received`, `cash-complete`

## Wallet

`wallet-approval-waiting`, `wallet-submitted`, `wallet-checking`, `wallet-received`, `wallet-complete`, `saved-record-wallet`, `wallet-result-unknown`, `wallet-recovering`, `wallet-rejected`, `wallet-expired`, `wallet-disconnected`, `wallet-cancelled`, `wallet-reversed`, `position-reopened`

## Partial payment

`partial-sent`, `partial-waiting`, `partial-receiver`, `partial-received`, `partial-complete`, `position-partial`, `saved-record-partial`

## Failure and recovery

`payment-failed`, `retrying`, `payment-expired`, `payment-cancelled`, `offline`, `syncing`, `already-processing`, `recipient-says-no`, `issue-after-send`, `record-unavailable`, `payment-details`

## Context and handoffs

`receiver-inbox`, `position`, `j11-handoff`, `history-handoff`, `issue-handoff`, `support-handoff`, `group-home`
