// Get Phame — Redesigned Landing Page (Midnight Authority)
// Replaces the old landing page with the polished navy/gold version from the landing branch.
// This is shown to unauthenticated visitors at the root URL (/).
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SEOHead from "@/components/landing/SEOHead";
import TrustBar from "@/components/landing/TrustBar";
import SocialProofBar from "@/components/landing/SocialProofBar";
import VideoDemo from "@/components/landing/VideoDemo";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductShowcase from "@/components/landing/ProductShowcase";
import Stats from "@/components/landing/Stats";
import Pricing from "@/components/landing/Pricing";
import Comparison from "@/components/landing/Comparison";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import LeadCapture from "@/components/landing/LeadCapture";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-gray-100 overflow-x-hidden">
      <SEOHead
        title="Get Phame — Get More 5-Star Reviews Without the Awkward Ask"
        description="Send personalized review requests from your own email account. Your customers see it come from you — not a generic sender. Free to start with 10 requests."
        canonical="https://getphame.app/"
      />
      <Navbar />
      <Hero />
      <SocialProofBar />
      <TrustBar />
      <VideoDemo />
      <Features />
      <HowItWorks />
      <ProductShowcase />
      <Stats />
      <Testimonials />
      <Pricing />
      <Comparison />
      <FAQ />
      <LeadCapture />
      <FinalCTA />
      <Footer />
    </div>
  );
}
