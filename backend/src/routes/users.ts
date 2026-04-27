/**
 * User-scoped routes
 *
 * GET /api/users/:userId/pending-actions
 *   Returns pots where the user has a leg they need to act on:
 *   - payer: legs in 'pending' state where fromMemberId === userId
 *   - receiver: legs in 'paid' state where toMemberId === userId
 *
 * Used by the frontend to show action-needed badges on pot cards.
 */

import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const usersRouter = Router();

interface PendingActionSummary {
  potId: string;
  /** Number of legs the user must act on in this pot */
  count: number;
  /** Whether the user needs to mark payment (payer) or confirm receipt (receiver) */
  role: "payer" | "receiver";
}

usersRouter.get(
  "/:userId/pending-actions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params as { userId: string };

      // Legs where this user must pay (pending, they are the payer)
      const payerLegs = await prisma.settlement.groupBy({
        by: ["potId"],
        where: { fromMemberId: userId, status: "pending" },
        _count: { id: true },
      });

      // Legs where this user must confirm receipt (paid, they are the receiver)
      const receiverLegs = await prisma.settlement.groupBy({
        by: ["potId"],
        where: { toMemberId: userId, status: "paid" },
        _count: { id: true },
      });

      // Merge: a pot may appear in both; receiver role takes priority in display
      const byPot = new Map<string, PendingActionSummary>();

      for (const row of payerLegs) {
        byPot.set(row.potId, {
          potId: row.potId,
          count: row._count.id,
          role: "payer",
        });
      }

      for (const row of receiverLegs) {
        const existing = byPot.get(row.potId);
        if (existing) {
          byPot.set(row.potId, {
            potId: row.potId,
            count: existing.count + row._count.id,
            role: "receiver",
          });
        } else {
          byPot.set(row.potId, {
            potId: row.potId,
            count: row._count.id,
            role: "receiver",
          });
        }
      }

      res.json(Array.from(byPot.values()));
    } catch (err) {
      next(err);
    }
  }
);
