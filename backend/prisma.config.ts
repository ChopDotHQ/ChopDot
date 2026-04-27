import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pooled connection for queries (pgBouncer-compatible)
    url: process.env["DATABASE_URL"]!,
    // Direct connection for migrations
    directUrl: process.env["DIRECT_URL"],
  },
});
