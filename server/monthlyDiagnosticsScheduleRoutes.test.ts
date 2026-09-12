import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createMonthlyDiagnosticsScheduleHandler } from "./monthlyDiagnosticsScheduleRoutes";

function app(
  deps: Parameters<typeof createMonthlyDiagnosticsScheduleHandler>[0]
) {
  const instance = express();
  instance.use(express.json());
  instance.post(
    "/api/scheduled/monthly-diagnostic-export",
    createMonthlyDiagnosticsScheduleHandler(deps)
  );
  return instance;
}

describe("monthly diagnostics scheduled callback", () => {
  it("rejects callers that are not authenticated cron jobs", async () => {
    const process = vi.fn();
    const response = await request(
      app({
        authenticate: vi.fn().mockResolvedValue({ isCron: false }),
        process,
      })
    )
      .post("/api/scheduled/monthly-diagnostic-export")
      .send({ taskUid: "attacker-task", reportMonthKey: "1999-01" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(process).not.toHaveBeenCalled();
  });

  it("requires the authenticated task UID and ignores all request body fields", async () => {
    const process = vi.fn().mockResolvedValue({
      ok: true,
      skipped: "orphan_or_disabled",
    });
    const response = await request(
      app({
        authenticate: vi.fn().mockResolvedValue({
          isCron: true,
          taskUid: "owned-task",
        }),
        process,
      })
    )
      .post("/api/scheduled/monthly-diagnostic-export")
      .send({
        taskUid: "attacker-task",
        reportMonthKey: "1999-01",
        recipient: "attacker@example.test",
      });

    expect(response.status).toBe(200);
    expect(process).toHaveBeenCalledWith("owned-task");
    expect(process).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(response.body)).not.toContain(
      "attacker@example.test"
    );
  });

  it("returns a sanitized error without task UID, address, content, or raw error", async () => {
    const response = await request(
      app({
        authenticate: vi.fn().mockResolvedValue({
          isCron: true,
          taskUid: "secret-task-uid",
        }),
        process: vi
          .fn()
          .mockRejectedValue(
            new Error("owner@example.test,password,csv-report-content")
          ),
      })
    )
      .post("/api/scheduled/monthly-diagnostic-export")
      .send({});

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("MONTHLY_DIAGNOSTICS_EXPORT_FAILED");
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("secret-task-uid");
    expect(serialized).not.toContain("owner@example.test");
    expect(serialized).not.toContain("csv-report-content");
  });
});
