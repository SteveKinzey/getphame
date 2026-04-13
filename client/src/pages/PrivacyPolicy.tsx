import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.975 0.003 100)" }}>
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
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6 text-sm leading-relaxed pb-32" style={{ color: "oklch(0.30 0.05 260)" }}>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            1. Introduction
          </h2>
          <p>
            ReviewLink ("we," "our," or "us") operates the ReviewLink web application (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. By using ReviewLink, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            2. Information We Collect
          </h2>
          <p className="mb-2">We collect the following types of information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account information:</strong> Your name and email address provided when you sign in.</li>
            <li><strong>Business profile:</strong> Your business name, review platform links, and other profile details you enter in the app.</li>
            <li><strong>SMTP credentials:</strong> Your outgoing email server credentials (email address and app password) that allow the app to send emails on your behalf. Passwords are stored encrypted using AES-256-GCM and are never transmitted in plain text.</li>
            <li><strong>Customer data:</strong> Names and email addresses of customers you enter to send review requests. This data is stored in our database and used only to send the requested emails.</li>
            <li><strong>Usage data:</strong> Information about how you use the Service, including the number of review requests sent.</li>
            <li><strong>Email tracking data:</strong> Anonymised open and click events (timestamp, approximate IP address, user agent) recorded when your customers interact with review request emails. This data is used solely to provide you with delivery analytics within the app.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            3. How We Use Your Email Credentials
          </h2>
          <p className="mb-2">
            ReviewLink uses your SMTP credentials solely to send review request emails to your customers on your behalf. Specifically, we use your credentials to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Send emails from your email address to customers you specify</li>
            <li>Verify that your email connection is working correctly (daily health check)</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> read, store, or process any of your existing email messages, contacts, or other mailbox data. Your credentials are used exclusively for sending outbound emails you explicitly initiate through the app.
          </p>
          <p className="mt-2">
            Your SMTP password is encrypted with AES-256-GCM before storage and is never logged or shared with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            4. CAN-SPAM Act Compliance
          </h2>
          <p className="mb-2">
            ReviewLink is a tool that sends emails on behalf of its users. As a user of the Service, you are the sender of record for all emails transmitted through your connected email account. You are solely responsible for ensuring your use of the Service complies with the CAN-SPAM Act (US), GDPR (EU), CASL (Canada), and any other applicable anti-spam or data protection laws in your jurisdiction.
          </p>
          <p>
            In accordance with the CAN-SPAM Act, all review request emails sent through the Service include a clear identification of the sender and an unsubscribe mechanism. You must only send emails to individuals who have a genuine, prior business relationship with you. ReviewLink does not send marketing emails to your customers independently — all sends are initiated by you.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            5. Data Storage and Security
          </h2>
          <p>
            Your data is stored in a secure, encrypted database. SMTP credentials are encrypted at rest and are never shared with third parties. We implement industry-standard security measures to protect your information against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            6. Data Sharing
          </h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share data with:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Stripe:</strong> For payment processing. Stripe's privacy policy governs their use of your payment data.</li>
            <li><strong>Service providers:</strong> Infrastructure providers who help us operate the Service, bound by confidentiality agreements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            7. Your Rights and Data Deletion
          </h2>
          <p>
            You may disconnect your email account at any time from the Settings screen, which removes your stored SMTP credentials. You may request deletion of all your data by contacting us at the email below. We will process deletion requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            8. Children's Privacy
          </h2>
          <p>
            ReviewLink is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            9. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            10. Contact Us
          </h2>
          <p className="mb-2">
            If you have questions about this Privacy Policy or our data practices, please contact us at:{" "}
            <a href="mailto:privacy@reviewlink.app" style={{ color: "oklch(0.50 0.18 260)" }}>
              privacy@reviewlink.app
            </a>
          </p>
          <p className="font-medium" style={{ color: "oklch(0.22 0.09 260)" }}>Mailing address:</p>
          <address className="not-italic mt-1 leading-relaxed">
            ReviewLink<br />
            255 N D St, Suite 200XIX<br />
            San Bernardino, CA 92401<br />
            United States
          </address>
        </section>

      </div>
    </div>
  );
}
