import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
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
      <Navbar />
      <Hero />
      <TrustBar />
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
