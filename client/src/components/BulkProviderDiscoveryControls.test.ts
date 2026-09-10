import { describe, expect, it } from "vitest";
import {
  BULK_PROVIDER_VERIFICATION_HELP,
  getProviderDiscoveryGuidance,
} from "./BulkProviderDiscoveryControls";

describe("tenant-owned bulk provider setup guidance", () => {
  it("keeps provider-specific credentials, sender verification, and documentation distinct", () => {
    const sendgrid = getProviderDiscoveryGuidance("sendgrid");
    const mailgun = getProviderDiscoveryGuidance("mailgun");

    expect(sendgrid.credentialHelp).toContain("Mail Send permission");
    expect(sendgrid.verificationHelp).toContain("Sender Authentication");
    expect(sendgrid.documentationUrl).toContain("twilio.com/docs/sendgrid");

    expect(mailgun.credentialHelp).toContain("sending domain");
    expect(mailgun.verificationHelp).toContain("required DNS records");
    expect(mailgun.documentationUrl).toContain("documentation.mailgun.com");
  });

  it("provides verification guidance for every selectable tenant-owned provider", () => {
    expect(Object.values(BULK_PROVIDER_VERIFICATION_HELP)).toHaveLength(13);
    expect(Object.values(BULK_PROVIDER_VERIFICATION_HELP).every(Boolean)).toBe(
      true
    );
  });
});
