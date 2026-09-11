import { describe, expect, it } from "vitest";
import {
  ADMIN_PROCEDURE_MISMATCH_TOAST_ID,
  isAdministrativeProcedureMismatch,
} from "./adminProcedureRecovery";

describe("administrative procedure mismatch recovery", () => {
  it("identifies stale administrator route registries without treating other errors as compatibility mismatches", () => {
    expect(
      isAdministrativeProcedureMismatch(
        new Error('No procedure found on path "admin.getAdaptiveSendBurstCaps"')
      )
    ).toBe(true);
    expect(
      isAdministrativeProcedureMismatch(
        new Error('No procedure found on path "contacts.getDailyStatus"')
      )
    ).toBe(false);
    expect(isAdministrativeProcedureMismatch(new Error("Forbidden"))).toBe(
      false
    );
  });

  it("uses a stable toast identity so repeated refetches do not stack notices", () => {
    expect(ADMIN_PROCEDURE_MISMATCH_TOAST_ID).toBe(
      "admin-procedure-mismatch-recovery"
    );
  });
});
