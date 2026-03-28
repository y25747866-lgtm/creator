import { useEffect, useRef } from "react";
import { Star } from "lucide-react";

const testimonials = [
  {
    initials: "AK",
    name: "Amir Khalid",
    role: "Digital Creator · Dubai",
    stars: 5,
    quote: "I generated my first ebook in under 5 minutes. NexoraOS literally turned my idea into a sellable product before my coffee got cold.",
  },
  {
    initials: "SR",
    name: "Sofia Reyes",
    role: "Online Entrepreneur · Mexico City",
    stars: 5,
    quote: "Made my first $500 in the first week. The monetization engine creates everything — sales pages, email sequences, the whole funnel.",
  },
  {
    initials: "MJ",
    name: "Marcus J.",
    role: "Content Creator · Atlanta",
    stars: 5,
    quote: "I used to spend 20+ hours creating a single product. Now NexoraOS does it in minutes. It's like having a full product team on autopilot.",
  },
];

const Testimonials = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    const animatedElements = sectionRef.current?.querySelectorAll('.animate-up');
    animatedElements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="testimonials" ref={sectionRef} className="py-[80px] px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-up">
          <h2 className="text-[clamp(32px,5vw,56px)] font-bold mb-4 landing-heading text-[var(--text-primary)]">
            Loved by <span style={{ color: 'var(--accent)' }}>Creators</span> Worldwide
          </h2>
          <p className="text-[clamp(16px,2vw,20px)] text-[var(--text-muted)] max-w-2xl mx-auto landing-section">
            Join thousands of creators who are scaling their businesses with NexoraOS.
          </p>
        </div>

        <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-x-visible pb-8 md:pb-0 snap-x snap-mandatory scrollbar-hide">
          {testimonials.map((t, index) => (
            <div 
              key={t.name} 
              className="min-w-[300px] md:min-w-0 flex-shrink-0 snap-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 animate-up"
              style={{ 
                transitionDelay: `${index * 100}ms`,
                borderTop: '2px solid var(--accent)'
              }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold">
                  {t.initials}
                </div>
                <div>
                  <h4 className="text-[var(--text-primary)] font-bold landing-heading">{t.name}</h4>
                  <p className="text-[var(--text-muted)] text-xs landing-section">{t.role}</p>
                </div>
              </div>
              <div className="flex gap-1 mb-4">
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <p className="text-[14px] italic text-[var(--text-primary)]/80 leading-relaxed landing-section">
                "{t.quote}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
