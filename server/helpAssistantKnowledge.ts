export type HelpSource = {
  id: string;
  title: string;
  href: string;
  content: string;
  keywords: string[];
};

export type RetrievedHelpSource = Pick<HelpSource, "id" | "title" | "href" | "content"> & {
  score: number;
};

const HELP_SOURCES: HelpSource[] = [
  {
    id: "getting-started",
    title: "Get Phame setup",
    href: "/",
    content: "Set up Get Phame in three stages: connect and test a sending email, add at least one review destination in Settings, then open Send Request to contact an eligible customer. The onboarding guide can be reopened from the app if a setup step was skipped.",
    keywords: ["start", "setup", "onboarding", "begin", "first", "how", "ayuda", "empezar", "configurar", "aide", "commencer", "aiuto", "iniziare", "เริ่ม", "ตั้งค่า", "开始", "设置", "開始", "設定"],
  },
  {
    id: "email-connection",
    title: "Connect your sending email",
    href: "/settings",
    content: "Get Phame sends through the business email account the account owner connects. Settings provides guided provider detection, provider-specific credential guidance, a connection test, and a Custom SMTP fallback. Many providers require an app password instead of the normal mailbox password. Credentials are handled by the secure connection form; never paste a password, API key, or token into the help assistant.",
    keywords: ["email", "smtp", "gmail", "outlook", "microsoft", "yahoo", "zoho", "icloud", "password", "connect", "connection", "mail", "correo", "contraseña", "connexion", "mot", "passe", "collegare", "posta", "รหัสผ่าน", "อีเมล", "邮箱", "邮件", "密码", "郵箱", "郵件", "密碼"],
  },
  {
    id: "sending-requests",
    title: "Send an individual request",
    href: "/send",
    content: "Use Send Request for individual, relationship-based outreach. Confirm the customer details, choose the appropriate review destination, preview the message, and send only when the customer relationship and consent basis are appropriate. Keep wording neutral: do not offer incentives, ask only happy customers, or condition support on a positive review.",
    keywords: ["send", "request", "customer", "message", "review", "email", "solicitar", "reseña", "cliente", "envoyer", "avis", "client", "inviare", "recensione", "ลูกค้า", "ส่ง", "รีวิว", "客户", "发送", "评价", "客戶", "傳送", "評論"],
  },
  {
    id: "platform-compliance",
    title: "Review outreach compliance guide",
    href: "/compliance",
    content: "Get Phame does not support review gating. Requests should be neutral, sent consistently to eligible customers, and should not promise rewards. Google Business Profile provides an Ask for reviews share link. Yelp discourages businesses from soliciting reviews, so Get Phame treats Yelp as a higher-risk destination and favors neutral search or passive discovery guidance rather than an active Yelp review solicitation link. Platform policies can change; review the linked compliance guide before sending.",
    keywords: ["google", "yelp", "compliance", "policy", "legal", "incentive", "reward", "gating", "positive", "negative", "solicit", "reseña", "cumplimiento", "politique", "conformité", "recensione", "norme", "ข้อกำหนด", "นโยบาย", "合规", "政策", "評論", "規範"],
  },
  {
    id: "contacts-import",
    title: "Contacts and consented imports",
    href: "/contacts",
    content: "Contacts can be added manually, imported from a file, synchronized from supported commerce sources, or created through the Developer Integrations endpoint. External imports require a customer name, email address, affirmative consent metadata, and a stable idempotency key. Importing a contact does not automatically send a review request. Duplicate and suppressed contacts are handled without silently creating repeated outreach.",
    keywords: ["contact", "contacts", "import", "csv", "duplicate", "consent", "customer", "wordpress", "woocommerce", "form", "contactos", "importar", "consentimiento", "contacts", "importer", "consentement", "contatti", "importare", "consenso", "รายชื่อ", "นำเข้า", "ยินยอม", "联系人", "导入", "同意", "聯絡人", "匯入", "同意"],
  },
  {
    id: "reminders",
    title: "Follow-up reminders",
    href: "/reminders",
    content: "The Reminders workspace shows scheduled follow-ups and provides cancellation controls. Keep follow-ups measured and relevant. Future reminders must stop when the requested customer action completes, and a user can cancel a scheduled reminder from the Reminders workspace.",
    keywords: ["reminder", "follow-up", "followup", "schedule", "cancel", "stop", "recordatorio", "seguimiento", "rappel", "relance", "promemoria", "annullare", "เตือน", "ติดตาม", "提醒", "跟进", "取消", "跟進"],
  },
  {
    id: "developer-integrations",
    title: "Developer Integrations",
    href: "/developer",
    content: "Developer Integrations provides scoped API-key creation, one-time secret display, key rotation and revocation, the versioned customer-import endpoint, consent-aware field mappings, privacy-safe recent-import history, and setup guides for supported form builders. Store API secrets only in a server-side secret field; never put them in browser JavaScript, page markup, screenshots, or this assistant.",
    keywords: ["api", "developer", "integration", "webhook", "key", "token", "ws form", "gravity", "fluent", "elementor", "curl", "integración", "développeur", "intégration", "sviluppatore", "integrazione", "นักพัฒนา", "เชื่อมต่อ", "开发者", "集成", "金钥", "開發者", "整合", "金鑰"],
  },
  {
    id: "account-billing",
    title: "Account and plan management",
    href: "/upgrade",
    content: "Account status and plan-management actions are available from the authenticated app. Payment details are handled by the payment provider and are not available to the help assistant. Never enter card numbers, bank details, or payment credentials in a help question. For account-specific billing investigation, open a support request.",
    keywords: ["billing", "payment", "plan", "subscription", "upgrade", "cancel", "invoice", "price", "factura", "pago", "suscripción", "paiement", "abonnement", "fattura", "pagamento", "abbonamento", "ชำระ", "แผน", "สมาชิก", "付款", "订阅", "账单", "付款", "訂閱", "帳單"],
  },
  {
    id: "privacy-support",
    title: "Privacy and human support",
    href: "/privacy-policy",
    content: "The help assistant answers from a curated Get Phame knowledge set and does not need passwords, API keys, card details, customer lists, or review content. A question is processed independently and the assistant does not create a durable chat transcript. If the approved sources do not answer the question, use the secure support request form for human follow-up and attach a screenshot only when it is needed.",
    keywords: ["privacy", "data", "security", "human", "support", "agent", "unknown", "help", "problem", "error", "bug", "privacidad", "soporte", "problème", "assistance", "privacy", "supporto", "ปัญหา", "ช่วยเหลือ", "隐私", "支持", "隐私", "支援"],
  },
];

