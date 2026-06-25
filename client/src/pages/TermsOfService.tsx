import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-logo-mark-LWuqsnXvZV3htEC4hfkanS.webp";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Terms of Service — Get Phame"
        description="Terms of Service for Get Phame. Review our acceptable use policy, data processing terms, and service agreement."
        canonical="https://getphame.app/terms-of-service"
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5 group">
            <img src={LOGO_URL} alt="Get Phame" className="w-8 h-8" />
            <span className="font-display font-bold text-base text-white">
              GET <span className="text-primary">PHAME</span>
            </span>
          </a>
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </a>
        </div>
      </header>

      {/* Hero banner */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border/20 py-12 md:py-16">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white mb-3">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-base">Last updated: April 13, 2026</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-4xl py-12 md:py-16">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-display prose-headings:font-bold prose-headings:text-white
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-3
            prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
            prose-strong:text-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-li:text-muted-foreground
            prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground"
        >
          <h2>1. Acceptance of Terms</h2>
          <p>By creating an account or otherwise accessing or using the Get Phame web application (the "Service"), you agree to be legally bound by these Terms of Service ("Terms") and our Privacy Policy, which is incorporated herein by reference. If you are using the Service on behalf of a business or other legal entity, you represent that you have authority to bind that entity to these Terms.</p>
          <p>If you do not agree to these Terms in their entirety, you must not access or use the Service. We reserve the right to update these Terms at any time. Material changes will be communicated by updating the "Last updated" date above.</p>

          <h2>2. Description of Service</h2>
          <p>Get Phame is a software-as-a-service (SaaS) web application that enables small business owners to send personalised review request emails to their customers using their own connected email account (via SMTP). The Service provides tools for managing customer contacts, creating email templates, scheduling follow-up reminders, and viewing delivery analytics (open and click tracking).</p>

          <h2>3. Eligibility and Account Registration</h2>
          <p>You must be at least 18 years of age and capable of forming a binding contract to use the Service. The Service is intended for business use and is not directed at consumers acting in a personal capacity.</p>
          <p>You must sign in using a valid Google account to access the Service. You are responsible for maintaining the confidentiality of your session and for all activity that occurs under your account. You agree to notify us immediately at <a href="mailto:steve@sk-america.com">steve@sk-america.com</a> if you become aware of any unauthorised use of your account.</p>

          <h2>4. Acceptable Use Policy</h2>
          <p>You may use the Service only for lawful purposes and in accordance with these Terms.</p>

          <h3>4.1 Prohibited Email Practices</h3>
          <p>You must not use the Service to send unsolicited commercial email (spam) to any person who has not had a genuine, prior business relationship with you. You must not use purchased, rented, scraped, or otherwise third-party-sourced email lists. You must not send emails to individuals who have previously opted out, unsubscribed, or asked not to be contacted.</p>

          <h3>4.2 Prohibited Technical Conduct</h3>
          <p>You must not attempt to gain unauthorised access to any part of the Service, its servers, databases, or related systems. You must not use automated scripts, bots, or other tools to circumvent the Service's rate limits.</p>

          <h3>4.3 Prohibited Content and Conduct</h3>
          <p>You must not use the Service to harass, threaten, defame, or deceive any person. You must not impersonate any person or entity. You must not use the Service to send content that is illegal, fraudulent, obscene, or that infringes the intellectual property rights of any third party.</p>

          <h2>5. CAN-SPAM, GDPR, CASL, and Anti-Spam Compliance</h2>
          <p>Get Phame provides infrastructure for sending emails — you are the sender of record for every email transmitted through your connected email account. You acknowledge and agree that you are solely responsible for ensuring your use of the Service complies with the CAN-SPAM Act (US), the General Data Protection Regulation (EU/UK), the Canada Anti-Spam Legislation (CASL), and any other applicable laws.</p>

          <h2>6. Email Account Integration</h2>
          <p>By connecting your email account via SMTP, you authorise Get Phame to send emails on your behalf using the credentials you provide. You represent that you are authorised to use the email account you connect.</p>
          <p>Your SMTP password is encrypted using AES-256-GCM before storage and is never transmitted to any third party. You may disconnect your email account at any time from the Settings screen.</p>

          <h2>7. Customer Data and Data Processing</h2>
          <p>You are the data controller for all customer contact information that you upload to or generate within the Service. Get Phame acts as a data processor on your behalf, processing it solely to provide the Service in accordance with your instructions.</p>

          <h2>8. Intellectual Property</h2>
          <p>The Service, including its software, design, text, graphics, logos, and all other content created by Get Phame, is owned by or licensed to Get Phame and is protected by United States and international intellectual property laws.</p>
          <p>You retain all ownership rights in the content you create using the Service, including email templates you write and customer data you upload.</p>

          <h2>9. DMCA</h2>
          <p>Get Phame respects the intellectual property rights of others. If you believe that content accessible through the Service infringes your copyright, you may submit a DMCA takedown notice to <a href="mailto:steve@sk-america.com">steve@sk-america.com</a>.</p>

          <h2>10. Disclaimer of Warranties</h2>
          <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE.</p>

          <h2>11. Limitation of Liability</h2>
          <p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, GET PHAME SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICE.</p>
          <p><strong>Liability cap.</strong> In no event shall Get Phame's total aggregate liability exceed the greater of: (a) the total amount you paid to Get Phame in the twelve (12) months immediately preceding the event; or (b) one hundred US dollars (USD $100.00).</p>

          <h2>12. Indemnification</h2>
          <p>You agree to defend, indemnify, and hold harmless Get Phame from and against any and all claims, damages, losses, liabilities, costs, and expenses arising out of or relating to your use of the Service or your violation of these Terms.</p>

          <h2>13. Termination</h2>
          <p>You may terminate your account at any time by using the account deletion feature in Settings or by contacting us. We reserve the right to suspend or terminate your account immediately for any violation of these Terms.</p>

          <h2>14. Dispute Resolution and Arbitration</h2>
          <p><strong>Informal resolution.</strong> Before initiating any formal dispute process, you agree to contact us at <a href="mailto:steve@sk-america.com">steve@sk-america.com</a> and give us at least 30 days to attempt to resolve the dispute informally.</p>
          <p><strong>Binding arbitration.</strong> If informal resolution fails, any dispute shall be resolved by binding individual arbitration administered by JAMS. The arbitration shall be conducted in San Bernardino County, California, or remotely by video conference.</p>
          <p><strong>Class action waiver.</strong> YOU AND GET PHAME AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS ACTION.</p>

          <h2>15. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law principles.</p>

          <h2>16. General Provisions</h2>
          <p><strong>Entire agreement.</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and Get Phame with respect to the Service.</p>
          <p><strong>Severability.</strong> If any provision of these Terms is found to be unenforceable, that provision will be limited or eliminated to the minimum extent necessary.</p>
          <p><strong>Waiver.</strong> Our failure to enforce any right or provision will not be considered a waiver of those rights.</p>

          <h2>17. Contact Us</h2>
          <p>If you have questions about these Terms or wish to report a violation, please contact:</p>
          <blockquote>
            <p>Get Phame — Legal<br/>Stephen Kinzey<br/>SK America LLC<br/>255 N D St, Suite 200XIX<br/>San Bernardino, CA 92401<br/>United States<br/>909 644-9828<br/><a href="mailto:steve@sk-america.com">steve@sk-america.com</a></p>
          </blockquote>
        </motion.article>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Get Phame" className="w-6 h-6" />
            <span className="font-display font-bold text-sm text-white">GET <span className="text-primary">PHAME</span></span>
          </a>
          <div className="flex items-center gap-6 text-sm">
            <a href="/privacy-policy" className="text-muted-foreground hover:text-white transition-colors">Privacy</a>
            <a href="/terms-of-service" className="text-primary font-medium">Terms</a>
            <a href="mailto:support@getphame.app" className="text-muted-foreground hover:text-white transition-colors">Support</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Get Phame. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
