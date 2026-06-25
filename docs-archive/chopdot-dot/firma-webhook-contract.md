# Firma payment webhook contract (ChopDot capture L2)

Status: `partner-pending` — operator must replace placeholders with Firma partner values before production.

**Product:** [firma.cash](https://www.firma.cash/) stablecoin pay pattern (not firma.dev document signing).

## Purpose

Auto-`markLegPaid` (leg → `claimed`) when Firma reports a settled payment whose memo matches a ChopDot leg reference. **Never** auto-`confirmLeg`.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `FIRMA_WEBHOOK_SECRET` | Supabase edge function | HMAC verification secret from Firma partner dashboard |
| `FIRMA_WEBHOOK_TOLERANCE_SEC` | Optional | Clock skew for `timestamp` field (default 300) |

## Endpoint

`POST /functions/v1/capture-firma-webhook`

Staging registration URL: `{SUPABASE_URL}/functions/v1/capture-firma-webhook`

## Headers (expected from Firma partner)

| Header | Required | Notes |
| --- | --- | --- |
| `X-Firma-Payment-Signature` | Yes | `hex(hmac_sha256(raw_body, FIRMA_WEBHOOK_SECRET))` |
| `X-Firma-Delivery-Id` | Yes | Unique delivery id for idempotency |
| `X-Firma-Event` | Yes | e.g. `payment.settled` |

## Event: `payment.settled`

```json
{
  "id": "evt_01HXXXX",
  "type": "payment.settled",
  "created_at": "2026-06-17T12:00:00Z",
  "data": {
    "amount": 30.0,
    "currency": "USD",
    "memo": "chopdot:leg:leg_abc123:pot:capture-test-pot:chapter:ch_01",
    "payer_ref": "alice@firma",
    "payee_ref": "owner@firma",
    "transaction_id": "tx_01HXXXX"
  }
}
```

### Memo format (ChopDot-owned)

```
chopdot:leg:{legId}:pot:{potId}:chapter:{chapterId}
```

Minted by [`FirmaHandoffAdapter`](../../src/services/capture/adapters/FirmaHandoffAdapter.ts) at L1 handoff.

## Verification

1. Read raw body bytes (before JSON parse).
2. Compute `HMAC-SHA256(body, secret)` → hex.
3. Compare timing-safe to `X-Firma-Payment-Signature`.
4. Reject if `created_at` older than tolerance.

## Processing (ChopDot)

1. Idempotency: insert `capture_webhook_events.delivery_id`; skip if exists.
2. Parse memo → `{ legId, potId, chapterId }`.
3. Load `pots.chapter` via service role.
4. `markLegPaid(chapter, { legId, payerMemberId })` — amount mismatch → audit error, no mutation.
5. Persist `pot.chapter` + expense projection.

## Response codes

| Code | Meaning |
| --- | --- |
| 200 | Processed or duplicate delivery (idempotent) |
| 202 | Accepted but no matching leg (audit logged) |
| 401 | Invalid signature |
| 400 | Malformed payload |

## Operator checklist before go-live

- [ ] Firma partner confirms webhook event schema matches above (or amend this doc)
- [ ] Memo field supports 128+ chars opaque reference
- [ ] Staging webhook registered and test event received
- [ ] `FIRMA_WEBHOOK_SECRET` set in Supabase secrets

## Sample test fixture

See [`src/services/capture/firmaWebhookClaim.test.ts`](../../src/services/capture/firmaWebhookClaim.test.ts) for signed payload fixtures used in CI.
