/**
 * Settlement / Chapter routes
 *
 * These routes implement the shared commitment chapter lifecycle:
 *
 *   GET    /api/pots/:potId/settlements          — list all legs for a pot
 *   POST   /api/pots/:potId/settlements          — propose legs (create chapter)
 *   PATCH  /api/pots/:potId/settlements/:id/pay  — mark a leg paid (payer)
 *   PATCH  /api/pots/:potId/settlements/:id/confirm — confirm receipt (receiver)
 *
 * Auth: requests must include x-user-id header (Supabase user UUID).
 * Row-level security is enforced at the DB level; the header is used for
 * event logging only in this MVP phase.
 */

import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/prisma";

export const settlementsRouter = Router({ mergeParams: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserId(req: Request): string | null {
  const id = req.headers["x-user-id"];
  return typeof id === "string" && id.length > 0 ? id : null;
}

function packTxHash(fields: {
  method?: string;
  reference?: string;
  paidAt?: string;
  confirmedAt?: string;
}): string {
  return JSON.stringify(fields);
}

function unpackTxHash(raw: string | null): {
  method?: string;
  reference?: string;
  paidAt?: string;
  confirmedAt?: string;
} {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Convert a Prisma Settlement row to the API wire shape */
function toWire(row: {
  id: string;
  potId: string;
  fromMemberId: string;
  toMemberId: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  txHash: string | null;
  createdAt: Date;
  idempotencyKey?: string | null;
}) {
  const packed = unpackTxHash(row.txHash);
  return {
    id: row.id,
    potId: row.potId,
    fromMemberId: row.fromMemberId,
    toMemberId: row.toMemberId,
    amount: Number(row.amountMinor) / 100,
    currency: row.currencyCode,
    status: row.status,
    method: packed.method,
    reference: packed.reference,
    createdAt: row.createdAt.toISOString(),
    paidAt: packed.paidAt,
    confirmedAt: packed.confirmedAt,
  };
}

async function appendEvent(
  potId: string,
  type: string,
  actorId: string,
  meta: Prisma.InputJsonValue = {}
) {
  await prisma.potEvent.create({
    data: { potId, type, actorId, meta },
  });
}

// ─── GET /api/pots/:potId/settlements ────────────────────────────────────────

settlementsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { potId } = req.params as { potId: string };
    const rows = await prisma.settlement.findMany({
      where: { potId },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows.map(toWire));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/pots/:potId/settlements — propose chapter ─────────────────────

interface ProposeLegInput {
  fromMemberId: string;
  toMemberId: string;
  amount: number; // fiat units (e.g. 12.50)
  currency: string;
}

settlementsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { potId } = req.params as { potId: string };
    const actorId = getUserId(req);
    const legs: ProposeLegInput[] = req.body?.legs;

    if (!Array.isArray(legs) || legs.length === 0) {
      res.status(400).json({ error: "legs[] required" });
      return;
    }

    // Idempotency: if the header is present and rows already exist for this key, return them
    const idempotencyKey = req.headers["x-idempotency-key"];
    if (typeof idempotencyKey === "string" && idempotencyKey.length > 0) {
      const existing = await prisma.settlement.findMany({
        where: { idempotencyKey, potId },
      });
      if (existing.length > 0) {
        res.status(200).json(existing.map(toWire));
        return;
      }
    }

    const idempotencyKeyValue =
      typeof idempotencyKey === "string" && idempotencyKey.length > 0
        ? idempotencyKey
        : undefined;

    const created = await prisma.$transaction(
      legs.map((leg) =>
        prisma.settlement.create({
          data: {
            potId,
            fromMemberId: leg.fromMemberId,
            toMemberId: leg.toMemberId,
            amountMinor: BigInt(Math.round(leg.amount * 100)),
            currencyCode: leg.currency,
            status: "pending",
            idempotencyKey: idempotencyKeyValue,
          },
        })
      )
    );

    // Write event
    if (actorId) {
      await appendEvent(potId, "chapter_proposed", actorId, {
        legIds: created.map((l) => l.id),
      });
    }

    res.status(201).json(created.map(toWire));
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/pots/:potId/settlements/:id/pay ──────────────────────────────

settlementsRouter.patch("/:id/pay", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { potId, id } = req.params as { potId: string; id: string };
    const actorId = getUserId(req);
    const { method, reference } = req.body ?? {};

    const existing = await prisma.settlement.findUnique({ where: { id } });
    if (!existing || existing.potId !== potId) {
      res.status(404).json({ error: "Settlement not found" });
      return;
    }
    if (existing.status !== "pending") {
      res.status(409).json({ error: `Cannot mark paid: status is '${existing.status}'` });
      return;
    }

    const paidAt = new Date().toISOString();
    const txHash = packTxHash({ method, reference, paidAt });

    const updated = await prisma.settlement.update({
      where: { id },
      data: { status: "paid", txHash },
    });

    // Persist payment record
    await prisma.payment.create({
      data: { settlementId: id, method: method ?? "cash", reference: reference ?? null },
    });

    if (actorId) {
      await appendEvent(potId, "leg_marked_paid", actorId, { legId: id, method });
    }

    res.json(toWire(updated));
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/pots/:potId/settlements/:id/confirm ──────────────────────────

settlementsRouter.patch("/:id/confirm", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { potId, id } = req.params as { potId: string; id: string };
    const actorId = getUserId(req);

    const existing = await prisma.settlement.findUnique({ where: { id } });
    if (!existing || existing.potId !== potId) {
      res.status(404).json({ error: "Settlement not found" });
      return;
    }
    if (existing.status !== "paid") {
      res.status(409).json({ error: `Cannot confirm: status is '${existing.status}'` });
      return;
    }

    const confirmedAt = new Date().toISOString();
    const current = unpackTxHash(existing.txHash);
    const txHash = packTxHash({ ...current, confirmedAt });

    const updated = await prisma.settlement.update({
      where: { id },
      data: { status: "confirmed", txHash, confirmations: { increment: 1 } },
    });

    // Fire event + remaining-count check in parallel
    const [, remaining] = await Promise.all([
      actorId ? appendEvent(potId, "leg_confirmed", actorId, { legId: id }) : Promise.resolve(),
      prisma.settlement.count({ where: { potId, status: { not: "confirmed" } } }),
    ]);

    if (remaining === 0) {
      const closerId = actorId ?? existing.toMemberId;
      // Close event and pot status update in parallel
      await Promise.all([
        appendEvent(potId, "chapter_closed", closerId, {}),
        prisma.pot.update({ where: { id: potId }, data: { status: "completed" } }),
      ]);
    }

    res.json(toWire(updated));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/pots/:potId/events ─────────────────────────────────────────────

export const potEventsRouter = Router({ mergeParams: true });

potEventsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { potId } = req.params as { potId: string };
    const events = await prisma.potEvent.findMany({
      where: { potId },
      orderBy: { createdAt: "asc" },
    });
    res.json(
      events.map((e) => ({
        id: e.id,
        potId: e.potId,
        type: e.type,
        actorId: e.actorId,
        meta: e.meta,
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    next(err);
  }
});
