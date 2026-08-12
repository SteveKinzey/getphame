import {
  contactConsentEvidence,
  customerRequests,
  emailTemplateRevisions,
  emailTemplates,
  sourceAutomationEvents,
  sourceAutomationSchedulers,
  sourceConnections,
} from "../drizzle/schema";
import { describe, expect, it } from "vitest";

describe("source automation schema contracts", () => {
  it("exposes the idempotent delivery and revision fields used by review delivery", () => {
    expect(customerRequests.sourceConnectionId.name).toBe("sourceConnectionId");
    expect(customerRequests.sourceEventId.name).toBe("sourceEventId");
    expect(customerRequests.preferredLocale.name).toBe("preferredLocale");
    expect(customerRequests.templateRevisionId.name).toBe("templateRevisionId");
    expect(customerRequests.englishTemplateRevisionId.name).toBe("englishTemplateRevisionId");

    expect(emailTemplates.familyPublicId.name).toBe("familyPublicId");
    expect(emailTemplates.activeRevisionId.name).toBe("activeRevisionId");
    expect(emailTemplateRevisions.englishRevisionId.name).toBe("englishRevisionId");
  });

  it("exposes the automation safeguards and durable event ledgers used by the processor", () => {
    expect(sourceConnections.automationEnabled.name).toBe("automationEnabled");
    expect(sourceConnections.automationMode.name).toBe("automationMode");
    expect(sourceConnections.dryRun.name).toBe("dryRun");
    expect(sourceConnections.dryRunCompletedAt.name).toBe("dryRunCompletedAt");
    expect(sourceConnections.lastAutomationAt.name).toBe("lastAutomationAt");

    expect(contactConsentEvidence.sourceSubmissionId.name).toBe("sourceSubmissionId");
    expect(sourceAutomationEvents.sourceEventId.name).toBe("sourceEventId");
    expect(sourceAutomationEvents.claimExpiresAt.name).toBe("claimExpiresAt");
    expect(sourceAutomationSchedulers.scheduleCronTaskUid.name).toBe("scheduleCronTaskUid");
  });
});
