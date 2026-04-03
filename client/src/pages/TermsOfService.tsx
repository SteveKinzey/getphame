import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
          style={{ color: "white", fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Terms of Service
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.75 0.05 260)" }}>
          Last updated: April 2, 2026
        </p>
      </div>

      {/* Content */}
      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6 text-sm leading-relaxed" style={{ color: "oklch(0.30 0.05 260)" }}>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using ReviewLink (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms apply to all users of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            2. Description of Service
          </h2>
          <p>
            ReviewLink is a mobile web application that helps small business owners send review request emails to their customers via their connected Gmail account. The Service includes a free tier (up to 10 requests per month) and a paid Pro tier ($29/month) with unlimited requests and additional features.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            3. User Accounts
          </h2>
          <p>
            You must sign in with a valid Google account to use the Service. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            4. Acceptable Use
          </h2>
          <p className="mb-2">You agree to use the Service only for lawful purposes. You must not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Send unsolicited emails (spam) to individuals who have not had a genuine business interaction with you</li>
            <li>Use the Service to harass, threaten, or deceive any person</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
            <li>Use the Service in any way that violates applicable laws or regulations, including CAN-SPAM, GDPR, or CASL</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its related systems</li>
          </ul>
          <p className="mt-2">
            You are solely responsible for ensuring that recipients of your review request emails have a legitimate prior relationship with your business and that your use complies with all applicable anti-spam laws.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            5. Gmail Integration
          </h2>
          <p>
            By connecting your Gmail account, you authorize ReviewLink to send emails on your behalf using the Gmail API. You may revoke this authorization at any time from the Settings screen. You remain solely responsible for the content of emails sent through the Service and for compliance with all applicable laws governing email communications.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            6. Subscription and Billing
          </h2>
          <p>
            The Pro plan is billed at $29 per month. Subscriptions automatically renew unless cancelled before the renewal date. You may cancel your subscription at any time through the billing portal accessible from the Settings screen. Refunds are not provided for partial months. Payment is processed by Stripe, and you agree to Stripe's terms of service in addition to these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            7. Intellectual Property
          </h2>
          <p>
            The Service and its original content, features, and functionality are owned by ReviewLink and are protected by applicable intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            8. Disclaimer of Warranties
          </h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. We make no guarantees regarding the delivery of emails or the number of reviews you will receive as a result of using the Service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            9. Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by law, ReviewLink shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claims arising from these Terms or the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            10. Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service will immediately cease.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            11. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of material changes by updating the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            12. Governing Law
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: "oklch(0.22 0.09 260)" }}>
            13. Contact Us
          </h2>
          <p>
            If you have questions about these Terms, please contact us at:{" "}
            <a href="mailto:legal@reviewlink.app" style={{ color: "oklch(0.50 0.18 260)" }}>
              legal@reviewlink.app
            </a>
          </p>
        </section>

      </div>
    </div>
  );
}
