import { Shield, Eye, Mail, Link } from "lucide-react";
import FadeUp from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function TrustBar() {
  const { t } = useTranslation();

  const trustItems = [
    {
      icon: Shield,
      label: t("landing.trustBar.passwordEncrypted", {
        defaultValue: "Password encrypted at rest",
      }),
    },
    {
      icon: Eye,
      label: t("landing.trustBar.customerListPrivate", {
        defaultValue: "Your customer list stays private",
      }),
    },
    {
      icon: Mail,
      label: t("landing.trustBar.worksWithEmailProviders", {
        defaultValue: "Works with Gmail, Outlook, Yahoo & more",
      }),
    },
    {
      icon: Link,
      label: t("landing.trustBar.unsubscribeLink", {
        defaultValue: "Unsubscribe link in every email",
      }),
    },
  ];

  return (
    <div className="py-5 border-y border-[#1e3050] bg-[oklch(0.12_0.025_250/0.5)]">
      <FadeUp>
        <div className="container">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {trustItems.map(item => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm text-slate-300 font-medium"
              >
                <item.icon size={15} className="text-emerald-400 shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
