import { useEffect, useRef } from "react";
import { ArrowRight, Rocket, Check } from "lucide-react";
import { Link } from "react-router-dom";

const GetStarted = () => {
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
    <section id="get-started" ref={sectionRef} className="py-[100px] px-6">
      <div className="max-w-5xl mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl p-12 md:p-20 text-center animate-up"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(91, 79, 232, 0.3) 0%, rgba(13, 13, 31, 0.95) 70%)',
            border: '1px solid rgba(91, 79, 232, 0.2)',
          }}
        >
          <div className="relative z-10">
            <div className="relative w-24 h-24 mx-auto mb-10">
              {/* Pulse Ring */}
              <div className="absolute inset-0 rounded-full bg-[var(--accent)] animate-pulse-ring" />
              <div className="relative w-full h-full rounded-2xl flex items-center justify-center z-10" style={{
                background: 'linear-gradient(135deg, #5B4FE8, #7C3AED)',
                boxShadow: '0 0 40px rgba(91, 79, 232, 0.5)',
              }}>
                <Rocket className="w-12 h-12 text-white" />
              </div>
            </div>

            <h2 className="text-[clamp(32px,5vw,56px)] font-bold mb-6 landing-heading text-[var(--text-primary)]">
              Ready to Build Your <br />
              <span style={{ color: 'var(--accent)' }}>AI-Powered Business?</span>
            </h2>
            
            <p className="text-[clamp(16px,2vw,20px)] text-[var(--text-muted)] max-w-2xl mx-auto mb-12 landing-section">
              Start with a free account. Create products, explore monetization, 
              and see why NexoraOS is the only platform that turns one idea into an entire business system.
            </p>

            <Link to="/dashboard">
              <button className="text-base px-10 py-5 rounded-xl font-bold text-white transition-all hover:scale-105 landing-section" style={{
                background: 'var(--accent)',
                boxShadow: '0 0 40px rgba(91, 79, 232, 0.5)',
              }}>
                Start Your Free Trial →
                <ArrowRight className="inline ml-2 w-5 h-5" />
              </button>
            </Link>

            <div className="flex items-center justify-center gap-8 mt-10 text-sm font-medium text-[var(--cyan)] landing-section flex-wrap">
              <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Free forever</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4" /> No credit card</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4" /> 2-minute setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetStarted;
