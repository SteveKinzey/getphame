import { describe, expect, it } from "vitest";
import { assertCustomerOutreachSender } from "./smtp";

describe("customer outreach sender routing", () => {
  it.each([
    "owner@gmail.com",
    "hello@skamerica.example",
    "reviews@business.example",
  ])("allows a connected personal or business sender: %s", sender => {
    expect(() => assertCustomerOutreachSender(sender)).not.toThrow();
  });

  it.each([
    "no-reply@getphame.app",
    "hello@getphame.app",
    "mailer@subdomain.getphame.app",
  ])("rejects a Get Phame platform sender for customer outreach: %s", sender => {
    expect(() => assertCustomerOutreachSender(sender)).toThrow(/connected personal or business email address/i);
  });
});
