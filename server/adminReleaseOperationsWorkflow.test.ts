import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      pattern += escape(character);
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

const root = process.cwd();
const routerSource = readFileSync(join(root, "server/routers.ts"), "utf8");
const scheduleSource = readFileSync(
  join(root, "server/releaseHistoryExportSchedule.ts"),
  "utf8"
);
const handlerSource = readFileSync(
  join(root, "server/releaseHistoryExportScheduleRoutes.ts"),
  "utf8"
);

describe("administrator release operations workflow", () => {
  it("keeps retention change history, schedules, and acknowledgements behind administrator procedures", () => {
    for (const name of [
      "listAuditRetentionPolicyChanges",
      "getReleaseHistoryExportSchedule",
      "updateReleaseHistoryExportSchedule",
      "listReleaseHistoryExportRuns",
      "acknowledgeRendererFailureAlert",
    ]) {
      expect(routerSource).toMatch(new RegExp(`${name}: adminProcedure`));
    }
  });

  it("uses a cron-only scheduled callback with bounded sanitized snapshots", () => {
    expectSourceContract(handlerSource).toContain("user.isCron");
    expectSourceContract(handlerSource).toContain("user.taskUid");
    expectSourceContract(scheduleSource).toContain(
      'RELEASE_HISTORY_EXPORT_CALLBACK_PATH = "/api/scheduled/release-history-export"'
    );
    expectSourceContract(scheduleSource).toContain(
      "RELEASE_HISTORY_EXPORT_LIMIT"
    );
    expectSourceContract(scheduleSource).toContain("notifyOwner");
    expect(scheduleSource).not.toMatch(/setInterval|node-cron/);
  });

  it("does not persist customer content or email HTML in scheduled export run records", () => {
    const runInsert = scheduleSource.slice(
      scheduleSource.indexOf("db.insert(releaseHistoryExportRuns).values")
    );
    expect(runInsert).not.toMatch(
      /recipient|emailHtml|customer|rawConsole|cookie/i
    );
    expectSourceContract(routerSource).toContain(
      "acknowledgedLatestOccurredAt"
    );
  });
});
