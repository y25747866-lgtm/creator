import { useEffect, useRef, useState } from "react";
import { Zap, Building2, Brain } from "lucide-react";

const WhatIsNexora = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const points = [
    {
      icon: Zap,
      title: "AI-Powered Product Creation",
      description: "Generate ebooks, courses, SaaS blueprints, funnels from a single idea.",
    },
    {
      icon: Building2,
      title: "Full Business OS",
      description: "One platform to create, monetize, track, version, and scale every digital product.",
    },
    {
      icon: Brain,
      title: "Self-Evolving Intelligence",
      description: "Products learn from feedback, auto-improve across versions, optimize for conversions.",
    },
  ];

  return (
    <section ref={ref} className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 landing-heading">
            <span className="text-white">What is </span>
            <span style={{ color: '#5B4FE8' }}>NexoraOS?</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto landing-section">
            NexoraOS is an AI-powered Operating System that turns ideas into scalable digital businesses. 
            Create products, monetize instantly, and let the system self-improve — all from one dashboard.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {points.map((point, index) => (
            <div
              key={point.title}
              className={`landing-card landing-card-hover p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${index * 100 + 200}ms` }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ background: 'rgba(0, 255, 209, 0.1)' }}>
                <point.icon className="w-7 h-7 text-[#00FFD1]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white landing-heading">{point.title}</h3>
              <p className="text-white/50 landing-section">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatIsNexora;
