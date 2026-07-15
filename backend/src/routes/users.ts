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

import { Router, Request, Response, NextFunction, type RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedPrincipal, requireAuth } from "../auth/authenticate";

interface PendingActionSummary {
  potId: string;
  /** Number of legs the user must act on in this pot */
  count: number;
  /** Whether the user needs to mark payment (payer) or confirm receipt (receiver) */
  role: "payer" | "receiver";
}

export function createUsersRouter(authenticate: RequestHandler = requireAuth): Router {
  const usersRouter = Router();
  usersRouter.use(authenticate);

usersRouter.get(
  "/:userId/pending-actions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params as { userId: string };
      const principal = getAuthenticatedPrincipal(res);
      if (userId !== principal.userId) {
        res.status(403).json({ error: "Not authorized to read these actions" });
        return;
      }

      const memberships = await prisma.potMember.findMany({
        where: { userId: principal.userId, status: "active" },
        select: { id: true },
      });
      const memberIds = memberships.map((member) => member.id);
      if (memberIds.length === 0) {
        res.json([]);
        return;
      }

      // Legs where this user must pay (pending, they are the payer)
      const payerLegs = await prisma.settlement.findMany({
        where: { fromMemberId: { in: memberIds }, status: "pending" },
        select: { id: true, potId: true, fromMemberId: true },
      });

      // Legs where this user must confirm receipt (paid, they are the receiver)
      const receiverLegs = await prisma.settlement.findMany({
        where: { toMemberId: { in: memberIds }, status: "paid" },
        select: { id: true, potId: true, toMemberId: true },
      });

      // Merge: a pot may appear in both; receiver role takes priority in display
      const byPot = new Map<string, PendingActionSummary>();

      for (const row of payerLegs) {
        const existing = byPot.get(row.potId);
        byPot.set(row.potId, {
          potId: row.potId,
          count: (existing?.count ?? 0) + 1,
          role: existing?.role ?? "payer",
        });
      }

      for (const row of receiverLegs) {
        const existing = byPot.get(row.potId);
        if (existing) {
          byPot.set(row.potId, {
            potId: row.potId,
            count: existing.count + 1,
            role: "receiver",
          });
        } else {
          byPot.set(row.potId, {
            potId: row.potId,
            count: 1,
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

  return usersRouter;
}

export const usersRouter = createUsersRouter();
