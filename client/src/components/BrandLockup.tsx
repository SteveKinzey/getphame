interface BrandLockupProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  tone?: "split" | "gold" | "white";
  showText?: boolean;
}

const LOGO_URL = "https://assets.getphame.app/getphame-logo.svg";

export default function BrandLockup({
  className = "",
  iconClassName = "w-9 h-9",
  textClassName = "text-xl",
  tone = "split",
  showText = true,
}: BrandLockupProps) {
  const getColor = tone === "gold" ? "text-primary" : "text-white";
  const phameColor = tone === "white" ? "text-white" : "text-primary";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Get Phame">
      <img
        src={LOGO_URL}
        alt=""
        aria-hidden="true"
        className={`${iconClassName} rounded-lg flex-shrink-0 object-contain`}
        loading="eager"
      />
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
