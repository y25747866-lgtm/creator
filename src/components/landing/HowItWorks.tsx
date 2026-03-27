import { useEffect, useRef, useState } from "react";
import { Lightbulb, Cpu, DollarSign } from "lucide-react";

const steps = [
  { icon: Lightbulb, title: "Drop Your Idea", description: "Enter a topic, niche, or concept. NexoraOS takes it from there.", num: "01" },
  { icon: Cpu, title: "NexoraOS Builds & Deploys", description: "AI creates your product, marketing assets, sales pages, and monetization modules.", num: "02" },
  { icon: DollarSign, title: "Revenue Flows In", description: "Export, sell, and scale. Products auto-improve from feedback and analytics.", num: "03" },
];

const HowItWorks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 landing-heading text-white">
            How NexoraOS Works
          </h2>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-px" style={{
            background: visible ? 'linear-gradient(to right, transparent, #5B4FE8, #00FFD1, transparent)' : 'transparent',
            transition: 'background 1.5s ease',
          }} />

          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 200 + 300}ms` }}
            >
              <div className="relative inline-flex mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{
                  background: 'rgba(91, 79, 232, 0.1)',
                  border: '1px solid rgba(91, 79, 232, 0.2)',
                }}>
                  <step.icon className="w-7 h-7 text-[#5B4FE8]" />
                </div>
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-[#00FFD1] landing-heading">{step.num}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 landing-heading">{step.title}</h3>
              <p className="text-sm text-white/40 landing-section">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
