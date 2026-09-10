import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function toFormattedSourcePattern(snippet: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern = "";

  for (let index = 0; index < snippet.length; ) {
    const character = snippet[index];
    if (character === '"' || character === "'") {
      let closingIndex = index + 1;
      while (closingIndex < snippet.length) {
        if (
          snippet[closingIndex] === character &&
          snippet[closingIndex - 1] !== "\\"
        )
          break;
        closingIndex += 1;
      }
      if (closingIndex < snippet.length) {
        pattern += `["']${escape(snippet.slice(index + 1, closingIndex))}["']`;
        index = closingIndex + 1;
        continue;
      }
    }

    if (/\s/.test(character)) {
      while (index < snippet.length && /\s/.test(snippet[index])) index += 1;
      pattern += "\\s*";
      continue;
    }

    pattern += escape(character);
    if ("().,=:?{}[]<>".includes(character)) pattern += "\\s*";
    index += 1;
  }

  return new RegExp(pattern);
}

function expectFormattedSource(source: string) {
  return {
    toContain(snippet: string) {
      expect(source).toMatch(toFormattedSourcePattern(snippet));
    },
    not: {
      toContain(snippet: string) {
        expect(source).not.toMatch(toFormattedSourcePattern(snippet));
      },
    },
  };
}

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

