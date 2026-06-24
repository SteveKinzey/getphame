import { useState } from "react";
import { Monitor, Upload, TrendingUp } from "lucide-react";

const EMAIL_PREVIEW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-email-preview-ZjaDzUz6Dfun8nbQqZvidR.webp";
const CUSTOMER_IMPORT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-customer-import-9NmRfQtaWgULsTt5zeDj86.webp";
const REVIEW_TRACKING = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-review-tracking-d347r8GuH2TYD3AdUS9bYH.webp";

const tabs = [
  {
    id: "email",
    label: "Email Preview",
    icon: Monitor,
    title: "Emails that feel handwritten",
    description: "Each review request arrives from your actual email address with your name, your signature, and a personal tone. Customers trust it because it looks real — because it is.",
    image: EMAIL_PREVIEW,
  },
  {
    id: "import",
    label: "Customer Import",
    icon: Upload,
    title: "Your entire list in seconds",
    description: "Drag and drop a CSV or sync directly from WooCommerce. We validate emails, remove duplicates, and flag bounces — so every send counts.",
    image: CUSTOMER_IMPORT,
  },
  {
    id: "tracking",
    label: "Review Tracking",
    icon: TrendingUp,
    title: "Watch the reviews roll in",
    description: "Track every email sent, opened, and clicked. See your review count climb week over week with real-time analytics and growth charts.",
    image: REVIEW_TRACKING,
  },
];

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("email");
  const activeItem = tabs.find((t) => t.id === activeTab)!;

  return (
    <section id="product" className="py-20 md:py-28 bg-[oklch(0.12_0.025_250)]">
      <div className="container">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            The product
          </p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            Built to make review requests effortless
          </h2>
          <p className="text-lg text-muted-foreground">
            One simple tool. Three powerful views. Everything you need to grow your reputation.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-[0_0_25px_oklch(0.78_0.15_75/0.25)]"
                  : "bg-card border border-border/50 text-muted-foreground hover:text-white hover:border-primary/30"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content — asymmetric layout */}
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          {/* Text — narrower */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h3 className="font-display font-bold text-2xl md:text-3xl text-white mb-4">
              {activeItem.title}
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {activeItem.description}
            </p>
          </div>

          {/* Image — wider with glass frame */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="relative group">
              {/* Glow behind */}
              <div className="absolute -inset-3 bg-primary/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-black/30 group-hover:border-primary/20 transition-colors duration-300">
                <img
                  src={activeItem.image}
                  alt={activeItem.title}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
