import { motion } from "framer-motion";
import { Star, Mail, MousePointerClick, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useState } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-logo-mark-LWuqsnXvZV3htEC4hfkanS.webp";
const HERO_ILLUSTRATION = "https://assets.getphame.app/phame-hero-illustration.png";
const WORDMARK_URL = "https://assets.getphame.app/phame-wordmark-transparent-clean.png";

const features = [
  { icon: Mail, text: "Sends from your email" },
  { icon: MousePointerClick, text: "One-tap requests" },
  { icon: Sparkles, text: "Free to start" },
];

function GoogleButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white/80 text-gray-500 font-semibold text-base rounded-xl cursor-not-allowed shadow-lg relative"
        aria-label="Google Sign In — coming soon"
      >
        <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="opacity-60">Continue with Google</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider font-bold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">Soon</span>
      </button>
      {showTooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border/60 text-xs text-muted-foreground px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-20">
          Google Sign In coming soon
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEOHead
        title="Sign Up — Get Phame | Start Getting More 5-Star Reviews"
        description="Create your free Get Phame account. Send personalized review requests from your own email. 10 free requests included, no credit card required."
        canonical="https://getphame.app/onboarding"
      />
      {/* Top bar */}
      <header className="w-full py-4 px-6 flex items-center justify-between z-10 relative">
        <a href="/" className="flex items-center gap-2.5 group">
          <img src={LOGO_URL} alt="Get Phame" className="w-9 h-9 transition-transform duration-200 group-hover:scale-105" />
          <div className="flex items-baseline gap-1">
            <span className="font-display font-extrabold text-lg tracking-tight text-white">GET</span>
            <span className="font-display font-extrabold text-lg tracking-[0.08em] text-primary">PHAME</span>
          </div>
        </a>
        <a href="/" className="text-sm text-muted-foreground hover:text-white transition-colors">
          ← Back to home
        </a>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side — Branding & value prop (desktop only shows on left, mobile shows above) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="hidden lg:flex flex-col items-start"
          >
            {/* Hero illustration */}
            <div className="relative w-full max-w-md mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl" />
              <img
                src={HERO_ILLUSTRATION}
                alt="Get Phame rocket illustration — personalized review requests launched from your email"
                className="relative w-full h-auto max-h-[320px] object-contain animate-float"
                loading="eager"
              />
            </div>

            <h2 className="font-display font-extrabold text-3xl xl:text-4xl text-white leading-tight mb-4">
              Your reviews,{" "}
              <span className="text-primary">your reputation.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6 max-w-md">
              Join thousands of businesses using Get Phame to earn authentic 5-star reviews — sent from their own email, not a faceless platform.
            </p>

            {/* Trust signals */}
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                <span>Password encrypted at rest (AES-256)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                <span>Your customer list stays private</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                <span>Unsubscribe link in every email</span>
              </div>
            </div>
          </motion.div>

          {/* Right side — Sign in card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="relative">
              {/* Glow effect behind card */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-3xl blur-xl opacity-60" />

              {/* Card */}
              <div className="relative bg-card border border-border/60 rounded-2xl p-8 md:p-10 shadow-2xl shadow-black/20">
                {/* Mobile logo + illustration */}
                <div className="lg:hidden flex flex-col items-center mb-6">
                  <img
                    src={WORDMARK_URL}
                    alt="Get Phame wordmark"
                    className="h-8 mb-4 object-contain"
                    loading="eager"
                  />
                  <img
                    src={HERO_ILLUSTRATION}
                    alt="Get Phame rocket illustration"
                    className="w-48 h-auto mb-4 animate-float"
                    loading="eager"
                  />
                </div>

                {/* Heading */}
                <div className="text-center mb-8">
                  <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white mb-2">
                    Get More 5-Star
                  </h1>
                  <h2 className="font-display font-extrabold text-2xl md:text-3xl text-primary">
                    Google Reviews
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base mt-3 leading-relaxed">
                    Send personalized review requests from your own email account. Your customers see it come from you — not a generic sender.
                  </p>
                </div>

                {/* Stars */}
                <div className="flex justify-center gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                  ))}
                </div>

                {/* Feature badges */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {features.map((f) => (
                    <span
                      key={f.text}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/60 border border-border/40 rounded-full text-xs font-medium text-foreground"
                    >
                      <f.icon className="w-3.5 h-3.5 text-primary" />
                      {f.text}
                    </span>
                  ))}
                </div>

                {/* Auth buttons */}
                <div className="flex flex-col gap-3">
                  <GoogleButton />

                  <a
                    href="/api/auth/apple"
                    className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-black text-white font-semibold text-base rounded-xl hover:bg-gray-900 transition-all duration-200 active:scale-[0.98] shadow-lg border border-white/10"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Continue with Apple
                  </a>
                </div>

                {/* Subtext */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                  Start free — 10 review requests included. No credit card required.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
          <span>·</span>
          <a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a>
          <span>·</span>
          <a href="mailto:support@getphame.app" className="hover:text-white transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
