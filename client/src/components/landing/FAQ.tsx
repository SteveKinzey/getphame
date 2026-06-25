import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import FadeUp from "./FadeUp";

const faqs = [
  { question: "Will it look like spam?", answer: "No. Every email is sent directly from your own email address — not from a third-party server. Your customers see your name, your address, and your signature. It looks exactly like you sat down and typed it yourself. Open rates average 45–60% because recipients recognize the sender." },
  { question: "What email providers work?", answer: "Get Phame works with any email provider that supports SMTP: Gmail, Google Workspace, Outlook, Microsoft 365, Yahoo, Zoho, iCloud, and any custom SMTP server. If you can send email from it, you can connect it to Get Phame." },
  { question: "Is it really free?", answer: "Yes. The free plan gives you 10 review requests with no credit card required and no time limit. Use all 10 whenever you're ready. If you want unlimited requests, bulk send, follow-up reminders, and WooCommerce sync, upgrade to Pro." },
  { question: "Can I import my customer list?", answer: "Absolutely. Upload a CSV file with customer names and email addresses, or sync directly from WooCommerce. We validate emails automatically, remove duplicates, and flag any invalid addresses before you send." },
  { question: "Does Get Phame store my email password?", answer: "Your SMTP credentials are encrypted at rest using AES-256 encryption. We never store plain-text passwords. Your credentials are only used to send emails on your behalf — we cannot read your inbox or access any other email data." },
  { question: "Will my emails land in spam?", answer: "Because emails are sent from your own email account (not a bulk-sending server), they have the same deliverability as any email you'd send manually. Your domain reputation, SPF, and DKIM records all apply normally. This is a key advantage over third-party senders." },
  { question: "What happens to my customer list?", answer: "Your customer data is stored securely and is never shared, sold, or used for any purpose other than sending your review requests. You can export or delete your entire customer list at any time. We comply with GDPR and CAN-SPAM requirements." },
  { question: "Can customers opt out?", answer: "Yes. Every email includes an unsubscribe link. When a customer opts out, they're automatically removed from future sends. This keeps you compliant and protects your sender reputation." },
  { question: "Do I need technical skills to connect my email?", answer: "No. For Gmail and Outlook, we provide step-by-step guides with screenshots. Most users connect in under 60 seconds. For custom SMTP, you'll need your server address, port, and credentials — your hosting provider can supply these." },
  { question: "Which review platforms does it support?", answer: "Any platform with a review link: Google, Yelp, TripAdvisor, Facebook, Bing Places, Trustpilot, G2, Capterra, and more. Just paste your review link and we'll include it in every request. You can change platforms anytime." },
  { question: "How does WooCommerce sync work?", answer: "Install our free WooCommerce plugin, enter your API key, and new customers are automatically imported after each completed order. You can set a delay (e.g., 7 days after purchase) before they appear in your send queue." },
  { question: "What does unlimited mean on the Pro plan?", answer: "Unlimited means no cap on the number of review requests you can send per month. Send 50 or 5,000 — no extra charges. The only limit is your email provider's own sending limits (e.g., Gmail allows ~500/day for personal accounts, 2,000/day for Workspace)." },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-[oklch(0.12_0.025_250)]">
      <div className="container">
        <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
          <FadeUp className="lg:col-span-1">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              Questions about email safety, privacy & setup
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know before connecting your email and sending your first review request.
            </p>
          </FadeUp>

          <FadeUp delay={0.15} className="lg:col-span-2">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl px-5 md:px-6 data-[state=open]:border-primary/30 transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold text-white hover:text-primary py-4 md:py-5 text-sm md:text-base [&[data-state=open]>svg]:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-sm md:text-[15px]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
