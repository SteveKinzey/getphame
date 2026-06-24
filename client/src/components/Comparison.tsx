import { Check, X } from "lucide-react";

const competitors = [
  { name: "Get Phame", price: "$29/mo", lifetime: true, highlight: true },
  { name: "Birdeye", price: "$299/mo", lifetime: false, highlight: false },
  { name: "Podium", price: "$249/mo", lifetime: false, highlight: false },
  { name: "NiceJob", price: "$75/mo", lifetime: false, highlight: false },
  { name: "Grade.us", price: "$110/mo", lifetime: false, highlight: false },
  { name: "ReviewTrackers", price: "$89/mo", lifetime: false, highlight: false },
];

export default function Comparison() {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Compare
            </p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              Enterprise features. Startup price.
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              The big players charge $250–$300/month for review request tools. Get Phame gives you the same core capability — sending personal review requests — at a fraction of the cost. Plus a lifetime option they'll never offer.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/15">
              <span className="font-display font-extrabold text-2xl text-primary">10–20×</span>
              <span className="text-sm text-muted-foreground">cheaper than enterprise alternatives</span>
            </div>
          </div>

          {/* Right — table */}
          <div>
            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl border border-border/50 overflow-hidden bg-card/60 backdrop-blur-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Starting Price</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((comp) => (
                    <tr
                      key={comp.name}
                      className={`border-t border-border/20 ${
                        comp.highlight ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="p-4">
                        <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-white"}`}>
                          {comp.name}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-slate-300"}`}>
                          {comp.price}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {comp.lifetime ? (
                          <Check size={18} className="text-emerald-400 mx-auto" />
                        ) : (
                          <X size={18} className="text-red-400/50 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {competitors.map((comp) => (
                <div
                  key={comp.name}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    comp.highlight
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card/60 border-border/30"
                  }`}
                >
                  <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-white"}`}>
                    {comp.name}
                  </span>
                  <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-muted-foreground"}`}>
                    {comp.price}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Prices based on publicly listed entry-tier plans as of April 2026. Subject to change.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
