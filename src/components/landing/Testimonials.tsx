import { useEffect, useRef } from "react";
import { Star } from "lucide-react";

const testimonials = [
  {
    initials: "AK",
    name: "Amir Khalid",
    role: "Digital Creator · Dubai",
    stars: 5,
    quote: "NexoraOS transformed my entire business. I went from struggling to make $500/month to generating $50k+ in just 3 months.",
  },
  {
    initials: "SR",
    name: "Sofia Reyes",
    role: "Online Entrepreneur · Mexico City",
    stars: 5,
    quote: "The monetization engine is pure genius. Every product I create automatically generates revenue from 8 different streams. It's like having a full team.",
  },
  {
    initials: "MJ",
    name: "Marcus J.",
    role: "Content Creator · Atlanta",
    stars: 5,
    quote: "I used to spend 100+ hours per product. Now NexoraOS does it in minutes. The ROI is absolutely insane.",
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
    <section id="testimonials" ref={sectionRef} className="py-[140px] px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20 animate-up">
          <h2 className="text-[clamp(40px,6vw,64px)] font-[900] mb-6 landing-heading leading-tight">
            <span className="text-gradient">Loved by</span>
            <br />
            <span className="accent-gradient">Creators Worldwide</span>
          </h2>
          <p className="text-[clamp(18px,2vw,22px)] text-white/60 max-w-2xl mx-auto landing-section">
            Join thousands of creators scaling their businesses to 6 and 7 figures.
          </p>
        </div>

        <div className="flex md:grid md:grid-cols-3 gap-8 overflow-x-auto md:overflow-x-visible pb-8 md:pb-0 snap-x snap-mandatory scrollbar-hide">
          {testimonials.map((t, index) => (
            <div 
              key={index} 
              className="min-w-[320px] md:min-w-0 flex-shrink-0 snap-center premium-card animate-up"
              style={{ 
                transitionDelay: `${index * 100}ms`,
                borderTop: '2px solid #6366F1',
              }}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {t.initials}
                </div>
                <div>
                  <h4 className="text-white font-[900] landing-heading">{t.name}</h4>
                  <p className="text-white/60 text-sm landing-section">{t.role}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mb-6">
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[16px] italic text-white/80 leading-relaxed landing-section">
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