const localePaths = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
const versionUpdateKeys = [
  "title",
  "notice",
  "updateNow",
  "later",
  "blockedMutation",
  "blockedSensitiveFlow",
  "applyingTitle",
  "applyingDescription",
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

    expectFormattedSource(v27Worker).toContain(
      "const CACHE_NAME = 'getphame-v27'"
    );
    expectFormattedSource(main).toContain(
      'const SERVICE_WORKER_URL = "/sw-v28.js"'
    );
    expectFormattedSource(appContext).not.toContain(
      "navigator.serviceWorker.register"
    );
    expect(workerMirror).toBe(v28Worker);
    expectFormattedSource(v28Worker).toContain(
      "const CACHE_NAME = 'getphame-v29'"
    );
  });

  it("excludes deployment metadata from every cache path and preserves existing PWA exclusions", () => {
    const worker = readProjectFile("../client/public/sw-v28.js");
    const versionEndpointIndex = worker.search(
      toFormattedSourcePattern("url.pathname.startsWith('/__manus__/')")
    );
    const apiEndpointIndex = worker.search(
      toFormattedSourcePattern("url.pathname.startsWith('/api/')")
    );

    expect(versionEndpointIndex).toBeGreaterThan(-1);
    expect(apiEndpointIndex).toBeGreaterThan(versionEndpointIndex);
    expectFormattedSource(worker).toContain("cache: 'no-store'");
    expectFormattedSource(worker).toContain(
      "url.pathname.startsWith('/manus-storage/')"
    );
    expectFormattedSource(worker).toContain(
      "if (url.origin !== self.location.origin) return;"
    );
    expectFormattedSource(worker).toContain(
      "event.request.destination === 'document'"
    );
    expectFormattedSource(worker).toContain("return getOfflinePage();");
  });

  it("does not force activation during install and accepts a waiting-worker message only when peer tabs are absent", () => {
    const worker = readProjectFile("../client/public/sw-v28.js");
    const installStart = worker.indexOf("self.addEventListener('install'");
    const activateStart = worker.indexOf("self.addEventListener('activate'");
    const installBlock = worker.slice(installStart, activateStart);

    expect(installBlock).not.toContain("skipWaiting");
    expectFormattedSource(worker).toContain(
      "event.data.type === 'SKIP_WAITING'"
    );
    expectFormattedSource(worker).toContain("clients.length <= 1");
    expectFormattedSource(worker).toContain("await self.skipWaiting()");
    expectFormattedSource(worker).toContain("type: 'VERSION_AVAILABLE'");
  });

  it("couples the worker cache generation and locale cache buster with every supported catalog", () => {
    const worker = readProjectFile("../client/public/sw-v28.js");
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");

    expectFormattedSource(worker).toContain(
      "const LOCALE_CACHE_VERSION = 'phame61'"
    );
    expectFormattedSource(worker).toContain(
      "...TRANSLATION_ASSETS.map(path => `${path}?v=${LOCALE_CACHE_VERSION}`)"
    );
    expectFormattedSource(i18nSource).toContain(
      "/locales/{{lng}}/{{ns}}.json?v=phame61"
    );
    for (const locale of localePaths) {
      expectFormattedSource(worker).toContain(
        `/locales/${locale}/translation.json`
      );
      expectFormattedSource(worker).toContain(
        `/locales/${locale}/landing.json`
      );
    }
  });

  it("protects high-risk drafts plus raw authentication and payment activity before allowing a reload", () => {
    const safetyProvider = readProjectFile(
      "../client/src/contexts/UpdateSafetyContext.tsx"
    );
    const versionCheck = readProjectFile(
      "../client/src/hooks/useAppVersionCheck.ts"
    );
    const settings = readProjectFile("../client/src/pages/Settings.tsx");
    const sendRequest = readProjectFile("../client/src/pages/SendRequest.tsx");
    const templates = readProjectFile("../client/src/pages/EmailTemplates.tsx");
    const importContacts = readProjectFile(
      "../client/src/pages/ImportContacts.tsx"
    );
    const onboarding = readProjectFile(
      "../client/src/components/OnboardingWizard.tsx"
    );
    const campaignEditor = readProjectFile(
      "../client/src/components/ClientDetailSheet.tsx"
    );
    const magicLink = readProjectFile(
      "../client/src/components/auth/MagicLinkForm.tsx"
    );
    const login = readProjectFile("../client/src/pages/Login.tsx");
    const passkey = readProjectFile(
      "../client/src/components/security/AddPasskeyModal.tsx"
    );
    const upgrade = readProjectFile("../client/src/pages/Upgrade.tsx");

    expectFormattedSource(safetyProvider).toContain("useIsMutating()");
    expectFormattedSource(safetyProvider).toContain("registerCriticalActivity");
    expectFormattedSource(versionCheck).toContain("getCriticalActivityCount");
    expectFormattedSource(versionCheck).toContain(
      'setBlocker("critical-activity")'
    );
    expectFormattedSource(settings).toContain('"settings-core-forms"');
    expectFormattedSource(sendRequest).toContain(
      'useUpdateDirtySource("send-request-draft"'
    );
    expectFormattedSource(templates).toContain(
      'useUpdateDirtySource("email-templates-editor"'
    );
    expectFormattedSource(importContacts).toContain(
      'useUpdateDirtySource("contact-import-wizard"'
    );
    expectFormattedSource(campaignEditor).toContain(
      '"client-campaign-email-editor"'
    );
    expect(onboarding).toMatch(/useUpdateDirtySource\(\s*"onboarding-smtp"/);
    expect(onboarding).toMatch(
      /useUpdateDirtySource\(\s*"onboarding-review-platform"/
    );
    expect(onboarding).toMatch(
      /useUpdateDirtySource\(\s*"onboarding-connector"/
    );
    expectFormattedSource(magicLink).toContain("useUpdateCriticalActivity");
    expectFormattedSource(login).toContain('"login-provider-redirect"');
    expectFormattedSource(passkey).toContain('"passkey-provider-verification"');
    expectFormattedSource(upgrade).toContain('"paypal-checkout"');
  });

  it("bounds version checks, pauses background polling, and records worker-activation timeouts", () => {
    const versionUtility = readProjectFile("../client/src/lib/appVersion.ts");
    const versionCheck = readProjectFile(
      "../client/src/hooks/useAppVersionCheck.ts"
    );

    expectFormattedSource(versionUtility).toContain(
      "DEPLOYMENT_VERSION_REQUEST_TIMEOUT_MS = 10_000"
    );
    expectFormattedSource(versionUtility).toContain(
      "timeoutController.abort()"
    );
    expectFormattedSource(versionCheck).toContain("const startPolling = () =>");
    expectFormattedSource(versionCheck).toContain("const stopPolling = () =>");
    expectFormattedSource(versionCheck).toContain(
      'document.visibilityState !== "visible"'
    );
    expectFormattedSource(versionCheck).toContain(
      'recordState("failed", { failure: "worker-timeout" })'
    );
  });

  it("keeps complete localized update UI copy and accessible live status for every supported language", () => {
    const updateController = readProjectFile(
      "../client/src/components/AppVersionUpdateController.tsx"
    );

    expectFormattedSource(updateController).toContain('aria-live="polite"');
    for (const locale of localePaths) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      ) as { versionUpdate?: Record<string, string> };
      expect(Object.keys(catalog.versionUpdate ?? {}).sort()).toEqual(
        versionUpdateKeys
      );
    }
  });
});
