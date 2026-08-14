import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Settings SMTP disconnect acknowledgement", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");

  it("requires acknowledgement before the destructive disconnect action is enabled", () => {
    expect(source).toContain("disconnectAcknowledged");
    expect(source).toContain("!disconnectAcknowledged || disconnectSmtp.isPending");
    expect(source).toContain("smtp.disconnectAcknowledgement");
    expect(source).toContain("setDisconnectAcknowledged(false)");
  });
});