const STOP_WORDS = new Set(["a", "an", "and", "are", "can", "do", "for", "from", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "the", "to", "with"]);

export function tokenizeHelpQuery(value: string): string[] {
  const localizedTokenPattern = new RegExp("[\\p{L}\\p{N}][\\p{L}\\p{N}\\p{M}_-]*", "gu");
  return Array.from(new Set(
    value
      .toLocaleLowerCase()
      .match(localizedTokenPattern)
      ?.filter((token) => token.length > 1 && !STOP_WORDS.has(token)) ?? [],
  ));
}

export function retrieveHelpSources(question: string, limit = 4): RetrievedHelpSource[] {
  const tokens = tokenizeHelpQuery(question);
  if (tokens.length === 0) return [];

  return HELP_SOURCES
    .map((source) => {
      const title = source.title.toLocaleLowerCase();
      const content = source.content.toLocaleLowerCase();
      const keywords = source.keywords.map((keyword) => keyword.toLocaleLowerCase());
      const score = tokens.reduce((total, token) => {
        if (keywords.some((keyword) => keyword === token || keyword.includes(token) || token.includes(keyword))) return total + 5;
        if (title.includes(token)) return total + 3;
        if (content.includes(token)) return total + 1;
        return total;
      }, 0);
      return { id: source.id, title: source.title, href: source.href, content: source.content, score };
    })
    .filter((source) => source.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, Math.max(1, Math.min(limit, 4)));
}

const SECRET_PATTERNS = [
  /\b(?:bearer\s+)?gp_(?:live|test)_[a-z0-9._-]{8,}\b/gi,
  /\b(?:sk|pk)_(?:live|test)_[a-z0-9._-]{8,}\b/gi,
  /\b(?:password|passcode|api[\s_-]?key|secret|access[\s_-]?token|refresh[\s_-]?token)\s*[:=]\s*[^\s,;]{6,}/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b(?:\+?\d[\d .()-]{8,}\d)\b/g,
];

export function redactHelpQuestion(question: string): { text: string; redacted: boolean } {
  let text = question;
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, "[private value removed]");
  return { text, redacted: text !== question };
}

export function getHelpSourceById(id: string): HelpSource | undefined {
  return HELP_SOURCES.find((source) => source.id === id);
}
