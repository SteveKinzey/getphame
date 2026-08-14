import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ConnectionSavedNotice,
  getAppPasswordTooltipCopy,
  SmtpAppPasswordHelpTooltip,
  SmtpCandidateConnectionActions,
} from "./SmtpConnectionFeedback";

const translate = (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key;
const noOp = () => undefined;

describe("Settings SMTP connection feedback controls", () => {
  it("renders the actual pre-save test action, testing spinner, and unsaved success state", () => {
    const idle = renderToStaticMarkup(createElement(SmtpCandidateConnectionActions, {
      result: null, testing: false, connecting: false, onTest: noOp, onConnect: noOp, translate,
    }));
    const testing = renderToStaticMarkup(createElement(SmtpCandidateConnectionActions, {
      result: null, testing: true, connecting: false, onTest: noOp, onConnect: noOp, translate,
    }));
    const passed = renderToStaticMarkup(createElement(SmtpCandidateConnectionActions, {
      result: { ok: true }, testing: false, connecting: false, onTest: noOp, onConnect: noOp, translate,
    }));

    expect(idle).toContain("Test before saving");
    expect(testing).toContain('aria-busy="true"');
    expect(testing).toContain("Testing your mail server…");
    expect(passed).toContain("Connection test passed. Your credentials have not been saved yet.");
  });

  it("renders connect progress and saved success feedback for SMTP and bulk mail credentials", () => {
    const connecting = renderToStaticMarkup(createElement(SmtpCandidateConnectionActions, {
      result: null, testing: false, connecting: true, onTest: noOp, onConnect: noOp, translate,
    }));
    const smtpSaved = renderToStaticMarkup(createElement(ConnectionSavedNotice, {
      message: "Your email server is connected and ready for customer outreach.",
    }));
    const bulkSaved = renderToStaticMarkup(createElement(ConnectionSavedNotice, {
      message: "Your bulk mail server is connected and ready to use.",
    }));

    expect(connecting).toContain("Connecting and verifying…");
    expect(connecting).toContain('aria-busy="true"');
    expect(smtpSaved).toContain('role="status"');
    expect(smtpSaved).toContain("ready for customer outreach");
    expect(bulkSaved).toContain("bulk mail server is connected and ready to use");
  });

  it("renders provider-specific Gmail and Workspace App Password help beside the input label", () => {
    const gmail = renderToStaticMarkup(createElement(SmtpAppPasswordHelpTooltip, { provider: "gmail", translate }));
    const workspace = renderToStaticMarkup(createElement(SmtpAppPasswordHelpTooltip, { provider: "workspace", translate }));
    const gmailCopy = getAppPasswordTooltipCopy("gmail", translate);
    const workspaceCopy = getAppPasswordTooltipCopy("workspace", translate);

    expect(gmail).toContain("Gmail App Password help");
    expect(workspace).toContain("Google Workspace App Password help");
    expect(gmailCopy.content).toContain("16-character App Password");
    expect(workspaceCopy.content).toContain("Workspace administrator must allow App Passwords");
  });
});
