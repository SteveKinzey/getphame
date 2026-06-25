import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-logo-mark-LWuqsnXvZV3htEC4hfkanS.webp";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="text-center max-w-md"
      >
        <a href="/" className="inline-flex items-center gap-2.5 mb-8">
          <img src={LOGO_URL} alt="Get Phame" className="w-10 h-10" />
          <span className="font-display font-extrabold text-xl text-white">
            GET <span className="text-primary">PHAME</span>
          </span>
        </a>

        <div className="mb-6">
          <span className="font-display font-extrabold text-7xl md:text-8xl text-primary/30">404</span>
        </div>

        <h1 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
          Page not found
        </h1>
        <p className="text-muted-foreground text-base mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 transition-all duration-200 active:scale-[0.97]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </a>
      </motion.div>
    </div>
  );
}
