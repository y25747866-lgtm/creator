import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

const testimonials = [
  {
    initials: "AK",
    name: "Alex Kim",
    role: "Digital Creator",
    stars: 5,
    quote: "I generated my first ebook in under 5 minutes. NexoraOS literally turned my idea into a sellable product before my coffee got cold.",
  },
  {
    initials: "SR",
    name: "Sarah Rodriguez",
    role: "Online Entrepreneur",
    stars: 5,
    quote: "Made my first $500 in the first week. The monetization engine creates everything — sales pages, email sequences, the whole funnel.",
  },
  {
    initials: "MJ",
    name: "Marcus Johnson",
    role: "Content Creator",
    stars: 5,
    quote: "I used to spend 20+ hours creating a single product. Now NexoraOS does it in minutes. It's like having a full product team on autopilot.",
  },
];

const Testimonials = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-5xl font-bold landing-heading text-white">
            What Creators Are Saying
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`landing-card landing-card-hover p-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100 + 200}ms`, borderTop: '2px solid rgba(91, 79, 232, 0.3)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white landing-heading" style={{ background: 'linear-gradient(135deg, #5B4FE8, #7C3AED)' }}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white landing-heading">{t.name}</div>
                  <div className="text-xs text-white/40 landing-section">{t.role}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <p className="text-sm text-white/60 leading-relaxed landing-section">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
