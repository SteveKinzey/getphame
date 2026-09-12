// PublicLayout — wraps public-facing pages (Privacy, Terms, Data Usage, etc.)
// with the landing page Navbar and Footer, full-width layout.
import { ReactNode } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.10 0.03 250)" }}
    >
      <Navbar />
      {/* pt-20 to clear the fixed Navbar */}
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
