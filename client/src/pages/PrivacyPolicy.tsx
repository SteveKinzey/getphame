import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/")}
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
          Last updated: April 2, 2026
        </p>
      </div>

      {/* Content */}
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6 text-sm leading-relaxed" style={{ color: "oklch(0.30 0.05 260)" }}>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            1. Introduction
          </h2>
          <p>
            ReviewLink ("we," "our," or "us") operates the ReviewLink mobile web application (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. By using ReviewLink, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            2. Information We Collect
          </h2>
          <p className="mb-2">We collect the following types of information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account information:</strong> Your name and email address provided when you sign in with Google.</li>
            <li><strong>Business profile:</strong> Your business name, Google review link, and other profile details you enter in the app.</li>
            <li><strong>Gmail access tokens:</strong> OAuth tokens that allow the app to send emails on your behalf. These are stored securely and used solely to send review request emails to your customers.</li>
            <li><strong>Customer data:</strong> Names and email addresses of customers you enter to send review requests. This data is stored in our database and used only to send the requested emails.</li>
            <li><strong>Usage data:</strong> Information about how you use the Service, including the number of review requests sent per month.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            3. How We Use Gmail Access
          </h2>
          <p className="mb-2">
            ReviewLink requests access to your Gmail account solely to send review request emails to your customers on your behalf. Specifically, we use the <strong>Gmail API send scope</strong> (<code>https://www.googleapis.com/auth/gmail.send</code>) which allows us to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Send emails from your Gmail address to customers you specify</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> read, store, or process any of your existing Gmail messages, contacts, or other Gmail data. Our use of Gmail API data is limited to sending outbound emails you explicitly initiate through the app.
          </p>
          <p className="mt-2">
            ReviewLink's use and transfer of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "oklch(0.50 0.18 260)" }}
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            4. Data Storage and Security
          </h2>
          <p>
            Your data is stored in a secure, encrypted database. Gmail OAuth tokens are stored securely and are never shared with third parties. We implement industry-standard security measures to protect your information against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            5. Data Sharing
          </h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share data with:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Stripe:</strong> For payment processing. Stripe's privacy policy governs their use of your payment data.</li>
            <li><strong>Google:</strong> To authenticate your account and send emails via the Gmail API.</li>
            <li><strong>Service providers:</strong> Infrastructure providers who help us operate the Service, bound by confidentiality agreements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            6. Your Rights and Data Deletion
          </h2>
          <p>
            You may disconnect your Gmail account at any time from the Settings screen, which revokes our access and deletes your stored OAuth tokens. You may request deletion of all your data by contacting us at the email below. We will process deletion requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            7. Children's Privacy
          </h2>
          <p>
            ReviewLink is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            8. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            9. Contact Us
          </h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact us at:{" "}
            <a href="mailto:privacy@reviewlink.app" style={{ color: "oklch(0.50 0.18 260)" }}>
              privacy@reviewlink.app
            </a>
          </p>
        </section>

      </div>
    </div>
  );
}
