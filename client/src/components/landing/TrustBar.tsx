import { Shield, Eye, Mail, Link } from "lucide-react";
import FadeUp from "./FadeUp";

const trustItems = [
  { icon: Shield, label: "Password encrypted at rest" },
  { icon: Eye, label: "Your customer list stays private" },
  { icon: Mail, label: "Works with Gmail, Outlook, Yahoo & more" },
  { icon: Link, label: "Unsubscribe link in every email" },
];

export default function TrustBar() {
  return (
    <div className="py-5 border-y border-border/30 bg-[oklch(0.12_0.025_250/0.5)]">
      <FadeUp>
        <div className="container">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
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
