import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { MailDeliveryStateNotice, type MailDeliveryNoticeState } from "./MailDeliveryStateNotice";

describe("MailDeliveryStateNotice", () => {
  const expectations: Array<[MailDeliveryNoticeState, string]> = [
    ["active", "Active for customer review requests"],
    ["not_selected", "Connected, but not selected for customer review requests"],
    ["needs_attention", "Needs attention — update your SMTP details and reconnect"],
    ["legacy_blocked", "A legacy platform mail connection was found"],
  ];

  it.each(expectations)("renders the %s state with clear visible guidance", (state, text) => {
    const html = renderToStaticMarkup(createElement(MailDeliveryStateNotice, { state }));
    expect(html).toContain(`data-mail-delivery-state="${state}"`);
    expect(html).toContain(text);
  });

  it("renders translated recovery text when a locale resolver is supplied", () => {
    const html = renderToStaticMarkup(
      createElement(MailDeliveryStateNotice, { state: "needs_attention", translate: () => "Localized recovery guidance" }),
    );
    expect(html).toContain("Localized recovery guidance");
  });
});
