import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../client/public/locales/en/translation.json", import.meta.url);
const catalog = JSON.parse(await readFile(file, "utf8"));

catalog.legal = {
  contactHeading: "Contact us",
  terms: {
    title: "Terms of Service",
    lastUpdated: "Last updated: July 24, 2026",
    contactIntro: "Questions about these Terms, your account, or a payment can be sent to us using the contact details below.",
    contactResponse: "We aim to respond to account, billing, and legal questions within 30 calendar days.",
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptance of these Terms",
        paragraphs: [
          "These Terms of Service (the \"Terms\") govern your access to and use of the Get Phame web application, related websites, and services (collectively, the \"Service\"). By creating an account, signing in, purchasing a plan, or otherwise using the Service, you agree to these Terms and to our Privacy Policy.",
          "If you use the Service for a business or other legal entity, you represent that you have authority to bind that entity. If you do not agree to these Terms, do not use the Service."
        ]
      },
      {
        id: "service-and-plans",
        title: "2. Service, plans, and availability",
        paragraphs: [
          "Get Phame helps businesses organize customer contacts, manage review destinations, create review-request email campaigns, send messages through a connected email account, schedule measured follow-ups, and review delivery and engagement activity.",
          "The Free plan includes 10 initial review requests and then 5 review requests in each rolling 30-day period. Paid plans, including monthly, annual, and lifetime options when available, provide the features and request allowances shown at checkout or in the app. Current pricing, taxes, renewal terms, and plan details are presented before you authorize a purchase.",
          "We may change, add, remove, or limit features and plans. A change to a recurring plan's price will take effect no earlier than the next renewal after reasonable notice, unless a shorter period is required or permitted by law."
        ]
      },
      {
        id: "accounts-and-access",
        title: "3. Accounts and sign-in",
        paragraphs: [
          "You must be at least 18 years old and able to form a binding agreement to use the Service. You are responsible for accurate account information, protecting access to your email inbox and devices, and all activity performed through your account.",
          "You may sign in using Google OAuth, Sign in with Apple, a passwordless email magic link, or another method we make available. Get Phame does not require or store a password for these sign-in methods. If you enable a passkey, your device or password manager handles the credential; we do not receive your biometric data.",
          "Notify us promptly if you believe your account or a connected email account has been accessed without authorization. We may suspend or restrict an account when reasonably necessary to protect the Service, users, recipients, or applicable law."
        ]
      },
      {
        id: "your-responsibilities",
        title: "4. Your business, customer data, and connected accounts",
        paragraphs: [
          "You are responsible for the customer data, review links, email content, and connected email account you use with the Service. You represent that you have the necessary rights, notices, and permissions to upload customer data and contact recipients.",
          "You must keep your review destinations accurate and may not use the Service to impersonate another person or business, send deceptive messages, or direct recipients to harmful or unlawful content."
        ]
      },
      {
        id: "acceptable-use",
        title: "5. Acceptable use and review-request compliance",
        paragraphs: [
          "Use the Service only for lawful, respectful, relationship-based customer communication. You must comply with all laws and rules that apply to you and your recipients, including applicable anti-spam, privacy, consumer-protection, review-platform, and electronic-communications requirements.",
          "You are the sender of record for messages sent through your connected email account. You are responsible for obtaining any required consent, honoring opt-outs and unsubscribe requests, identifying your business accurately, and including any required physical address or other disclosures."
        ],
        bullets: [
          "Do not use purchased, rented, scraped, or third-party lists without a lawful basis to contact each recipient.",
          "Do not send unsolicited bulk email, harass recipients, bypass rate limits, or contact people who have opted out.",
          "Do not offer incentives for positive reviews, filter or gate customers based on expected sentiment, or otherwise manipulate reviews in a way that violates a platform's rules or applicable law.",
          "Do not upload malware, probe the Service, evade security controls, or use the Service to infringe another party's rights."
        ]
      },
      {
        id: "third-party-services",
        title: "6. Third-party services and destinations",
        paragraphs: [
          "The Service can connect with or link to third-party services, such as Google, Apple, email providers, WooCommerce, Stripe, PayPal, and review platforms. Your use of those services remains subject to their separate terms, privacy notices, and technical requirements.",
          "Get Phame does not control third-party platforms or guarantee that a review platform, email provider, or payment provider will accept, deliver, publish, preserve, or display any message, review, payment, or account."
        ]
      },
      {
        id: "payments",
        title: "7. Payments, renewals, cancellations, and refunds",
        paragraphs: [
          "Paid plans may be processed by Stripe or PayPal. By completing checkout, you authorize the selected processor to charge the disclosed amount, including applicable taxes, according to the billing schedule presented to you. Get Phame does not store full payment card numbers or card security codes.",
          "Monthly and annual plans renew automatically unless you cancel before the next renewal date. Lifetime plans are one-time purchases and do not renew. You can manage or cancel a recurring subscription through the applicable billing flow or by contacting us before renewal.",
          "Except where required by law or expressly stated at checkout, payments are non-refundable. Cancelling a recurring plan prevents future renewals; you retain paid access through the end of the then-current billing period unless we state otherwise."
        ]
      },
      {
        id: "data-and-security",
        title: "8. Data, email credentials, and security",
        paragraphs: [
          "Our Privacy Policy explains how we collect, use, retain, and protect information. You remain the controller of customer contact information you upload, while Get Phame processes it to provide the Service on your behalf.",
          "When you connect an SMTP account, you authorize us to use those credentials to send the messages you initiate. SMTP passwords are encrypted before storage. You can disconnect a connected email account in Settings, which removes the stored credentials from our active systems."
        ]
      },
      {
        id: "service-changes",
        title: "9. Service changes and availability",
        paragraphs: [
          "We work to keep the Service available and secure, but it may be interrupted for maintenance, updates, provider outages, security events, or circumstances outside our reasonable control. We do not guarantee uninterrupted or error-free operation, delivery, inbox placement, review publication, or a particular business outcome.",
          "You should maintain appropriate backups of information that is important to your business and review campaign operations."
        ]
      },
      {
        id: "intellectual-property",
        title: "10. Intellectual property",
        paragraphs: [
          "The Service, including its software, branding, design, and content, is owned by Get Phame or its licensors and is protected by applicable intellectual-property laws. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable right to use the Service for your internal business purposes.",
          "You retain ownership of the content and data you submit. You grant us the limited rights needed to host, process, transmit, and display that content solely to operate and improve the Service."
        ]
      },
      {
        id: "termination",
        title: "11. Suspension and termination",
        paragraphs: [
          "You may stop using the Service at any time. We may suspend or terminate access if you materially breach these Terms, create risk or legal exposure for us or others, fail to pay amounts due, or use the Service in a way that harms recipients or the Service.",
          "After termination, provisions that by their nature should survive will survive, including those concerning payments already due, intellectual property, disclaimers, liability limits, indemnity, and dispute terms."
        ]
      },
      {
        id: "disclaimers",
        title: "12. Disclaimers and limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, the Service is provided \"as is\" and \"as available\" without warranties of any kind, whether express, implied, or statutory. We disclaim implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.",
          "To the maximum extent permitted by law, Get Phame and its operators, affiliates, and licensors will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, goodwill, data, or business opportunities. Our aggregate liability arising out of or relating to the Service will not exceed the amount you paid us for the Service in the 12 months before the event giving rise to liability, or US$100 if you paid nothing."
        ]
      },
      {
        id: "indemnity-and-changes",
        title: "13. Indemnity, changes, and governing law",
        paragraphs: [
          "You will defend, indemnify, and hold harmless Get Phame and its operators, affiliates, and licensors from claims, damages, losses, liabilities, and expenses arising from your customer data, messages, review practices, violation of law, or breach of these Terms.",
          "We may update these Terms from time to time. We will post the updated version and revise the date above. If you continue to use the Service after the effective date, you accept the updated Terms. These Terms are governed by the laws applicable to the operator of the Service, without regard to conflict-of-laws principles, except where mandatory consumer law provides otherwise."
        ]
      }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: July 24, 2026",
    contactIntro: "Questions, data-rights requests, or concerns about this Privacy Policy can be sent to us using the contact details below.",
    contactResponse: "We aim to respond to privacy-related requests within 30 calendar days and may need to verify your identity before completing a request.",
    sections: [
      {
        id: "introduction",
        title: "1. Introduction",
        paragraphs: [
          "This Privacy Policy explains how Get Phame collects, uses, shares, retains, and protects information when you use our web application and related services. The Service helps businesses send review-request emails through their own connected email accounts.",
          "This Policy applies to account holders and to customer contact information that account holders upload or connect to the Service. Account holders are responsible for their own notices and legal basis for providing customer data to us."
        ]
      },
      {
        id: "information-collected",
        title: "2. Information we collect",
        paragraphs: [
          "Account and authentication information. When you sign in with Google OAuth, Sign in with Apple, or a passwordless email magic link, we receive and store the information necessary to create and secure your account, such as your name, email address, provider account identifier, and session information. We do not receive or store your Google or Apple account password. If you use a passkey, we store only the public credential data needed to verify sign-in; we do not receive biometric data.",
          "Business, customer, and campaign information. You may provide your business profile, review-destination links, email templates, customer names and email addresses, campaign history, unsubscribe status, and related operational information. You may enter customer contacts manually, import them from a CSV file, or connect an approved integration such as WooCommerce or Stripe.",
          "Connected email information. To send messages on your behalf, you may provide SMTP host, port, email address, and an app-specific password or other email credential. Credentials are encrypted before storage and used only to send messages you initiate or to perform the connection-health checks described in this Policy.",
          "Usage, security, and email-engagement information. We may log account activity, request counts, device and browser information, IP-derived country or region, and security events. Review-request emails may include an open-tracking pixel and click-tracking redirect. When a recipient interacts with a tracked email, we record the event, timestamp, approximate IP-derived geography, and user-agent information for the account holder's campaign analytics.",
          "Payment information. When you buy a paid plan, payment processing is handled by Stripe or PayPal. We receive transaction and subscription details needed to provide access and support billing. We do not store full payment card numbers or card security codes."
        ]
      },
      {
        id: "use",
        title: "3. How we use information",
        paragraphs: [
          "We use information to provide, maintain, secure, and improve the Service; authenticate users; create and manage accounts; send the emails you initiate; operate reminders and campaign analytics; process payments; respond to support requests; prevent abuse; and comply with legal obligations.",
          "We do not sell customer contact data or use it to independently market to your customers. We do not read, index, or store the contents of your existing inbox, sent mail, or other mailbox data."
        ]
      },
      {
        id: "legal-bases",
        title: "4. Legal bases for processing",
        paragraphs: [
          "Where GDPR or similar law applies, we process account, business, and campaign information to perform our contract with you; process security, reliability, and limited usage information for our legitimate interests in operating a safe and reliable service; process certain records to comply with legal obligations; and rely on consent where required by law.",
          "If you provide customer data, you are responsible for identifying and documenting the legal basis that permits you to collect, use, and share that information for review-request communication."
        ]
      },
      {
        id: "sharing",
        title: "5. How we share information",
        paragraphs: [
          "We share information only as needed to operate the Service, comply with law, protect rights and safety, or complete a transaction you request. Recipients may include infrastructure and storage providers, email-delivery and support providers, payment processors, and the integrations you choose to connect.",
          "Stripe and PayPal process payment information under their own privacy notices. Google and Apple process sign-in information under their own privacy notices. We may disclose information in response to a lawful request or to protect the rights, property, and safety of Get Phame, users, recipients, or the public."
        ]
      },
      {
        id: "customer-data-and-tracking",
        title: "6. Customer data, email tracking, and opt-outs",
        paragraphs: [
          "Account holders are the controllers of the customer contact data and engagement information associated with their campaigns. Get Phame acts as a processor of that information to provide the Service on the account holder's instructions.",
          "Open and click tracking is used to display campaign activity to the account holder. Each account holder is responsible for providing required notices, honoring unsubscribe requests, and using tracking in accordance with applicable law. Recipients who use an unsubscribe link are excluded from future sends by that account."
        ]
      },
      {
        id: "retention",
        title: "7. Data retention and deletion",
        paragraphs: [
          "We retain account, business, customer, campaign, and security information for as long as your account is active and as needed to provide the Service. You can delete customer contacts and disconnect an SMTP account in the app. Disconnecting removes stored email credentials from our active systems.",
          "When you delete your account or make a verified deletion request, we will remove personal data from active systems within 30 days unless a longer retention period is required or permitted for legal, security, dispute-resolution, or financial-record purposes."
        ]
      },
      {
        id: "security",
        title: "8. Security",
        paragraphs: [
          "We use reasonable administrative, technical, and organizational safeguards designed to protect information, including encrypted storage for SMTP credentials, TLS in transit, access controls, session protections, rate limiting, and HTTP security headers. No system can be guaranteed completely secure; please contact us promptly if you suspect unauthorized access."
        ]
      },
      {
        id: "rights",
        title: "9. Your privacy rights",
        paragraphs: [
          "Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or receive a portable copy of personal data, and to withdraw consent where consent is the legal basis. You may also have the right to lodge a complaint with a supervisory authority.",
          "To exercise a right, contact us using the details below. We may ask for information necessary to verify your identity and authority before acting on a request."
        ]
      },
      {
        id: "cookies",
        title: "10. Cookies and session data",
        paragraphs: [
          "We use essential, secure session cookies and local storage that are necessary to keep you signed in, protect the Service, remember app settings such as language, and support the sign-in methods you select. We do not use third-party advertising cookies to track you across websites."
        ]
      },
      {
        id: "children",
        title: "11. Children's privacy",
        paragraphs: [
          "The Service is a business tool for adults and is not directed to children under 18. We do not knowingly collect personal information from children. If you believe a child has provided personal information to us, contact us and we will take appropriate steps to delete it."
        ]
      },
      {
        id: "transfers",
        title: "12. International transfers",
        paragraphs: [
          "Get Phame may process information in the United States and other countries where we or our service providers operate. Those countries may have data-protection laws that differ from those in your country. Where required, we use appropriate safeguards for international transfers."
        ]
      },
      {
        id: "changes",
        title: "13. Changes to this Privacy Policy",
        paragraphs: [
          "We may update this Privacy Policy to reflect changes in our practices, technology, legal requirements, or the Service. We will post the revised policy and update the date above. If a change is material, we will provide additional notice when reasonably appropriate."
        ]
      }
    ]
  }
};

await writeFile(file, `${JSON.stringify(catalog, null, 2)}\n`);
