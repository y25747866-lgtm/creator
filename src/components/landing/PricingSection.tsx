import { useEffect, useRef, useState } from "react";
import { Check, X, Zap, Crown, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const [isAnnual, setIsAnnual] = useState(false);

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

  const PLANS = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "",
      description: "Explore the platform. Upgrade to export and monetize.",
      icon: Zap,
      features: [
        { text: "1 AI generation per day", included: true },
        { text: "1 Marketing Studio / day", included: true },
        { text: "1 Sales Page / day", included: true },
        { text: "Analytics view", included: true },
        { text: "No exports", included: false },
        { text: "No AI Assistant", included: false },
      ],
      popular: false,
      cta: "Start Free",
      route: "/auth",
    },
    {
      id: "creator",
      name: "Creator",
      price: isAnnual ? "$15" : "$19",
      period: "/mo",
      description: "Everything you need to create and sell digital products.",
      icon: Crown,
      features: [
        { text: "Full AI Product Generator", included: true },
        { text: "Marketing Studio", included: true },
        { text: "Sales Page Builder", included: true },
        { text: "Analytics Dashboard", included: true },
        { text: "Downloads & Exports", included: true },
      ],
      popular: true,
      badge: "Most Popular",
      cta: "Start Creating",
      route: "/pricing",
    },
    {
      id: "pro",
      name: "Pro",
      price: isAnnual ? "$31" : "$39",
      period: "/mo",
      description: "Advanced tools for power users and scaling creators.",
      icon: Rocket,
      features: [
        { text: "Everything in Creator", included: true },
        { text: "AI Business Assistant", included: true },
        { text: "Priority AI processing", included: true },
        { text: "Early feature access", included: true },
        { text: "Advanced automation", included: true },
      ],
      popular: false,
      badge: "Best for Power Users",
      cta: "Upgrade to Pro",
      route: "/pricing",
    },
  ];

  // Reorder for mobile: Creator first
  const mobilePlans = [PLANS[1], PLANS[0], PLANS[2]];
  const desktopPlans = PLANS;

  return (
    <section id="pricing" ref={sectionRef} className="py-[120px] px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-up">
          <h2 className="text-[clamp(32px,5vw,56px)] font-bold mb-4 landing-heading text-[var(--text-primary)]">
            Simple, Transparent <span style={{ color: 'var(--accent)' }}>Pricing</span>
          </h2>
          <p className="text-[clamp(16px,2vw,20px)] text-[var(--text-muted)] max-w-2xl mx-auto landing-section mb-8">
            Start free. Upgrade when you're ready to export and grow.
          </p>

          {/* Annual Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm ${!isAnnual ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-12 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border)] relative transition-all"
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-[var(--accent)] transition-all ${isAnnual ? 'left-7' : 'left-1'}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isAnnual ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Yearly</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">20% OFF</span>
            </div>
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
          {desktopPlans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} navigate={navigate} />
          ))}
        </div>

        {/* Mobile Grid */}
        <div className="md:hidden flex flex-col gap-6">
          {mobilePlans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} navigate={navigate} />
          ))}
        </div>
      </div>
    </section>
  );
};

const PricingCard = ({ plan, index, navigate }: { plan: any, index: number, navigate: any }) => {
  const isCreator = plan.id === 'creator';
  const isPro = plan.id === 'pro';

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 transition-all animate-up ${isCreator ? 'pricing-creator z-10' : ''}`}
      style={{
        transitionDelay: `${index * 100}ms`,
        background: isCreator ? 'rgba(91, 79, 232, 0.08)' : 'var(--bg-card)',
        border: isCreator 
          ? '1px solid rgba(91, 79, 232, 0.6)' 
          : isPro 
            ? '1px solid rgba(16, 185, 129, 0.3)' 
            : '1px solid var(--border)',
        boxShadow: isCreator 
          ? '0 0 60px rgba(91, 79, 232, 0.25), inset 0 0 30px rgba(91, 79, 232, 0.05)' 
          : 'none',
        transform: isCreator ? 'scale(1.05)' : 'none',
      }}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`text-[10px] font-bold px-4 py-1 rounded-full whitespace-nowrap text-white landing-section shadow-lg ${isPro ? 'bg-emerald-500' : 'bg-[#5B4FE8]'}`} style={{ boxShadow: isPro ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 0 20px rgba(91, 79, 232, 0.4)' }}>
            {plan.badge}
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-xl mb-4" style={{ background: isCreator ? 'rgba(91, 79, 232, 0.2)' : 'rgba(255, 255, 255, 0.05)' }}>
          <plan.icon className="w-6 h-6" style={{ color: isCreator ? '#5B4FE8' : 'var(--text-muted)' }} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)] landing-heading">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-[var(--text-primary)] landing-heading">{plan.price}</span>
          {plan.period && <span className="text-sm text-[var(--text-muted)] landing-section">{plan.period}</span>}
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-2 landing-section">{plan.description}</p>
      </div>

      <div className="h-px bg-[var(--border)] mb-8" />

      <ul className="space-y-4 mb-8 flex-1">
        {plan.features.map((feature: any, i: number) => (
          <li key={i} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-[var(--cyan)]" />
            ) : (
              <X className="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-muted)]/30" />
            )}
            <span className={`text-sm landing-section ${feature.included ? 'text-[var(--text-primary)]/90' : 'text-[var(--text-muted)]/40'}`}>{feature.text}</span>
          </li>
        ))}
      </ul>

      <button
        className="w-full rounded-xl py-4 text-sm font-bold transition-all landing-section"
        style={{
          background: isCreator ? 'var(--accent)' : 'var(--bg-card)',
          color: 'white',
          border: isCreator ? 'none' : '1px solid var(--border)',
          boxShadow: isCreator ? '0 0 30px rgba(91, 79, 232, 0.3)' : 'none',
        }}
        onClick={() => navigate(plan.route)}
      >
        {plan.cta}
      </button>
    </div>
  );
};

export default PricingSection;
