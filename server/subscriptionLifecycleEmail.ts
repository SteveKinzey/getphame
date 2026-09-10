import {
  normalizeLifecycleLocale,
  type LifecycleLocale,
} from "@shared/lifecycleLocale";

export const LIFECYCLE_SETTINGS_URL = "https://getphame.app/settings";
export type SubscriptionLifecycleEmailKind =
  | "trial-ending"
  | "payment-action"
  | "subscription-ended";

type Copy = {
  subject: string;
  heading: string;
  intro: string;
  action: string;
  footer: string;
};

type Catalog = Record<
  LifecycleLocale,
  Record<SubscriptionLifecycleEmailKind, Copy>
>;

const catalog: Catalog = {
  en: {
    "trial-ending": {
      subject: "Your Get Phame trial is ending soon",
      heading: "Your trial is ending soon",
      intro:
        "Your Get Phame trial is approaching its end. Review your billing settings to keep uninterrupted access.",
      action: "Review billing settings",
      footer: "This is a transactional notice about your Get Phame account.",
    },
    "payment-action": {
      subject: "Action needed for your Get Phame payment",
      heading: "Please review your payment details",
      intro:
        "Stripe could not complete a subscription payment. Review your billing settings to avoid an interruption in access.",
      action: "Review billing settings",
      footer: "This is a transactional notice about your Get Phame account.",
    },
    "subscription-ended": {
      subject: "Your Get Phame subscription has ended",
      heading: "Your subscription has ended",
      intro:
        "Your recurring Get Phame subscription is no longer active. Your account has returned to the Free plan.",
      action: "View account settings",
      footer: "This is a transactional notice about your Get Phame account.",
    },
  },
  es: {
    "trial-ending": {
      subject: "Tu prueba de Get Phame terminará pronto",
      heading: "Tu prueba terminará pronto",
      intro:
        "Tu prueba de Get Phame está por terminar. Revisa la configuración de facturación para mantener el acceso sin interrupciones.",
      action: "Revisar facturación",
      footer: "Este es un aviso transaccional sobre tu cuenta de Get Phame.",
    },
    "payment-action": {
      subject: "Se requiere una acción para tu pago de Get Phame",
      heading: "Revisa tus datos de pago",
      intro:
        "Stripe no pudo completar un pago de la suscripción. Revisa la facturación para evitar una interrupción del acceso.",
      action: "Revisar facturación",
      footer: "Este es un aviso transaccional sobre tu cuenta de Get Phame.",
    },
    "subscription-ended": {
      subject: "Tu suscripción a Get Phame ha terminado",
      heading: "Tu suscripción ha terminado",
      intro:
        "Tu suscripción recurrente a Get Phame ya no está activa. Tu cuenta volvió al plan gratuito.",
      action: "Ver configuración",
      footer: "Este es un aviso transaccional sobre tu cuenta de Get Phame.",
    },
  },
  fr: {
    "trial-ending": {
      subject: "Votre essai Get Phame se termine bientôt",
      heading: "Votre essai se termine bientôt",
      intro:
        "Votre essai Get Phame approche de sa fin. Vérifiez vos paramètres de facturation pour conserver un accès ininterrompu.",
      action: "Vérifier la facturation",
      footer:
        "Ceci est un avis transactionnel concernant votre compte Get Phame.",
    },
    "payment-action": {
      subject: "Action requise pour votre paiement Get Phame",
      heading: "Vérifiez vos informations de paiement",
      intro:
        "Stripe n’a pas pu finaliser un paiement d’abonnement. Vérifiez la facturation pour éviter une interruption d’accès.",
      action: "Vérifier la facturation",
      footer:
        "Ceci est un avis transactionnel concernant votre compte Get Phame.",
    },
    "subscription-ended": {
      subject: "Votre abonnement Get Phame est terminé",
      heading: "Votre abonnement est terminé",
      intro:
        "Votre abonnement récurrent Get Phame n’est plus actif. Votre compte est revenu à l’offre gratuite.",
      action: "Voir les paramètres",
      footer:
        "Ceci est un avis transactionnel concernant votre compte Get Phame.",
    },
  },
  it: {
    "trial-ending": {
      subject: "La prova di Get Phame terminerà presto",
      heading: "La prova terminerà presto",
      intro:
        "La prova di Get Phame sta per terminare. Controlla le impostazioni di fatturazione per mantenere l’accesso senza interruzioni.",
      action: "Controlla la fatturazione",
      footer:
        "Questo è un avviso transazionale relativo al tuo account Get Phame.",
    },
    "payment-action": {
      subject: "Azione richiesta per il pagamento Get Phame",
      heading: "Controlla i dati di pagamento",
      intro:
        "Stripe non ha potuto completare un pagamento dell’abbonamento. Controlla la fatturazione per evitare interruzioni dell’accesso.",
      action: "Controlla la fatturazione",
      footer:
        "Questo è un avviso transazionale relativo al tuo account Get Phame.",
    },
    "subscription-ended": {
      subject: "Il tuo abbonamento Get Phame è terminato",
      heading: "Il tuo abbonamento è terminato",
      intro:
        "Il tuo abbonamento ricorrente a Get Phame non è più attivo. Il tuo account è tornato al piano gratuito.",
      action: "Visualizza le impostazioni",
      footer:
        "Questo è un avviso transazionale relativo al tuo account Get Phame.",
    },
  },
  th: {
    "trial-ending": {
      subject: "ช่วงทดลองใช้ Get Phame ของคุณใกล้สิ้นสุดแล้ว",
      heading: "ช่วงทดลองใช้ใกล้สิ้นสุดแล้ว",
      intro:
        "ช่วงทดลองใช้ Get Phame ของคุณใกล้สิ้นสุด โปรดตรวจสอบการตั้งค่าการเรียกเก็บเงินเพื่อใช้งานได้อย่างต่อเนื่อง",
      action: "ตรวจสอบการเรียกเก็บเงิน",
      footer: "นี่คือการแจ้งเตือนเกี่ยวกับธุรกรรมของบัญชี Get Phame ของคุณ",
    },
    "payment-action": {
      subject: "โปรดดำเนินการเกี่ยวกับการชำระเงิน Get Phame",
      heading: "โปรดตรวจสอบข้อมูลการชำระเงิน",
      intro:
        "Stripe ไม่สามารถเรียกเก็บเงินค่าสมัครสมาชิกได้ โปรดตรวจสอบการเรียกเก็บเงินเพื่อป้องกันการระงับสิทธิ์ใช้งาน",
      action: "ตรวจสอบการเรียกเก็บเงิน",
      footer: "นี่คือการแจ้งเตือนเกี่ยวกับธุรกรรมของบัญชี Get Phame ของคุณ",
    },
    "subscription-ended": {
      subject: "การสมัครสมาชิก Get Phame ของคุณสิ้นสุดแล้ว",
      heading: "การสมัครสมาชิกสิ้นสุดแล้ว",
      intro:
        "การสมัครสมาชิก Get Phame แบบต่ออายุของคุณไม่เปิดใช้งานแล้ว บัญชีของคุณกลับสู่แผนฟรี",
      action: "ดูการตั้งค่าบัญชี",
      footer: "นี่คือการแจ้งเตือนเกี่ยวกับธุรกรรมของบัญชี Get Phame ของคุณ",
    },
  },
  "zh-CN": {
    "trial-ending": {
      subject: "您的 Get Phame 试用即将结束",
      heading: "您的试用即将结束",
      intro: "您的 Get Phame 试用即将结束。请检查账单设置，以保持不间断访问。",
      action: "检查账单设置",
      footer: "这是一封与您的 Get Phame 账户有关的交易通知。",
    },
    "payment-action": {
      subject: "您的 Get Phame 付款需要处理",
      heading: "请检查付款信息",
      intro: "Stripe 未能完成订阅付款。请检查账单设置，以免访问中断。",
      action: "检查账单设置",
      footer: "这是一封与您的 Get Phame 账户有关的交易通知。",
    },
    "subscription-ended": {
      subject: "您的 Get Phame 订阅已结束",
      heading: "您的订阅已结束",
      intro: "您的 Get Phame 定期订阅已不再有效。您的账户已恢复为免费方案。",
      action: "查看账户设置",
      footer: "这是一封与您的 Get Phame 账户有关的交易通知。",
    },
  },
  "zh-TW": {
    "trial-ending": {
      subject: "您的 Get Phame 試用即將結束",
      heading: "您的試用即將結束",
      intro:
        "您的 Get Phame 試用即將結束。請檢查帳單設定，以維持不中斷的存取權限。",
      action: "檢查帳單設定",
      footer: "這是一封與您的 Get Phame 帳戶有關的交易通知。",
    },
    "payment-action": {
      subject: "您的 Get Phame 付款需要處理",
      heading: "請檢查付款資料",
      intro: "Stripe 無法完成訂閱付款。請檢查帳單設定，以免存取權限中斷。",
      action: "檢查帳單設定",
      footer: "這是一封與您的 Get Phame 帳戶有關的交易通知。",
    },
    "subscription-ended": {
      subject: "您的 Get Phame 訂閱已結束",
      heading: "您的訂閱已結束",
      intro: "您的 Get Phame 定期訂閱已不再有效。您的帳戶已恢復為免費方案。",
      action: "檢視帳戶設定",
      footer: "這是一封與您的 Get Phame 帳戶有關的交易通知。",
    },
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function displayName(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().slice(0, 120) || "there";
}

export function renderSubscriptionLifecycleEmail(input: {
  kind: SubscriptionLifecycleEmailKind;
  locale?: string | null;
  accountName?: string | null;
}) {
  const locale = normalizeLifecycleLocale(input.locale);
  const copy = catalog[locale]?.[input.kind] ?? catalog.en[input.kind];
  const name = displayName(input.accountName);
  const safeName = escapeHtml(name);
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.subject)}</title></head><body style="margin:0;background:#eef0f4;font-family:Arial,sans-serif;color:#0f1b2d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#eef0f4"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 32px;background:#061a43;color:#ffffff;font-size:20px;font-weight:700">GET <span style="color:#d4a017">PHAME</span></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;font-size:16px">${safeName},</p><h1 style="margin:0 0 16px;font-size:24px">${escapeHtml(copy.heading)}</h1><p style="margin:0 0 24px;line-height:1.6;color:#46536b">${escapeHtml(copy.intro)}</p><p style="margin:0"><a href="${LIFECYCLE_SETTINGS_URL}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#d4a017;color:#061a43;text-decoration:none;font-weight:700">${escapeHtml(copy.action)}</a></p></td></tr><tr><td style="padding:20px 32px;background:#f8f9fb;color:#6b7280;font-size:12px">${escapeHtml(copy.footer)}</td></tr></table></td></tr></table></body></html>`;
  const text = `${name},\n\n${copy.heading}\n\n${copy.intro}\n\n${copy.action}: ${LIFECYCLE_SETTINGS_URL}\n\n${copy.footer}`;

  return { locale, subject: copy.subject, html, text };
}
