import { useEffect, useRef, useState } from "react";

const Founder = () => {
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
        <div className={`landing-card p-8 md:p-12 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl flex items-center justify-center text-4xl md:text-5xl font-bold text-white shrink-0 landing-heading" style={{
              background: 'linear-gradient(135deg, #5B4FE8, #7C3AED)',
            }}>
              YM
            </div>
            
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white landing-heading">
                Meet the Founder
              </h2>
              <h3 className="text-xl font-semibold mb-4 landing-heading" style={{ color: '#5B4FE8' }}>
                Yesh Malik
              </h3>
              <p className="text-sm text-white/40 mb-2 landing-section">Founder, NexoraOS</p>
              <p className="text-white/50 leading-relaxed mb-6 landing-section">
                After years of juggling multiple tools, managing scattered workflows, and spending 
                countless hours on repetitive tasks, I built NexoraOS — the unified platform that 
                puts creators first. One system to create, monetize, and scale your entire digital business.
              </p>
              <blockquote className="text-lg md:text-xl italic landing-heading" style={{ color: '#5B4FE8' }}>
                "I built the tool I always needed — and now it's yours."
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Founder;
