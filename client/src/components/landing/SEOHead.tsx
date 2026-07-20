import { useEffect } from "react";

const DEFAULT_SOCIAL_IMAGE = "https://assets.getphame.app/getphame-og-image.png?v=4";
const DEFAULT_SOCIAL_IMAGE_ALT = "Get Phame dashboard for sending review requests and tracking email engagement";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  keywords?: string[];
  socialImage?: string;
  socialImageAlt?: string;
}

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

/**
 * Synchronizes document, canonical, social-card, and keyword metadata for the
 * public SPA routes after they render in the browser.
 */
export default function SEOHead({
  title,
  description,
  canonical,
  noindex,
  keywords,
  socialImage = DEFAULT_SOCIAL_IMAGE,
  socialImageAlt = DEFAULT_SOCIAL_IMAGE_ALT,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);

    if (keywords && keywords.length > 0) {
      upsertMeta('meta[name="keywords"]', "name", "keywords", keywords.join(", "));
    }

    let canonicalElement = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      if (!canonicalElement) {
        canonicalElement = document.createElement("link");
        canonicalElement.rel = "canonical";
        document.head.appendChild(canonicalElement);
      }
      canonicalElement.href = canonical;
    }

    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.name = "robots";
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = "noindex, nofollow";
    } else if (robotsMeta) {
      robotsMeta.content = "index, follow";
    }

    const setOG = (property: string, content: string) => {
      upsertMeta(`meta[property="${property}"]`, "property", property, content);
    };
    const setTwitter = (name: string, content: string) => {
      upsertMeta(`meta[name="${name}"]`, "name", name, content);
    };

    setOG("og:type", "website");
    setOG("og:site_name", "Get Phame");
    setOG("og:title", title);
    setOG("og:description", description);
    setOG("og:image", socialImage);
    setOG("og:image:secure_url", socialImage);
    setOG("og:image:type", "image/png");
    setOG("og:image:width", "1200");
    setOG("og:image:height", "630");
    setOG("og:image:alt", socialImageAlt);
    if (canonical) setOG("og:url", canonical);

    setTwitter("twitter:card", "summary_large_image");
    setTwitter("twitter:title", title);
    setTwitter("twitter:description", description);
    setTwitter("twitter:image", socialImage);
    setTwitter("twitter:image:alt", socialImageAlt);
  }, [canonical, description, keywords, noindex, socialImage, socialImageAlt, title]);

  return null;
}
