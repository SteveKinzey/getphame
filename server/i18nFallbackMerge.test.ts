import { describe, expect, it } from "vitest";
import { mergeLocaleFallback } from "../client/src/lib/i18nFallback";

describe("generated locale fallback merge", () => {
  it("preserves maintained translations while replacing obsolete scalar schema collisions with active nested keys", () => {
    const merged = mergeLocaleFallback(
      {
        onboardingGuide: {
          welcome: {
            heroText: "Texto de bienvenida",
            heroSubtext: "Texto secundario",
          },
        },
        nav: { home: "Inicio generado" },
      },
      {
        onboardingGuide: { welcome: "Etiqueta de bienvenida heredada" },
        nav: { home: "Inicio mantenido" },
      }
    );

    expect(merged).toEqual({
      onboardingGuide: {
        welcome: {
          heroText: "Texto de bienvenida",
          heroSubtext: "Texto secundario",
        },
      },
      nav: { home: "Inicio mantenido" },
    });
  });
});
