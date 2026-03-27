import { useEffect, useRef, useState } from "react";
import { ArrowRight, Rocket, Check } from "lucide-react";
import { Link } from "react-router-dom";

const GetStarted = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div
          className={`relative overflow-hidden rounded-3xl p-8 md:p-16 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{
            background: 'linear-gradient(135deg, rgba(91, 79, 232, 0.1) 0%, rgba(0, 255, 209, 0.05) 100%)',
            border: '1px solid rgba(91, 79, 232, 0.15)',
          }}
        >
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #5B4FE8, #7C3AED)',
            }}>
              <Rocket className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl md:text-5xl font-bold mb-6 landing-heading">
              <span className="text-white">Ready to Build Your</span>
              <br />
              <span style={{ color: '#5B4FE8' }}>AI-Powered Business?</span>
            </h2>
            
            <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 landing-section">
              Start with a free account. Create products, explore monetization, 
              and see why NexoraOS is the only platform that turns one idea into an entire business system.
            </p>

            <Link to="/dashboard">
              <button className="text-base px-10 py-4 rounded-xl font-semibold text-white indigo-glow transition-all hover:scale-105 landing-section" style={{
                background: 'linear-gradient(135deg, #5B4FE8, #7C3AED)',
              }}>
                Start Your Free Trial
                <ArrowRight className="inline ml-2 w-5 h-5" />
              </button>
            </Link>

            <div className="flex items-center justify-center gap-6 mt-6 text-xs text-white/30 landing-section">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#00FFD1]" /> Free forever</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#00FFD1]" /> No credit card</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#00FFD1]" /> 2-minute setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetStarted;
