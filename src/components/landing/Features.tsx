import { useEffect, useRef } from "react";
import {
  BookOpen, Download, LayoutDashboard, Users, Package, RefreshCw, BarChart3, Wand2, GitCompare, MessageSquare,
} from "lucide-react";

const Features = () => {
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

  const features = [
    { icon: BookOpen, title: "AI Product Generator", description: "Generate ebooks, courses, SaaS blueprints from a single idea.", color: "#F59E0B" },
    { icon: Package, title: "Modular Monetization Engine", description: "Convert any product into 8 revenue assets automatically.", color: "#A855F7" },
    { icon: RefreshCw, title: "Self-Evolving Product Engine", description: "Products auto-improve across versions for higher conversions.", color: "#EC4899" },
    { icon: BarChart3, title: "Product Analytics Intelligence", description: "Track downloads, engagement, conversions in real time.", color: "#14B8A6" },
    { icon: Wand2, title: "Monetization Wizard", description: "Step-by-step guided funnel & product builder.", color: "#EF4444" },
    { icon: GitCompare, title: "Versioning System", description: "Compare versions side-by-side, regenerate with improvements.", color: "#22C55E" },
    { icon: Users, title: "Referral Growth System", description: "Built-in viral user acquisition engine.", color: "#6B7280" },
    { icon: LayoutDashboard, title: "Smart Creator Dashboard", description: "Full control from one unified command center.", color: "#3B82F6" },
    { icon: Download, title: "Download & Export System", description: "Export production-ready assets as PDF, ready to sell.", color: "#F43F5E" },
    { icon: MessageSquare, title: "Feedback Intelligence", description: "Collect ratings and sentiment to fuel AI improvements.", color: "#06B6D4" },
  ];

  return (
    <section id="features" ref={sectionRef} className="py-[100px] px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-up">
          <h2 className="text-[clamp(32px,5vw,56px)] font-bold mb-4 landing-heading text-[var(--text-primary)]">
            The Complete <span style={{ color: 'var(--accent)' }}>Creator OS</span>
          </h2>
          <p className="text-[clamp(16px,2vw,20px)] text-[var(--text-muted)] max-w-2xl mx-auto landing-section">
            Everything you need to create, monetize, and scale AI-powered digital products.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="feature-card animate-up"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: `${feature.color}20` }}>
                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
              </div>
              <h3 className="text-[15px] font-[700] mb-2 text-[var(--text-primary)] landing-heading">
                {feature.title}
              </h3>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed landing-section">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
