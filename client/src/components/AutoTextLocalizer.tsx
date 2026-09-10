import { useEffect } from "react";
import i18n from "@/lib/i18n";
import { localizeStaticText } from "@/lib/autoText";

const ATTRIBUTE_NAMES = ["aria-label", "placeholder", "title", "alt"] as const;
const SKIPPED_TAGS = new Set(["CODE", "PRE", "SCRIPT", "STYLE", "TEXTAREA"]);
const LOADED_NAMESPACES = ["translation", "landing", "cancellation"] as const;
const I18N_KEY_PATTERN =
  /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)+$/;

type AttributeSources = Map<string, string>;

function splitWhitespace(value: string) {
  const prefix = value.match(/^\s*/)?.[0] ?? "";
  const suffix = value.match(/\s*$/)?.[0] ?? "";
  return {
    prefix,
    core: value.slice(prefix.length, value.length - suffix.length),
    suffix,
  };
}

function resolveRenderedKey(value: string): string | undefined {
  if (!I18N_KEY_PATTERN.test(value)) return undefined;

  const languages = [i18n.resolvedLanguage, i18n.language, "en"].filter(
    (language, index, values): language is string =>
      Boolean(language) && values.indexOf(language) === index
  );

  for (const language of languages) {
    for (const namespace of LOADED_NAMESPACES) {
      const resource = i18n.getResource(language, namespace, value);
      if (typeof resource === "string" && resource !== value) return resource;
    }
  }

  return undefined;
}

/**
 * Converts remaining legacy literals from the full-app audit at render time.
 * Existing `t()`-based copy is intentionally untouched; this is a bridge for
 * audited static markup and legacy form copy while features are incrementally
 * moved to named translation keys.
 */
export default function AutoTextLocalizer() {
  useEffect(() => {
    const textSources = new WeakMap<Text, string>();
    const attributeSources = new WeakMap<Element, AttributeSources>();
    let queued = false;

    const shouldSkip = (node: Node) => {
      const element = node.parentElement;
      return (
        !element ||
        SKIPPED_TAGS.has(element.tagName) ||
        element.closest("[data-auto-localize='off']") !== null
      );
    };

    const localizeTextNode = (node: Text) => {
      if (shouldSkip(node)) return;
      const current = node.nodeValue ?? "";
      const priorSource = textSources.get(node);
      const source = priorSource ?? current;
      const { prefix, core, suffix } = splitWhitespace(source);
      if (!core) return;

      const localized = resolveRenderedKey(core) ?? localizeStaticText(core);
      if (localized === core && !priorSource) return;

      textSources.set(node, source);
      const next = `${prefix}${localized}${suffix}`;
      if (current !== next) node.nodeValue = next;
    };

    const localizeAttributes = (element: Element) => {
      if (
        SKIPPED_TAGS.has(element.tagName) ||
        element.closest("[data-auto-localize='off']") !== null
      )
        return;
      const sources =
        attributeSources.get(element) ?? new Map<string, string>();

      for (const name of ATTRIBUTE_NAMES) {
        const current = element.getAttribute(name);
        if (!current) continue;
        const source = sources.get(name) ?? current;
        const localized =
          resolveRenderedKey(source) ?? localizeStaticText(source);
        if (localized !== source || sources.has(name)) {
          sources.set(name, source);
          if (current !== localized) element.setAttribute(name, localized);
        }
      }

      if (sources.size) attributeSources.set(element, sources);
    };

    const applyTranslations = () => {
      queued = false;
      const root = document.body;
      if (!root) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let current = walker.nextNode();
      while (current) {
        textNodes.push(current as Text);
        current = walker.nextNode();
      }
      textNodes.forEach(localizeTextNode);
      root.querySelectorAll("*").forEach(localizeAttributes);
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(applyTranslations);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTE_NAMES],
    });

    i18n.on("languageChanged", schedule);
    i18n.on("loaded", schedule);
    schedule();

    return () => {
      observer.disconnect();
      i18n.off("languageChanged", schedule);
      i18n.off("loaded", schedule);
    };
  }, []);

  return null;
}
