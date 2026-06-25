import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-logo-mark-LWuqsnXvZV3htEC4hfkanS.webp";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Privacy Policy — Get Phame"
        description="Learn how Get Phame collects, uses, and protects your data. Your SMTP credentials are encrypted with AES-256-GCM and never shared."
        canonical="https://getphame.app/privacy-policy"
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
              Privacy Policy
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
          <h2>1. Introduction</h2>
          <p>Get Phame ("we," "our," or "us") is a web application that helps small businesses collect customer reviews by sending personalised review request emails through the business owner's own email account. This Privacy Policy describes how we collect, use, store, and protect information when you use the Get Phame service (the "Service"), and explains the rights you have over your data.</p>
          <p>By creating an account and using the Service, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with any part of this policy, please discontinue use of the Service. This policy applies to all users of Get Phame, including business owners who register for an account and the customers whose contact information is uploaded to the Service.</p>

          <h2>2. Who We Are and How to Contact Us</h2>
          <p>Get Phame is operated as a software-as-a-service product. For all privacy-related inquiries, data deletion requests, or concerns about this policy, you may contact us at:</p>
          <blockquote>
            <p>Get Phame<br/>Stephen Kinzey<br/>SK America LLC<br/>255 N D St, Suite 200XIX<br/>San Bernardino, CA 92401<br/>United States<br/>909 644-9828<br/><a href="mailto:steve@sk-america.com">steve@sk-america.com</a></p>
          </blockquote>
          <p>We aim to respond to all privacy-related requests within 30 calendar days.</p>

          <h2>3. Information We Collect</h2>
          <p>We collect information in three ways: information you provide directly, information generated automatically when you use the Service, and information about your customers that you upload to the Service.</p>

          <h3>3.1 Information You Provide</h3>
          <p><strong>Account information.</strong> When you sign in via Google OAuth, we receive your name and email address from Google. We do not receive or store your Google account password.</p>
          <p><strong>Business profile.</strong> You may enter your business name, a display name for outgoing emails, and links to your review platforms (e.g., Google Business, Yelp, TripAdvisor). This information is stored in your account and used to personalise the emails sent through the Service.</p>
          <p><strong>SMTP credentials.</strong> To send emails on your behalf, you must provide your outgoing mail server details: the SMTP host, port, your email address, and an app-specific password. Your password is encrypted using AES-256-GCM before it is written to our database and is never stored in plain text. It is never logged, displayed in full, or transmitted to any third party.</p>
          <p><strong>Customer contact data.</strong> You may manually enter, import via CSV, or sync from WooCommerce or Stripe the names and email addresses of your customers. This data is stored in your account and used exclusively to send review request emails that you initiate. We do not use your customers' contact information for any other purpose.</p>

          <h3>3.2 Information Generated Automatically</h3>
          <p><strong>Email tracking events.</strong> Each review request email contains a 1×1 tracking pixel and a click-tracking redirect link. When a recipient opens the email or clicks the review link, we record the event timestamp, the approximate IP address (used only to determine country-level geography), and the email client's user agent string. This data is associated with the specific review request in your account and displayed to you as open and click analytics. We do not use this data to build profiles of your customers or share it with third parties.</p>
          <p><strong>SMTP health data.</strong> We perform periodic automated checks to verify that your connected email account is still reachable. The result of each check (success or failure, and any error message returned by the mail server) is stored in your account so you can diagnose connection issues.</p>
          <p><strong>Usage data.</strong> We record the number of review requests sent per month per account for operational purposes (rate limiting, capacity planning). We do not sell or share this data.</p>

          <h3>3.3 Information We Do Not Collect</h3>
          <p>We do not read, index, or store the contents of your existing emails, your inbox, your sent folder, or any other mailbox data. Your SMTP credentials are used exclusively to send outbound emails you explicitly initiate through the Service. We have no access to your email history.</p>

          <h2>4. How We Use Your Information</h2>
          <p><strong>Providing the Service.</strong> Your account information, business profile, SMTP credentials, and customer contact data are used to operate the core functionality of Get Phame — composing and sending personalised review request emails from your email account to your customers.</p>
          <p><strong>Analytics and reporting.</strong> Email tracking events (opens, clicks) are used to generate the analytics displayed in your account dashboard.</p>
          <p><strong>Service reliability.</strong> SMTP health check results are used to alert you when your email connection stops working.</p>
          <p><strong>Security and fraud prevention.</strong> We use rate limiting and usage data to prevent abuse of the Service.</p>
          <p><strong>Legal compliance.</strong> We may retain certain records to comply with applicable laws, resolve disputes, and enforce our Terms of Service.</p>

          <h2>5. Legal Basis for Processing (GDPR)</h2>
          <p>If you are located in the European Economic Area (EEA) or United Kingdom, we process your personal data under the following legal bases:</p>
          <p><strong>Contract performance.</strong> Processing your account information, business profile, SMTP credentials, and customer data is necessary to provide the Service you have signed up for.</p>
          <p><strong>Legitimate interests.</strong> We process usage data and SMTP health data based on our legitimate interest in operating a reliable and secure service.</p>
          <p><strong>Legal obligation.</strong> We may process data where required to comply with applicable law.</p>

          <h2>6. Data Sharing and Third Parties</h2>
          <p>We do not sell, rent, or trade your personal information or your customers' contact data to any third party. We share data only in the following limited circumstances:</p>
          <p><strong>Infrastructure providers.</strong> We use cloud infrastructure providers to host the Service and store data. These providers process data on our behalf under data processing agreements.</p>
          <p><strong>Stripe.</strong> If you make a payment for a premium plan, your payment is processed by Stripe, Inc. We do not store full card numbers or CVV codes.</p>
          <p><strong>WooCommerce / Stripe customer sync.</strong> If you choose to sync customers, we retrieve only the name and email address of each customer via the API credentials you provide.</p>
          <p><strong>Legal requirements.</strong> We may disclose your information if required to do so by law, court order, or governmental authority.</p>

          <h2>7. Email Tracking and Your Customers' Privacy</h2>
          <p>Review request emails sent through Get Phame contain a tracking pixel and a click-tracking redirect link. As the business owner using Get Phame, you are the data controller for your customers' contact information and for the tracking data generated when they interact with your emails.</p>
          <p>Tracking data (open/click events) is stored only in your account, is visible only to you, and is not shared with or sold to any third party.</p>

          <h2>8. Data Retention</h2>
          <p>We retain your account data, business profile, customer contacts, and email tracking records for as long as your account remains active. If you delete your account or request data deletion, we will remove your personal data from our active systems within 30 days.</p>

          <h2>9. Data Security</h2>
          <p><strong>Encryption at rest.</strong> SMTP passwords are encrypted using AES-256-GCM before storage. Database connections use TLS in transit.</p>
          <p><strong>Encryption in transit.</strong> All communication between your browser and our servers is encrypted using HTTPS/TLS.</p>
          <p><strong>Access controls.</strong> Access to production systems is restricted to authorised personnel only.</p>
          <p><strong>HTTP security headers.</strong> Our servers apply standard HTTP security headers on all responses.</p>

          <h2>10. Your Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data: right of access, right to rectification, right to erasure, right to data portability, right to object, and right to withdraw consent.</p>
          <p>To exercise any of these rights, contact us at <a href="mailto:steve@sk-america.com">steve@sk-america.com</a>.</p>

          <h2>11. CAN-SPAM Act and Anti-Spam Compliance</h2>
          <p>Get Phame is a tool that sends transactional and relationship-based emails on behalf of its users. As a user of the Service, you are the sender of record for all emails transmitted through your connected email account. You are solely responsible for ensuring compliance with the CAN-SPAM Act (US), GDPR (EU), CASL (Canada), and any other applicable anti-spam or data protection laws.</p>

          <h2>12. Cookies and Session Data</h2>
          <p>Get Phame uses a single, HTTP-only session cookie to maintain your login state. This cookie is essential for the operation of the Service and cannot be disabled without preventing you from using the app. We do not use third-party advertising cookies, analytics cookies, or any other non-essential cookies.</p>

          <h2>13. Children's Privacy</h2>
          <p>Get Phame is a business tool intended for use by adults aged 18 and over. We do not knowingly collect personal information from individuals under the age of 18.</p>

          <h2>14. International Data Transfers</h2>
          <p>Get Phame is operated from the United States. If you are accessing the Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States.</p>

          <h2>15. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date at the top of this page.</p>

          <h2>16. Contact Us</h2>
          <p>If you have any questions, concerns, or requests relating to this Privacy Policy, please contact:</p>
          <blockquote>
            <p>Get Phame — Privacy Team<br/>Stephen Kinzey<br/>SK America LLC<br/>255 N D St, Suite 200XIX<br/>San Bernardino, CA 92401<br/>United States<br/>909 644-9828<br/><a href="mailto:steve@sk-america.com">steve@sk-america.com</a></p>
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
            <a href="/privacy-policy" className="text-primary font-medium">Privacy</a>
            <a href="/terms-of-service" className="text-muted-foreground hover:text-white transition-colors">Terms</a>
            <a href="mailto:support@getphame.app" className="text-muted-foreground hover:text-white transition-colors">Support</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Get Phame. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
