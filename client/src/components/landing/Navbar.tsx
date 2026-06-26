import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-logo-mark-LWuqsnXvZV3htEC4hfkanS.webp";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine if we're on the home page (for anchor links)
  const isHomePage = typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[oklch(0.12_0.03_250/0.95)] backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <nav className="container flex items-center justify-between h-16 md:h-[4.5rem]">
        {/* Logo — prominent brand mark */}
        <a href="/" className="flex items-center gap-2.5 group">
          <img src={LOGO_URL} alt="Get Phame" className="w-9 h-9 md:w-10 md:h-10 transition-transform duration-200 group-hover:scale-105" />
          <div className="flex items-baseline gap-1">
            <span className="font-display font-extrabold text-xl md:text-[1.4rem] tracking-tight text-white">
              GET
            </span>
            <span className="font-display font-extrabold text-xl md:text-[1.4rem] tracking-[0.08em] text-primary">
              PHAME
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={isHomePage ? link.href : `/${link.href}`}
              className="text-sm font-medium text-slate-200 hover:text-white transition-colors duration-200 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all after:duration-200 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="/onboarding"
            className="text-base font-semibold text-slate-200 hover:text-white transition-colors"
          >
            Sign In
          </a>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_15px_oklch(0.78_0.15_75/0.2)]"
          >
            Get Started Free
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[oklch(0.12_0.03_250/0.98)] backdrop-blur-xl border-t border-border/50">
          <div className="container py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={isHomePage ? link.href : `/${link.href}`}
                onClick={() => setMobileOpen(false)}
                className="text-lg font-bold text-white py-2.5 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-border/30 my-2" />
            <a
              href="/onboarding"
              className="text-lg font-bold text-white py-2.5"
            >
              Sign In
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground font-semibold text-base rounded-xl mt-2"
            >
              Get Started Free
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
