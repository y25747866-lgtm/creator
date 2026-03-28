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
    <section id="get-started" ref={sectionRef} className="py-[140px] px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 rounded-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div
          className="relative overflow-hidden rounded-3xl p-16 md:p-24 text-center animate-up"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(34, 211, 238, 0.04))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 30px 60px -12px rgba(99, 102, 241, 0.2), inset 0 0 30px rgba(99, 102, 241, 0.05)',
          }}
        >
          <div className="relative z-10">
            <div className="relative w-32 h-32 mx-auto mb-12">
              {/* Pulse Ring */}
              <div className="absolute inset-0 rounded-full bg-indigo-500 animate-pulse-ring" />
              <div className="relative w-full h-full rounded-3xl flex items-center justify-center z-10 glass-button">
                <Rocket className="w-16 h-16 text-white" />
              </div>
            </div>

            <h2 className="text-[clamp(40px,6vw,64px)] font-[900] mb-8 landing-heading leading-tight">
              <span className="text-gradient">Ready to Build</span>
              <br />
              <span className="accent-gradient">Your Billion-Dollar Business?</span>
            </h2>
            
            <p className="text-[clamp(18px,2vw,22px)] text-white/70 max-w-3xl mx-auto mb-14 landing-section leading-relaxed">
              Start with a free account today. Create your first product in minutes and begin generating revenue immediately. No credit card required.
            </p>

            <Link to="/dashboard">
              <button className="glass-button text-lg px-12 py-6 landing-section mb-8 inline-block">
                Start Your Free Trial Now
                <ArrowRight className="inline ml-3 w-6 h-6" />
              </button>
            </Link>

            <div className="flex items-center justify-center gap-10 text-base font-semibold text-white/70 landing-section flex-wrap">
              <span className="flex items-center gap-3"><Check className="w-6 h-6 text-indigo-400" /> Free forever</span>
              <span className="flex items-center gap-3"><Check className="w-6 h-6 text-indigo-400" /> No credit card</span>
              <span className="flex items-center gap-3"><Check className="w-6 h-6 text-indigo-400" /> 2-minute setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetStarted;
