import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocumentCopy = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactIntro: string;
  contactResponse: string;
};

type LegalDocumentProps = {
  documentKey: "terms" | "privacy";
  contactEmail: string;
  contactAddress: ReactNode;
};

const bodyClassName =
  "container max-w-3xl space-y-8 pb-16 text-[0.9375rem] leading-7 text-slate-100 " +
  "[&_a]:break-all [&_a]:font-semibold [&_a]:underline [&_a]:decoration-primary/80 " +
  "[&_a]:underline-offset-4 [&_a:focus-visible]:rounded-sm [&_a:focus-visible]:outline-none " +
  "[&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-primary [&_a:focus-visible]:ring-offset-2 " +
  "[&_a:focus-visible]:ring-offset-[#0b1830]";

export default function LegalDocument({
  documentKey,
  contactEmail,
  contactAddress,
}: LegalDocumentProps) {
  const { t } = useTranslation();
  const document = t(`legal.${documentKey}`, {
    returnObjects: true,
  }) as unknown as LegalDocumentCopy;

  return (
    <div>
      <div className="container py-10">
        <h1 className="mb-2 text-3xl font-display font-extrabold text-white md:text-4xl">
          {document.title}
        </h1>
        <p className="text-sm font-medium text-slate-200">
          <time dateTime="2026-07-24">{document.lastUpdated}</time>
        </p>
      </div>

      <article className={bodyClassName}>
        {document.sections.map(section => (
          <section key={section.id} aria-labelledby={`${documentKey}-${section.id}`}>
            <h2
              id={`${documentKey}-${section.id}`}
              className="mb-3 text-lg font-bold text-slate-100"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph, index) => (
              <p key={index} className={index < (section.paragraphs?.length ?? 0) - 1 ? "mb-3" : undefined}>
                {paragraph}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-primary">
                {section.bullets.map(item => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}

        <section aria-labelledby={`${documentKey}-contact`}>
          <h2
            id={`${documentKey}-contact`}
            className="mb-3 text-lg font-bold text-slate-100"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {t("legal.contactHeading")}
          </h2>
          <p className="mb-3">{document.contactIntro}</p>
          <address className="border-l-2 border-primary pl-3 text-slate-100 not-italic leading-relaxed">
            <span translate="no">
              Get Phame<br />
              {contactAddress}<br />
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </span>
          </address>
          <p className="mt-3">{document.contactResponse}</p>
        </section>
      </article>
    </div>
  );
}
