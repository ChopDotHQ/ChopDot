import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { settlementsRouter, potEventsRouter } from "./routes/settlements";
import { usersRouter } from "./routes/users";
import { prisma } from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Settlement / chapter lifecycle ──────────────────────────────────────────

app.use("/api/pots/:potId/settlements", settlementsRouter);
app.use("/api/pots/:potId/events", potEventsRouter);
app.use("/api/users", usersRouter);

// ─── Error handler ────────────────────────────────────────────────────────────

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[API error]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
);

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`ChopDot API running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
