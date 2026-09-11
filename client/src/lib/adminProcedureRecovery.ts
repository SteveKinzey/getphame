import { TRPCClientError } from "@trpc/client";

const ADMIN_PROCEDURE_NOT_FOUND_PATTERN =
  /No procedure found on path ["']admin\.[^"']+["']/i;

/**
 * A rolling deployment can briefly pair current client code with a previous
 * server route registry. Treat that compatibility mismatch as recoverable,
 * never as an administrator authorization or application crash condition.
 */
export function isAdministrativeProcedureMismatch(error: unknown): boolean {
  if (!(error instanceof TRPCClientError) && !(error instanceof Error)) {
    return false;
  }

  return ADMIN_PROCEDURE_NOT_FOUND_PATTERN.test(error.message);
}

export const ADMIN_PROCEDURE_MISMATCH_TOAST_ID =
  "admin-procedure-mismatch-recovery";

export const ADMIN_PROCEDURE_MISMATCH_MESSAGE =
  "This administrator control is updating. Your existing settings are unchanged; refresh in a moment to try again.";
