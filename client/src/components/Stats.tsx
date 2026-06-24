const stats = [
  { value: "10×", label: "more reviews vs. asking in person" },
  { value: "< 2 min", label: "average setup time" },
  { value: "Your inbox", label: "emails sent from your own address" },
  { value: "42%", label: "average response rate" },
];

const industries = [
  "Photographers", "Cafés & Restaurants", "Home Services", "Clinics & Salons", "Agencies", "WooCommerce Stores"
];

export default function Stats() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Subtle gold radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      
      <div className="container relative z-10">
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
            Built for businesses that run on reputation
          </h2>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {industries.map((ind, i) => (
              <span key={ind} className="flex items-center gap-2">
                {i > 0 && <span className="text-border">·</span>}
                {ind}
              </span>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 md:p-8 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/20 transition-colors duration-300">
              <div className="font-display font-extrabold text-3xl md:text-4xl text-primary mb-2">
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
