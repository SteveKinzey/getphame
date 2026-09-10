import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("admin GitHub cleanup showcase UI", () => {
  it("registers an admin route, role gate, and administration hub entry", () => {
    const app = read("client/src/App.tsx");
    const page = read("client/src/pages/AdminGithubCleanupShowcase.tsx");
    const dashboard = read("client/src/pages/AdminDashboard.tsx");

    expect(app).toContain('path="/admin/github-cleanup"');
    expect(app).toContain("AdminGithubCleanupShowcase");
    expect(page).toContain('const isAdmin = user?.role === "admin"');
    expect(page).toContain("enabled: isAdmin");
    expect(page).toContain(
      'if (!authLoading && user && !isAdmin) navigate("/")'
    );
    expect(page).toContain("if (!isAdmin) return null");
    expect(page).toContain("trpc.githubCleanupShowcase.dashboard.useQuery");
    expect(page).toContain("data.snapshot.treeSha.slice(0, 7)");
    expect(page).toContain("data.workstreams.map");
    expect(page).not.toContain("/manus-storage/");
    expect(page).not.toContain("data.visuals");
    expect(dashboard).toContain('path: "/admin/github-cleanup"');
  });

  it("localizes the showcase in every maintained locale", () => {
    const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];

    for (const locale of locales) {
      const catalog = JSON.parse(
        read(`client/public/locales/${locale}/translation.json`)
      );
      expect(catalog.adminGithubCleanup?.title).toBeTypeOf("string");
      expect(catalog.adminGithubCleanup?.metrics?.extraction?.title).toBeTypeOf(
        "string"
      );
      expect(catalog.adminGithubCleanup?.script?.copy).toBeTypeOf("string");
    }

    const simplifiedChinese = JSON.parse(
      read("client/public/locales/zh-CN/translation.json")
    );
    expect(simplifiedChinese.adminGithubCleanup.stats.openPrs).toBe(
      "未关闭的拉取请求"
    );
    expect(
      simplifiedChinese.adminGithubCleanup.workstreams.helpAssistant.title
    ).toBe("全局公开帮助助手");
    expect(
      simplifiedChinese.adminGithubCleanup.workstreams.sourcesWoo.title
    ).toBe("同意优先的来源与 WooCommerce");
  });
});
