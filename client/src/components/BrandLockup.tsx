interface BrandLockupProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  tone?: "split" | "gold" | "white";
  showText?: boolean;
  iconHref?: string;
  iconAriaLabel?: string;
}

const LOGO_URL = "https://assets.getphame.app/getphame-logo-mark.webp";

export default function BrandLockup({
  className = "",
  iconClassName = "w-9 h-9",
  textClassName = "text-xl",
  tone = "split",
  showText = true,
  iconHref,
  iconAriaLabel = "View the Get Phame landing page",
}: BrandLockupProps) {
  const getColor = tone === "gold" ? "text-primary" : "text-white";
  const phameColor = tone === "white" ? "text-white" : "text-primary";
  const icon = (
    <img
      src={LOGO_URL}
      alt=""
      aria-hidden="true"
      className={`${iconClassName} rounded-lg flex-shrink-0 object-contain`}
      loading="eager"
    />
  );

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Get Phame">
      {iconHref ? (
        <a
          href={iconHref}
          aria-label={iconAriaLabel}
          className="inline-flex flex-shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08172b]"
        >
          {icon}
        </a>
      ) : icon}
      {showText && (
        <span
          className={`inline-flex items-baseline font-display font-extrabold uppercase tracking-tight leading-none whitespace-nowrap ${textClassName}`}
          aria-hidden="true"
        >
          <span className={getColor}>Get&nbsp;</span>
          <span className={phameColor}>Phame</span>
        </span>
      )}
    </span>
  );
}
