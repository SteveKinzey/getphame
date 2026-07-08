import { useState, useEffect, useCallback } from "react";
import { Monitor, Upload, TrendingUp, Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FadeUp from "./FadeUp";

const EMAIL_PREVIEW_WEBP = "https://assets.getphame.app/phame-email-preview.webp";
const CUSTOMER_IMPORT_WEBP = "https://assets.getphame.app/phame-customer-import.webp";
const REVIEW_TRACKING_WEBP = "https://assets.getphame.app/phame-review-tracking.webp";

const tabs = [
  {
    id: "email",
    label: "Email Preview",
    icon: Monitor,
    title: "Emails that feel handwritten",
    description: "Each review request arrives from your actual email address with your name, your signature, and a personal tone. Customers trust it because it looks real — because it is.",
    webp: EMAIL_PREVIEW_WEBP,
    alt: "GetPhame personalized review request email preview showing customer name, business signature, and Google review link",
  },
  {
    id: "import",
    label: "Customer Import",
    icon: Upload,
    title: "Your entire list in seconds",
    description: "Drag and drop a CSV or sync directly from WooCommerce. We validate emails, remove duplicates, and flag bounces — so every send counts.",
    webp: CUSTOMER_IMPORT_WEBP,
    alt: "GetPhame customer import screen showing CSV drag-and-drop upload with email validation and duplicate removal",
  },
  {
    id: "tracking",
    label: "Review Tracking",
    icon: TrendingUp,
    title: "Watch the reviews roll in",
    description: "Track every email sent, opened, and clicked. See your review count climb week over week with real-time analytics and growth charts.",
    webp: REVIEW_TRACKING_WEBP,
    alt: "GetPhame review tracking dashboard showing email open rates, click-through rates, and weekly review count growth chart",
  },
];

// ── Lightbox ──────────────────────────────────────────────────────────────────

interface LightboxProps {
  item: (typeof tabs)[number];
  onClose: () => void;
}

function Lightbox({ item, onClose }: LightboxProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
        aria-label="Close lightbox"
      />

      {/* Image container */}
      <motion.div
        className="relative z-10 w-full max-w-5xl"
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <span>Close</span>
          <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X size={16} />
          </div>
        </button>

        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <picture>
            <source srcSet={item.webp} type="image/webp" />
            <img
              src={item.webp}
              alt={item.alt}
              className="w-full h-auto"
              loading="eager"
              decoding="async"
            />
          </picture>
        </div>

        {/* Caption */}
        <p className="text-center text-sm text-white/60 mt-4 font-medium">{item.title}</p>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("email");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeItem = tabs.find((t) => t.id === activeTab)!;

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  return (
    <>
      <section id="product" className="py-20 md:py-28 bg-[oklch(0.12_0.025_250)]">
        <div className="container">
          <FadeUp className="max-w-2xl mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">The product</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              Built to make review requests effortless
            </h2>
            <p className="text-lg text-slate-200 font-medium">
              One simple tool. Three powerful views. Everything you need to grow your reputation.
            </p>
          </FadeUp>

          <FadeUp delay={0.1} className="flex flex-wrap gap-2 mb-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-[0_0_25px_oklch(0.78_0.15_75/0.25)]"
                    : "bg-[#0f1d32] border border-[#1e3050] text-slate-200 font-bold hover:text-white hover:border-primary/30"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </FadeUp>

          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
            {/* Text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + "-text"}
                className="lg:col-span-2 order-2 lg:order-1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <h3 className="font-display font-bold text-2xl md:text-3xl text-white mb-4">{activeItem.title}</h3>
                <p className="text-lg text-slate-200 font-medium leading-relaxed">{activeItem.description}</p>

                {/* Expand hint */}
                <button
                  onClick={openLightbox}
                  className="inline-flex items-center gap-2 mt-5 text-sm text-primary/70 hover:text-primary transition-colors font-medium"
                >
                  <Maximize2 size={14} />
                  View full size
                </button>
              </motion.div>
            </AnimatePresence>

            {/* Image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + "-image"}
                className="lg:col-span-3 order-1 lg:order-2"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {/* Clickable image wrapper with hover scale */}
                <div
                  className="relative group cursor-zoom-in"
                  onClick={openLightbox}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${activeItem.title} in full size`}
                  onKeyDown={(e) => e.key === "Enter" && openLightbox()}
                >
                  {/* Glow */}
                  <div className="absolute -inset-3 bg-primary/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Card with hover scale */}
                  <motion.div
                    className="relative rounded-2xl overflow-hidden border border-[#1e3050] shadow-2xl shadow-black/30 group-hover:border-primary/30 transition-colors duration-300"
                    whileHover={{ scale: 1.025 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <picture>
                      <source srcSet={activeItem.webp} type="image/webp" />
                      <img
                        src={activeItem.webp}
                        alt={activeItem.alt}
                        className="w-full h-auto"
                        width={900}
                        height={600}
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>

                    {/* Expand icon overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 shadow-lg">
                        <Maximize2 size={20} className="text-white" />
                      </div>
                    </div>

                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Lightbox portal */}
      <AnimatePresence>
        {lightboxOpen && <Lightbox item={activeItem} onClose={closeLightbox} />}
      </AnimatePresence>
    </>
  );
}
