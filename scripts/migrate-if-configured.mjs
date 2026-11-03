// Applies pending Prisma migrations during the build when a database is
// configured. Uses the direct (unpooled) connection when the host provides
// one, because migrations should not run through a connection pooler.
// Never prints connection strings.
import { spawnSync } from "node:child_process";

const pooled = process.env.DATABASE_URL;
const direct =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DIRECT_URL;

if (!pooled && !direct) {
  console.log("[migrate] DATABASE_URL is not set; skipping migrations.");
  process.exit(0);
}

console.log(`[migrate] Applying migrations (${direct ? "direct" : "pooled"} connection)...`);
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: direct || pooled }
});

if (result.status !== 0) {
  console.error("[migrate] prisma migrate deploy failed; stopping the build.");
  process.exit(result.status ?? 1);
}
