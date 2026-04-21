import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

const TH_ADDRESS = (
  <>
    Michael Kiattanabumroong<br />
    BotflowLab.com<br />
    88/14 Phuttomonthon Sai 2 Soi 31<br />
    Sala Thammasop, Thawi Wattana<br />
    Bangkok 10170<br />
    Thailand<br />
    +66 6-3094-9914<br />
    michael@botflowlab.com
  </>
);

const US_ADDRESS = (
  <>
    Stephen Kinzey<br />
    SK America LLC<br />
    255 N D St, Suite 200XIX<br />
    San Bernardino, CA 92401<br />
    United States<br />
    909 644-9828<br />
    steve@sk-america.com
  </>
);

const SECTION_HEADING = "text-base font-bold mb-3";
const SECTION_HEADING_STYLE = { fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" };
const BODY_STYLE = { color: "oklch(0.30 0.05 260)" };
const LINK_STYLE = { color: "oklch(0.50 0.18 260)" };

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();
  const [isThai, setIsThai] = useState(false);
  useEffect(() => {
    setIsThai(localStorage.getItem('rr-lang') === 'th');
  }, []);
  const ADDR = isThai ? TH_ADDRESS : US_ADDRESS;
  const CONTACT_EMAIL = isThai ? 'michael@botflowlab.com' : 'steve@sk-america.com';

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen pb-40" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 mb-4 text-sm"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1
          className="text-2xl"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
        >
          Privacy Policy
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.75 0.05 260)" }}>
          Last updated: April 13, 2026
        </p>
      </div>

      {/* Content */}
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-7 text-sm leading-relaxed pb-40" style={BODY_STYLE}>

        {/* Intro */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>1. Introduction</h2>
          <p className="mb-3">
            ReviewLink ("we," "our," or "us") is a web application that helps small businesses collect customer reviews by sending personalised review request emails through the business owner's own email account. This Privacy Policy describes how we collect, use, store, and protect information when you use the ReviewLink service (the "Service"), and explains the rights you have over your data.
          </p>
          <p>
            By creating an account and using the Service, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with any part of this policy, please discontinue use of the Service. This policy applies to all users of ReviewLink, including business owners who register for an account and the customers whose contact information is uploaded to the Service.
          </p>
        </section>

        {/* Who We Are */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>2. Who We Are and How to Contact Us</h2>
          <p className="mb-3">
            ReviewLink is operated as a software-as-a-service product. For all privacy-related inquiries, data deletion requests, or concerns about this policy, you may contact us at:
          </p>
          <address className="not-italic leading-relaxed pl-3 border-l-2" style={{ borderColor: "oklch(0.80 0.18 80)" }}>
            <span translate="no">
              ReviewLink<br />
              {ADDR}<br />
            </span>
            <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>{CONTACT_EMAIL}</a>
          </address>
          <p className="mt-3">
            We aim to respond to all privacy-related requests within 30 calendar days.
          </p>
        </section>

        {/* Information We Collect */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>3. Information We Collect</h2>
          <p className="mb-3">We collect information in three ways: information you provide directly, information generated automatically when you use the Service, and information about your customers that you upload to the Service.</p>

          <h3 className="font-bold mb-1.5 mt-3" style={{ color: "oklch(0.22 0.09 260)" }}>3.1 Information You Provide</h3>
          <p className="mb-2">
            <strong>Account information.</strong> When you sign in via Google OAuth, we receive your name and email address from Google. We do not receive or store your Google account password.
          </p>
          <p className="mb-2">
            <strong>Business profile.</strong> You may enter your business name, a display name for outgoing emails, and links to your review platforms (e.g., Google Business, Yelp, TripAdvisor). This information is stored in your account and used to personalise the emails sent through the Service.
          </p>
          <p className="mb-2">
            <strong>SMTP credentials.</strong> To send emails on your behalf, you must provide your outgoing mail server details: the SMTP host, port, your email address, and an app-specific password. Your password is encrypted using AES-256-GCM before it is written to our database and is never stored in plain text. It is never logged, displayed in full, or transmitted to any third party.
          </p>
          <p>
            <strong>Customer contact data.</strong> You may manually enter, import via CSV, or sync from WooCommerce or Stripe the names and email addresses of your customers. This data is stored in your account and used exclusively to send review request emails that you initiate. We do not use your customers' contact information for any other purpose.
          </p>

          <h3 className="font-bold mb-1.5 mt-4" style={{ color: "oklch(0.22 0.09 260)" }}>3.2 Information Generated Automatically</h3>
          <p className="mb-2">
            <strong>Email tracking events.</strong> Each review request email contains a 1×1 tracking pixel and a click-tracking redirect link. When a recipient opens the email or clicks the review link, we record the event timestamp, the approximate IP address (used only to determine country-level geography), and the email client's user agent string. This data is associated with the specific review request in your account and displayed to you as open and click analytics. We do not use this data to build profiles of your customers or share it with third parties.
          </p>
          <p className="mb-2">
            <strong>SMTP health data.</strong> We perform periodic automated checks to verify that your connected email account is still reachable. The result of each check (success or failure, and any error message returned by the mail server) is stored in your account so you can diagnose connection issues.
          </p>
          <p>
            <strong>Usage data.</strong> We record the number of review requests sent per month per account for operational purposes (rate limiting, capacity planning). We do not sell or share this data.
          </p>

          <h3 className="font-bold mb-1.5 mt-4" style={{ color: "oklch(0.22 0.09 260)" }}>3.3 Information We Do Not Collect</h3>
          <p>
            We do not read, index, or store the contents of your existing emails, your inbox, your sent folder, or any other mailbox data. Your SMTP credentials are used exclusively to send outbound emails you explicitly initiate through the Service. We have no access to your email history.
          </p>
        </section>

        {/* How We Use Your Information */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>4. How We Use Your Information</h2>
          <p className="mb-2">We use the information we collect for the following purposes:</p>
          <p className="mb-2">
            <strong>Providing the Service.</strong> Your account information, business profile, SMTP credentials, and customer contact data are used to operate the core functionality of ReviewLink — composing and sending personalised review request emails from your email account to your customers.
          </p>
          <p className="mb-2">
            <strong>Analytics and reporting.</strong> Email tracking events (opens, clicks) are used to generate the analytics displayed in your account dashboard. This helps you understand which customers have engaged with your review requests.
          </p>
          <p className="mb-2">
            <strong>Service reliability.</strong> SMTP health check results are used to alert you when your email connection stops working, so you can reconnect before review requests fail silently.
          </p>
          <p className="mb-2">
            <strong>Security and fraud prevention.</strong> We use rate limiting and usage data to prevent abuse of the Service, including sending unsolicited bulk email.
          </p>
          <p>
            <strong>Legal compliance.</strong> We may retain certain records to comply with applicable laws, resolve disputes, and enforce our Terms of Service.
          </p>
        </section>

        {/* Legal Basis */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>5. Legal Basis for Processing (GDPR)</h2>
          <p className="mb-2">
            If you are located in the European Economic Area (EEA) or United Kingdom, we process your personal data under the following legal bases:
          </p>
          <p className="mb-2">
            <strong>Contract performance.</strong> Processing your account information, business profile, SMTP credentials, and customer data is necessary to provide the Service you have signed up for.
          </p>
          <p className="mb-2">
            <strong>Legitimate interests.</strong> We process usage data and SMTP health data based on our legitimate interest in operating a reliable and secure service.
          </p>
          <p>
            <strong>Legal obligation.</strong> We may process data where required to comply with applicable law, including responding to valid legal requests from authorities.
          </p>
        </section>

        {/* Data Sharing */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>6. Data Sharing and Third Parties</h2>
          <p className="mb-3">
            We do not sell, rent, or trade your personal information or your customers' contact data to any third party. We share data only in the following limited circumstances:
          </p>
          <p className="mb-2">
            <strong>Infrastructure providers.</strong> We use cloud infrastructure providers to host the Service and store data. These providers process data on our behalf under data processing agreements and are contractually prohibited from using your data for their own purposes.
          </p>
          <p className="mb-2">
            <strong>Stripe.</strong> If you make a payment for a premium plan, your payment is processed by Stripe, Inc. We share only the information necessary to complete the transaction (your name, email, and the plan selected). Stripe's own privacy policy governs how they handle your payment data. We do not store full card numbers or CVV codes.
          </p>
          <p className="mb-2">
            <strong>WooCommerce / Stripe customer sync.</strong> If you choose to sync customers from your WooCommerce store or Stripe account, we retrieve only the name and email address of each customer via the API credentials you provide. We do not store your WooCommerce or Stripe API keys beyond the duration of the sync operation.
          </p>
          <p>
            <strong>Legal requirements.</strong> We may disclose your information if required to do so by law, court order, or governmental authority, or if we believe in good faith that such disclosure is necessary to protect the rights, property, or safety of ReviewLink, our users, or the public.
          </p>
        </section>

        {/* Email Tracking Disclosure */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>7. Email Tracking and Your Customers' Privacy</h2>
          <p className="mb-3">
            Review request emails sent through ReviewLink contain a tracking pixel (a small invisible image) and a click-tracking redirect link. When a recipient opens the email or clicks the review link, ReviewLink records the event so you can see delivery analytics in your dashboard.
          </p>
          <p className="mb-3">
            As the business owner using ReviewLink, you are the data controller for your customers' contact information and for the tracking data generated when they interact with your emails. You are responsible for ensuring that your use of email tracking complies with applicable laws in your jurisdiction, including GDPR, CASL, and any other applicable privacy regulations.
          </p>
          <p>
            Tracking data (open/click events) is stored only in your account, is visible only to you, and is not shared with or sold to any third party. We retain this data for as long as your account is active. You may request deletion of all tracking data by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>{CONTACT_EMAIL}</a>.
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>8. Data Retention</h2>
          <p className="mb-2">
            We retain your account data, business profile, customer contacts, and email tracking records for as long as your account remains active. If you delete your account or request data deletion, we will remove your personal data from our active systems within 30 days. Certain records may be retained for a longer period where required by law (e.g., financial transaction records).
          </p>
          <p>
            You may delete individual customer contacts at any time from the Contacts screen within the app. You may disconnect your SMTP account at any time from the Settings screen, which permanently removes your stored credentials from our database.
          </p>
        </section>

        {/* Security */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>9. Data Security</h2>
          <p className="mb-2">
            We take the security of your data seriously and implement the following measures:
          </p>
          <p className="mb-2">
            <strong>Encryption at rest.</strong> SMTP passwords are encrypted using AES-256-GCM before storage. Database connections use TLS in transit.
          </p>
          <p className="mb-2">
            <strong>Encryption in transit.</strong> All communication between your browser and our servers is encrypted using HTTPS/TLS.
          </p>
          <p className="mb-2">
            <strong>Access controls.</strong> Access to production systems is restricted to authorised personnel only. We do not have a mechanism to view your SMTP password in plain text.
          </p>
          <p className="mb-2">
            <strong>HTTP security headers.</strong> Our servers apply standard HTTP security headers (including X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, and Referrer-Policy) on all responses.
          </p>
          <p>
            No method of transmission over the internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security. If you believe your account has been compromised, please contact us immediately at <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>{CONTACT_EMAIL}</a>.
          </p>
        </section>

        {/* Your Rights */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>10. Your Rights</h2>
          <p className="mb-3">
            Depending on your location, you may have the following rights regarding your personal data:
          </p>
          <p className="mb-2">
            <strong>Right of access.</strong> You may request a copy of the personal data we hold about you.
          </p>
          <p className="mb-2">
            <strong>Right to rectification.</strong> You may update or correct inaccurate information directly within the app (Settings screen) or by contacting us.
          </p>
          <p className="mb-2">
            <strong>Right to erasure.</strong> You may request deletion of your account and all associated personal data. We will process deletion requests within 30 days.
          </p>
          <p className="mb-2">
            <strong>Right to data portability.</strong> You may request an export of your customer contact list and review request history in a machine-readable format.
          </p>
          <p className="mb-2">
            <strong>Right to object.</strong> You may object to processing of your personal data where we rely on legitimate interests as the legal basis.
          </p>
          <p className="mb-3">
            <strong>Right to withdraw consent.</strong> Where processing is based on consent, you may withdraw consent at any time without affecting the lawfulness of processing before withdrawal.
          </p>
          <p>
            To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>{CONTACT_EMAIL}</a>. We may need to verify your identity before processing certain requests.
          </p>
          <p className="mt-2">
            If you are located in the EEA or UK and believe we have not addressed your concerns adequately, you have the right to lodge a complaint with your local data protection supervisory authority.
          </p>
        </section>

        {/* CAN-SPAM */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>11. CAN-SPAM Act and Anti-Spam Compliance</h2>
          <p className="mb-2">
            ReviewLink is a tool that sends transactional and relationship-based emails on behalf of its users. As a user of the Service, you are the sender of record for all emails transmitted through your connected email account. You are solely responsible for ensuring that your use of the Service complies with the CAN-SPAM Act (US), GDPR (EU), CASL (Canada), and any other applicable anti-spam or data protection laws in your jurisdiction.
          </p>
          <p className="mb-2">
            All review request emails sent through the Service include a clear identification of the sender (your business name and email address) and an unsubscribe mechanism. You must only send emails to individuals with whom you have a genuine, prior business relationship. You must not use the Service to send unsolicited bulk email or to contact individuals who have previously opted out or unsubscribed.
          </p>
          <p>
            ReviewLink does not send marketing emails to your customers independently. All sends are initiated by you. ReviewLink is not liable for your failure to comply with applicable email laws. See our Terms of Service for full details of your responsibilities as a sender.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>12. Cookies and Session Data</h2>
          <p className="mb-2">
            ReviewLink uses a single, HTTP-only session cookie to maintain your login state after you authenticate via Google OAuth. This cookie is essential for the operation of the Service and cannot be disabled without preventing you from using the app. It does not track you across other websites and is not used for advertising purposes.
          </p>
          <p>
            We do not use third-party advertising cookies, analytics cookies, or any other non-essential cookies. We do not use Google Analytics or similar tracking services.
          </p>
        </section>

        {/* Children */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>13. Children's Privacy</h2>
          <p>
            ReviewLink is a business tool intended for use by adults aged 18 and over. We do not knowingly collect personal information from individuals under the age of 18. If you believe a minor has provided us with personal information, please contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>{CONTACT_EMAIL}</a> and we will delete that information promptly.
          </p>
        </section>

        {/* International Transfers */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>14. International Data Transfers</h2>
          <p>
            ReviewLink is operated from the United States. If you are accessing the Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States, where data protection laws may differ from those in your country. By using the Service, you consent to the transfer of your information to the United States. Where required by law (e.g., for EEA users), we rely on appropriate safeguards such as Standard Contractual Clauses for international data transfers.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>15. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will update the "Last updated" date at the top of this page. If the changes are significant, we will make reasonable efforts to notify you — for example, by displaying a notice within the app. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the updated policy. We encourage you to review this page periodically.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>16. Contact Us</h2>
          <p className="mb-3">
            If you have any questions, concerns, or requests relating to this Privacy Policy or our data practices, please contact our privacy team:
          </p>
          <address className="not-italic leading-relaxed pl-3 border-l-2" style={{ borderColor: "oklch(0.80 0.18 80)" }}>
            <span translate="no">
              ReviewLink — Privacy Team<br />
              {ADDR}<br />
            </span>
            <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>{CONTACT_EMAIL}</a>
          </address>
          <p className="mt-3">
            We aim to respond to all privacy-related inquiries within 30 calendar days. For urgent security concerns, please include "URGENT" in the subject line.
          </p>
        </section>

      </div>
    </div>
  );
}
