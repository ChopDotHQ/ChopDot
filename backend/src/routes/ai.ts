/**
 * AI Routes
 *
 * Implements LLM-based capabilities.
 *
 * POST /api/pots/:potId/ai/parse-receipt
 */

import { Router, Request, Response, NextFunction, type RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedPrincipal, requireAuth } from "../auth/authenticate";
import { findActivePotMember } from "../auth/authorizePotMember";

// ─── POST /api/pots/:potId/ai/parse-receipt ───────────────────────────────────

export function createAiRouter(authenticate: RequestHandler = requireAuth): Router {
  const aiRouter = Router({ mergeParams: true });
  aiRouter.use(authenticate);

aiRouter.post("/parse-receipt", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { potId } = req.params as { potId: string };
    const principal = getAuthenticatedPrincipal(res);
    const member = await findActivePotMember(potId, principal.userId);
    if (!member) {
      res.status(403).json({ error: "Active pot membership required" });
      return;
    }
    const { chatLog } = req.body;

    if (!chatLog || typeof chatLog !== "string") {
      res.status(400).json({ error: "chatLog string is required" });
      return;
    }

    // Fetch members to inject into LLM prompt
    let members: any[] = [];
    try {
      members = await prisma.potMember.findMany({
        where: { potId },
        include: {
          pot: { select: { name: true } },
        }
      });
    } catch (err) {
      console.warn("[AI] Database connection failed, using mock members for MVP.");
      members = [
        { id: "owner", role: "admin", pot: { name: "Team Offsite" } },
        { id: "alice", role: "member", pot: { name: "Team Offsite" } }
      ];
    }

    if (members.length === 0) {
      res.status(404).json({ error: "Pot not found or has no members" });
      return;
    }

    // Build member mapping for the prompt
    const memberContext = members
      .map(m => `- Name/Role: ${m.role}, ID: ${m.id}`)
      .join("\n");

    const systemPrompt = `
You are an AI assistant for ChopDot, a group expense coordination app.
Your task is to parse messy chat logs or receipt text about expenses into a structured JSON array of expense items.

### Context:
Pot Name: ${members[0].pot.name}
Available Members:
${memberContext}

### Prompt Engineering Best Practices Applied:
1. **Clear and Specific:** Extract the exact amounts owed and map participants exactly to their IDs above.
2. **Format:** Output strictly valid JSON.
3. **Shape:**
   Return a JSON array of expenses matching this TypeScript interface:
   Array<{
     amount: number;
     memo: string;
     paidBy: string; // MUST be one of the Member IDs above
     split: Array<{
       memberId: string; // MUST be one of the Member IDs above
       amount: number;
     }>
   }>
`;

    const apiKey = process.env.LLM_API_KEY || "";

    if (!apiKey) {
      console.warn("[AI] No LLM_API_KEY provided. Simulating response.");

      // Attempt to guess the payer and participants if possible (simplistic deterministic fallback)
      const payer = members[0]; // assume first member paid
      const splits = members.map(m => ({ memberId: m.id, amount: 25 }));

      // Simulated delay
      await new Promise(r => setTimeout(r, 1500));

      res.status(200).json([
        {
          amount: splits.length * 25,
          memo: "Parsed AI Expense (Simulation)",
          paidBy: payer.id,
          split: splits,
        }
      ]);
      return;
    }

    // Example actual fetch (commented/simulated until we have a real key)
    /*
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${apiKey}\`
      },
      body: JSON.stringify({
        model: "gpt-4",
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: chatLog }
        ]
      })
    });

    const data = await response.json();
    const resultJson = JSON.parse(data.choices[0].message.content);
    res.status(200).json(resultJson);
    */

    res.status(501).json({ error: "Real LLM integration not fully implemented" });
  } catch (err) {
    next(err);
  }
});

  return aiRouter;
}

export const aiRouter = createAiRouter();
