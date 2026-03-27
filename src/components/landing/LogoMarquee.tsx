const items = [
  "⚡ AI Product Generator",
  "📊 Analytics Hub",
  "🎯 Sales Page Builder",
  "📣 Marketing Studio",
  "📚 E-Book Generator",
  "💰 Monetization Engine",
  "🔄 Self-Evolving AI",
  "📥 Downloads & Exports",
];

const LogoMarquee = () => {
  return (
    <section className="relative py-10 overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #080810, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #080810, transparent)' }} />

      <div className="flex animate-marquee">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className="shrink-0 px-8 text-sm font-medium text-white/40 whitespace-nowrap landing-section">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
};

export default LogoMarquee;
