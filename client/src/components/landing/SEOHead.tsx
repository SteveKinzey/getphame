import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  keywords?: string[];
  socialImage?: string;
  socialImageAlt?: string;
  jsonLd?: Record<string, unknown>;
}

/**
 * Sets document title and meta description for each page.
 * In a static SPA, this helps with social sharing previews
 * when crawlers render JS and with browser tab titles.
 */
export default function SEOHead({
  title,
  description,
  canonical,
  noindex,
  keywords,
  socialImage,
  socialImageAlt,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    // Set title
    document.title = title;

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", description);
    } else {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      metaDesc.setAttribute("content", description);
      document.head.appendChild(metaDesc);
    }

    // Set canonical
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (canonicalEl) {
        canonicalEl.href = canonical;
      } else {
        canonicalEl = document.createElement("link");
        canonicalEl.rel = "canonical";
        canonicalEl.href = canonical;
        document.head.appendChild(canonicalEl);
      }
    }

    // Set robots
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (robotsMeta) {
        robotsMeta.setAttribute("content", "noindex, nofollow");
      } else {
        robotsMeta = document.createElement("meta");
        robotsMeta.setAttribute("name", "robots");
        robotsMeta.setAttribute("content", "noindex, nofollow");
        document.head.appendChild(robotsMeta);
      }
    } else if (robotsMeta) {
      robotsMeta.setAttribute("content", "index, follow");
    }

    // Set OG tags
    const setOG = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (el) {
        el.setAttribute("content", content);
      } else {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        el.setAttribute("content", content);
        document.head.appendChild(el);
      }
    };

    setOG("og:title", title);
    setOG("og:description", description);
    if (canonical) setOG("og:url", canonical);
    if (socialImage) setOG("og:image", socialImage);
    if (socialImageAlt) setOG("og:image:alt", socialImageAlt);

    // Set Twitter tags
    const setTwitter = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (el) {
        el.setAttribute("content", content);
      } else {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        el.setAttribute("content", content);
        document.head.appendChild(el);
      }
    };

    setTwitter("twitter:title", title);
    setTwitter("twitter:description", description);
    if (socialImage) {
      setTwitter("twitter:card", "summary_large_image");
      setTwitter("twitter:image", socialImage);
    }
    if (socialImageAlt) setTwitter("twitter:image:alt", socialImageAlt);

    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (keywords?.length) {
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.setAttribute("name", "keywords");
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.setAttribute("content", keywords.join(", "));
    } else {
      keywordsMeta?.remove();
    }

    const structuredDataId = "get-phame-page-structured-data";
    let structuredData = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!structuredData) {
        structuredData = document.createElement("script");
        structuredData.id = structuredDataId;
        structuredData.type = "application/ld+json";
        document.head.appendChild(structuredData);
      }
      structuredData.textContent = JSON.stringify(jsonLd);
    } else {
      structuredData?.remove();
    }
  }, [title, description, canonical, noindex, keywords, socialImage, socialImageAlt, jsonLd]);

  return null;
}
