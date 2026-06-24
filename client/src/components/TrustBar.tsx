import { Lock, Eye, Mail, LinkIcon } from "lucide-react";

const trustItems = [
  { icon: Lock, label: "Password encrypted at rest" },
  { icon: Eye, label: "Your customer list stays private" },
  { icon: Mail, label: "Works with Gmail, Outlook, Yahoo & more" },
  { icon: LinkIcon, label: "Unsubscribe link in every email" },
];

export default function TrustBar() {
  return (
    <section className="relative py-6 bg-[oklch(0.12_0.025_250)] border-y border-border/50">
      <div className="container">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-slate-400">
              <item.icon size={15} className="text-emerald-400 shrink-0" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
