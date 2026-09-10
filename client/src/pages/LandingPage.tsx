// Get Phame — Redesigned Landing Page (Midnight Authority)
// Replaces the old landing page with the polished navy/gold version from the landing branch.
// This is shown to unauthenticated visitors at the root URL (/).
import { lazy, Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import AppPurpose from "@/components/landing/AppPurpose";
import SEOHead from "@/components/landing/SEOHead";
import TrustBar from "@/components/landing/TrustBar";
import SecuritySummary from "@/components/landing/SecuritySummary";

// Below-fold components — lazy-loaded to reduce initial bundle size and improve LCP.
// Hero, Navbar, TrustBar, AppPurpose, SecuritySummary stay eager (above the fold).
const VideoDemo = lazy(() => import("@/components/landing/VideoDemo"));
const Features = lazy(() => import("@/components/landing/Features"));
const HowItWorks = lazy(() => import("@/components/landing/HowItWorks"));
const ProductShowcase = lazy(
  () => import("@/components/landing/ProductShowcase")
);
const Stats = lazy(() => import("@/components/landing/Stats"));
const Pricing = lazy(() => import("@/components/landing/Pricing"));
const Comparison = lazy(() => import("@/components/landing/Comparison"));
const FAQ = lazy(() => import("@/components/landing/FAQ"));
const LeadCapture = lazy(() => import("@/components/landing/LeadCapture"));
const FinalCTA = lazy(() => import("@/components/landing/FinalCTA"));
const Footer = lazy(() => import("@/components/landing/Footer"));

// Lightweight skeleton fallback shown while lazy sections are loading
function SectionSkeleton() {
  return (
    <div className="h-48 animate-pulse bg-white/5 rounded-2xl mx-4 my-4" />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-gray-100 overflow-x-hidden">
      <SEOHead
        title="Get Phame | Review Request Software for Local Businesses"
        description="Send personalized review-request emails, track engagement, and help local businesses earn more customer feedback with Get Phame."
        canonical="https://getphame.app/"
      />
      <Navbar />
      <Hero />
      <AppPurpose />
      <TrustBar />
      <SecuritySummary />
      <Suspense fallback={<SectionSkeleton />}>
        <VideoDemo />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Features />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <HowItWorks />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ProductShowcase />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Pricing />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Comparison />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FAQ />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <LeadCapture />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FinalCTA />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
