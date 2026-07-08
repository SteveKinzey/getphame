import { useState } from "react";
import { Monitor, Upload, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FadeUp from "./FadeUp";

const EMAIL_PREVIEW_WEBP = "https://assets.getphame.app/phame-email-preview.webp";
const EMAIL_PREVIEW_PNG = "https://assets.getphame.app/phame-email-preview.png";
const CUSTOMER_IMPORT_WEBP = "https://assets.getphame.app/phame-customer-import.webp";
const CUSTOMER_IMPORT_PNG = "https://assets.getphame.app/phame-customer-import.png";
const REVIEW_TRACKING_WEBP = "https://assets.getphame.app/phame-review-tracking.webp";
const REVIEW_TRACKING_PNG = "https://assets.getphame.app/phame-review-tracking.png";

const tabs = [
  {
    id: "email",
    label: "Email Preview",
    icon: Monitor,
    title: "Emails that feel handwritten",
    description: "Each review request arrives from your actual email address with your name, your signature, and a personal tone. Customers trust it because it looks real — because it is.",
    webp: EMAIL_PREVIEW_WEBP,
    png: EMAIL_PREVIEW_PNG,
    alt: "GetPhame personalized review request email preview showing customer name, business signature, and Google review link",
  },
  {
    id: "import",
    label: "Customer Import",
    icon: Upload,
    title: "Your entire list in seconds",
    description: "Drag and drop a CSV or sync directly from WooCommerce. We validate emails, remove duplicates, and flag bounces — so every send counts.",
    webp: CUSTOMER_IMPORT_WEBP,
    png: CUSTOMER_IMPORT_PNG,
    alt: "GetPhame customer import screen showing CSV drag-and-drop upload with email validation and duplicate removal",
  },
  {
    id: "tracking",
    label: "Review Tracking",
    icon: TrendingUp,
    title: "Watch the reviews roll in",
    description: "Track every email sent, opened, and clicked. See your review count climb week over week with real-time analytics and growth charts.",
    webp: REVIEW_TRACKING_WEBP,
    png: REVIEW_TRACKING_PNG,
    alt: "GetPhame review tracking dashboard showing email open rates, click-through rates, and weekly review count growth chart",
  },
];

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("email");
  const activeItem = tabs.find((t) => t.id === activeTab)!;

  return (
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
              <div className="relative group">
                <div className="absolute -inset-3 bg-primary/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative rounded-2xl overflow-hidden border border-[#1e3050] shadow-2xl shadow-black/30 group-hover:border-primary/20 transition-colors duration-300">
                  <picture>
                    <source srcSet={activeItem.webp} type="image/webp" />
                    <source srcSet={activeItem.png} type="image/png" />
                    <img
                      src={activeItem.png}
                      alt={activeItem.alt}
                      className="w-full h-auto"
                      width={900}
                      height={600}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
