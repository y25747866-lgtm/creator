import { useEffect, useRef, useState } from "react";
import {
  BookOpen, Download, LayoutDashboard, Users, Package, RefreshCw, BarChart3, Wand2, GitCompare, MessageSquare,
} from "lucide-react";

const Features = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
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
    <section id="features" ref={ref} className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 landing-heading">
            <span className="text-white">The Complete </span>
            <span style={{ color: '#5B4FE8' }}>Creator OS</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto landing-section">
            Everything you need to create, monetize, and scale AI-powered digital products.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`landing-card landing-card-hover p-5 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${index * 50 + 100}ms` }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${feature.color}20` }}>
                <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
              </div>
              <h3 className="text-sm font-semibold mb-1.5 text-white landing-heading">{feature.title}</h3>
              <p className="text-white/40 text-xs landing-section leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
