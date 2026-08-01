import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const localePaths = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
const versionUpdateKeys = [
  "title",
  "notice",
  "updateNow",
  "later",
  "blockedMutation",
  "blockedSensitiveFlow",
  "reloading",
  "failed",
  "discardTitle",
  "discardDescription",
  "keepEditing",
  "discardAndUpdate",
  "notChecked",
  "adminTitle",
  "adminDescription",
  "deployedVersion",
  "workerScript",
  "workerCache",
  "waitingWorker",
  "yes",
  "no",
  "lastChecked",
  "check",
  "reloadTab",
].sort();

describe("PWA safe update release contract", () => {
  it("keeps v27 intact while registering the path-versioned v28 worker from one canonical location", () => {
    const v27Worker = readProjectFile("../client/public/sw-v27.js");
    const v28Worker = readProjectFile("../client/public/sw-v28.js");
    const workerMirror = readProjectFile("../client/public/sw.js");
    const main = readProjectFile("../client/src/main.tsx");
    const appContext = readProjectFile("../client/src/contexts/AppContext.tsx");

    expect(v27Worker).toContain("const CACHE_NAME = 'getphame-v27'");
    expect(main).toContain('const SERVICE_WORKER_URL = "/sw-v28.js"');
    expect(appContext).not.toContain("navigator.serviceWorker.register");
    expect(workerMirror).toBe(v28Worker);
    expect(v28Worker).toContain("const CACHE_NAME = 'getphame-v28'");
  });

  it("excludes deployment metadata from every cache path and preserves existing PWA exclusions", () => {
    const worker = readProjectFile("../client/public/sw-v28.js");
    const versionEndpointIndex = worker.indexOf("url.pathname.startsWith('/__manus__/')");
    const apiEndpointIndex = worker.indexOf("url.pathname.startsWith('/api/')");

    expect(versionEndpointIndex).toBeGreaterThan(-1);
    expect(apiEndpointIndex).toBeGreaterThan(versionEndpointIndex);
    expect(worker).toContain("cache: 'no-store'");
    expect(worker).toContain("url.pathname.startsWith('/manus-storage/')");
    expect(worker).toContain("if (url.origin !== self.location.origin) return;");
    expect(worker).toContain("event.request.destination === 'document'");
    expect(worker).toContain("return getOfflinePage();");
  });

  it("does not force activation during install and accepts a waiting-worker message only when peer tabs are absent", () => {
    const worker = readProjectFile("../client/public/sw-v28.js");
    const installStart = worker.indexOf("self.addEventListener('install'");
    const activateStart = worker.indexOf("self.addEventListener('activate'");
    const installBlock = worker.slice(installStart, activateStart);

    expect(installBlock).not.toContain("skipWaiting");
    expect(worker).toContain("event.data.type === 'SKIP_WAITING'");
    expect(worker).toContain("clients.length <= 1");
    expect(worker).toContain("await self.skipWaiting()");
    expect(worker).toContain("type: 'VERSION_AVAILABLE'");
  });

  it("couples the worker cache generation and locale cache buster with every supported catalog", () => {
    const worker = readProjectFile("../client/public/sw-v28.js");
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");

    expect(worker).toContain("const LOCALE_CACHE_VERSION = 'phame58'");
    expect(worker).toContain("...TRANSLATION_ASSETS.map(path => `${path}?v=${LOCALE_CACHE_VERSION}`)");
    expect(i18nSource).toContain('/locales/{{lng}}/{{ns}}.json?v=phame58');
    for (const locale of localePaths) {
      expect(worker).toContain(`/locales/${locale}/translation.json`);
      expect(worker).toContain(`/locales/${locale}/landing.json`);
    }
  });

  it("protects high-risk drafts plus raw authentication and payment activity before allowing a reload", () => {
    const safetyProvider = readProjectFile("../client/src/contexts/UpdateSafetyContext.tsx");
    const versionCheck = readProjectFile("../client/src/hooks/useAppVersionCheck.ts");
    const settings = readProjectFile("../client/src/pages/Settings.tsx");
    const sendRequest = readProjectFile("../client/src/pages/SendRequest.tsx");
    const templates = readProjectFile("../client/src/pages/EmailTemplates.tsx");
    const importContacts = readProjectFile("../client/src/pages/ImportContacts.tsx");
    const onboarding = readProjectFile("../client/src/components/OnboardingWizard.tsx");
    const campaignEditor = readProjectFile("../client/src/components/ClientDetailSheet.tsx");
    const magicLink = readProjectFile("../client/src/components/auth/MagicLinkForm.tsx");
    const login = readProjectFile("../client/src/pages/Login.tsx");
    const passkey = readProjectFile("../client/src/components/security/AddPasskeyModal.tsx");
    const upgrade = readProjectFile("../client/src/pages/Upgrade.tsx");

    expect(safetyProvider).toContain("useIsMutating()");
    expect(safetyProvider).toContain("registerCriticalActivity");
    expect(versionCheck).toContain("getCriticalActivityCount");
    expect(versionCheck).toContain('setBlocker("critical-activity")');
    expect(settings).toContain('"settings-core-forms"');
    expect(sendRequest).toContain('useUpdateDirtySource("send-request-draft"');
    expect(templates).toContain('useUpdateDirtySource("email-templates-editor"');
    expect(importContacts).toContain('useUpdateDirtySource("contact-import-wizard"');
    expect(campaignEditor).toContain('"client-campaign-email-editor"');
    expect(onboarding).toMatch(/useUpdateDirtySource\(\s*"onboarding-smtp"/);
    expect(onboarding).toMatch(/useUpdateDirtySource\(\s*"onboarding-review-platform"/);
    expect(onboarding).toMatch(/useUpdateDirtySource\(\s*"onboarding-connector"/);
    expect(magicLink).toContain("useUpdateCriticalActivity");
    expect(login).toContain('"login-provider-redirect"');
    expect(passkey).toContain('"passkey-provider-verification"');
    expect(upgrade).toContain('"paypal-checkout"');
  });

  it("bounds version checks, pauses background polling, and records worker-activation timeouts", () => {
    const versionUtility = readProjectFile("../client/src/lib/appVersion.ts");
    const versionCheck = readProjectFile("../client/src/hooks/useAppVersionCheck.ts");

    expect(versionUtility).toContain(
      "DEPLOYMENT_VERSION_REQUEST_TIMEOUT_MS = 10_000"
    );
    expect(versionUtility).toContain("timeoutController.abort()");
    expect(versionCheck).toContain("const startPolling = () =>");
    expect(versionCheck).toContain("const stopPolling = () =>");
    expect(versionCheck).toContain('document.visibilityState !== "visible"');
    expect(versionCheck).toContain(
      'recordState("failed", { failure: "worker-timeout" })'
    );
  });

  it("keeps complete localized update UI copy and accessible live status for every supported language", () => {
    const updateController = readProjectFile("../client/src/components/AppVersionUpdateController.tsx");

    expect(updateController).toContain('aria-live="polite"');
    for (const locale of localePaths) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      ) as { versionUpdate?: Record<string, string> };
      expect(Object.keys(catalog.versionUpdate ?? {}).sort()).toEqual(versionUpdateKeys);
    }
  });
});
