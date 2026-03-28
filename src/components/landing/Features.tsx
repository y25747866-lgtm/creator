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
    { icon: BookOpen, title: "AI Product Generator", description: "Generate high-quality digital products instantly with our advanced neural engine.", color: "#F59E0B" },
    { icon: Package, title: "Monetization Engine", description: "Convert any product into 8+ revenue streams automatically.", color: "#A855F7" },
    { icon: RefreshCw, title: "Self-Improving OS", description: "Products auto-optimize across versions for higher conversions.", color: "#EC4899" },
    { icon: BarChart3, title: "Advanced Analytics", description: "Track downloads, engagement, and conversions in real-time.", color: "#14B8A6" },
    { icon: Wand2, title: "Smart Wizard", description: "Step-by-step guided product and funnel builder.", color: "#EF4444" },
    { icon: GitCompare, title: "Version Control", description: "Compare versions side-by-side with intelligent improvements.", color: "#22C55E" },
    { icon: Users, title: "Viral Growth", description: "Built-in referral system for exponential user acquisition.", color: "#6B7280" },
    { icon: LayoutDashboard, title: "Command Center", description: "Full control from one unified, powerful dashboard.", color: "#3B82F6" },
    { icon: Download, title: "Export System", description: "Production-ready assets compatible with all platforms.", color: "#F43F5E" },
    { icon: MessageSquare, title: "AI Support Hub", description: "Intelligent customer support that closes sales automatically.", color: "#06B6D4" },
  ];

  return (
    <section id="features" ref={sectionRef} className="py-[140px] px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20 animate-up">
          <h2 className="text-[clamp(40px,6vw,64px)] font-[900] mb-6 landing-heading leading-tight">
            <span className="text-gradient">Everything You Need</span>
            <br />
            <span className="accent-gradient">To Scale</span>
          </h2>
          <p className="text-[clamp(18px,2vw,22px)] text-white/60 max-w-2xl mx-auto landing-section">
            The complete operating system for creating, monetizing, and scaling digital products at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="premium-card group animate-up"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300" style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}>
                <feature.icon className="w-8 h-8" style={{ color: feature.color }} />
              </div>
              <h3 className="text-[18px] font-[800] mb-3 text-white landing-heading">
                {feature.title}
              </h3>
              <p className="text-[15px] text-white/60 leading-relaxed landing-section">
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
