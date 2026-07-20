import type { ComponentProps } from "react";
import BrandLockup from "@/components/BrandLockup";

type LandingBrandLinkProps = ComponentProps<typeof BrandLockup> & {
  ariaLabel?: string;
};

export default function LandingBrandLink({
  ariaLabel = "View the Get Phame landing page",
  ...brandProps
}: LandingBrandLinkProps) {
  return (
    <a
      href="/landing"
      onClick={(event) => {
        event.preventDefault();
        window.location.assign("/landing");
      }}
      aria-label={ariaLabel}
      className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08172b]"
    >
      <BrandLockup {...brandProps} />
    </a>
  );
}
