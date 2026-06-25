import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SEOHead from "@/components/SEOHead";
import TrustBar from "@/components/TrustBar";
import VideoDemo from "@/components/VideoDemo";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import ProductShowcase from "@/components/ProductShowcase";
import Stats from "@/components/Stats";
import Pricing from "@/components/Pricing";
import Comparison from "@/components/Comparison";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import LeadCapture from "@/components/LeadCapture";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEOHead
        title="Get Phame — Get More 5-Star Reviews Without the Awkward Ask"
        description="Send personalized review requests from your own email account. Your customers see it come from you — not a generic sender. Free to start with 10 requests."
        canonical="https://getphame.app/"
      />
      <Navbar />
      <Hero />
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
