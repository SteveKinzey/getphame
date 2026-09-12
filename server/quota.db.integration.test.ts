import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql, { type Connection } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import { getFreeQuotaSummaryFromDb } from "./db";
import {
  evaluateFreeQuotaAccess,
  formatFreeQuotaBlockedMessage,
} from "./quotaEnforcement";
import { FREE_LIMIT_ERR_MSG } from "@shared/const";

const databaseUrl = process.env.DATABASE_URL;
/**
 * The application runtime provides DATABASE_URL in production builds, but that
 * database is not a test fixture. Keep this destructive-in-principle test
 * exclusive to a deliberately invoked integration lane with isolated test
 * credentials. A temporary table is connection-scoped, yet a lost connection
 * during Cloud Build can still make the quality gate nondeterministic.
 */
const isIntegrationLaneRequested = process.env.VITEST_DB_INTEGRATION === "1";
if (isIntegrationLaneRequested && !databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set when VITEST_DB_INTEGRATION=1 is explicitly requested."
  );
}
const integration = isIntegrationLaneRequested ? describe : describe.skip;

integration("Free-plan quota through isolated persisted rows", () => {
  const nowMs = Date.UTC(2026, 6, 14, 12, 0, 0);
  const userId = 740_001;
  let seeded: Connection;
  let isolatedDb: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    seeded = await mysql.createConnection(databaseUrl!);
    await seeded.query(`
      CREATE TEMPORARY TABLE customer_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        sentAt TIMESTAMP NOT NULL,
        INDEX customer_requests_user_sent_idx (userId, sentAt, id)
      )
    `);
    isolatedDb = drizzle(seeded, { schema, mode: "default" });
  }, 30_000);

  afterAll(() => {
    seeded?.destroy();
  });

  async function seed(sentAtMs: number) {
    await seeded.query(
      "INSERT INTO customer_requests (userId, sentAt) VALUES (?, ?)",
      [userId, new Date(sentAtMs)]
    );
  }

  async function decision() {
    return evaluateFreeQuotaAccess(userId, "free", {
      getUserRole: async () => "user",
      getQuota: () => getFreeQuotaSummaryFromDb(userId, isolatedDb, nowMs),
    });
  }

  it("keeps the 10th request available, enters rolling allowance on the 11th, blocks the 16th, and restores capacity after expiry", async () => {
    const old = nowMs - 60 * 24 * 60 * 60 * 1000;
    for (let index = 0; index < 9; index += 1) await seed(old + index * 1_000);

    expect(await decision()).toMatchObject({
      allowed: true,
      quota: { phase: "initial", remaining: 1 },
    });

    await seed(old + 9_000);
    expect(await decision()).toMatchObject({
      allowed: true,
      quota: { phase: "rolling", remaining: 5 },
    });

    await seed(nowMs - 29 * 24 * 60 * 60 * 1000);
    expect(await decision()).toMatchObject({
      allowed: true,
      quota: { phase: "rolling", used: 1, remaining: 4 },
    });

    for (let index = 0; index < 4; index += 1)
      await seed(nowMs - (4 - index) * 24 * 60 * 60 * 1000);
    const blocked = await decision();
    expect(blocked).toMatchObject({
      allowed: false,
      quota: { phase: "rolling", used: 5, remaining: 0, blocked: true },
    });
    expect(
      formatFreeQuotaBlockedMessage(blocked.quota, FREE_LIMIT_ERR_MSG)
    ).toContain("Next send available");

    const [rows] = await seeded.query<
      Array<{ id: number }> & mysql.RowDataPacket[]
    >(
      "SELECT id FROM customer_requests WHERE userId = ? ORDER BY sentAt ASC, id ASC LIMIT 1 OFFSET 10",
      [userId]
    );
    await seeded.query("UPDATE customer_requests SET sentAt = ? WHERE id = ?", [
      new Date(nowMs - 31 * 24 * 60 * 60 * 1000),
      rows[0].id,
    ]);
    expect(await decision()).toMatchObject({
      allowed: true,
      quota: { phase: "rolling", used: 4, remaining: 1, blocked: false },
    });
  }, 30_000);
});
