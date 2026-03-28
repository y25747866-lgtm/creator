import { useEffect, useRef } from "react";
import { Check, X, Zap, Crown, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const navigate = useNavigate();
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

  const PLANS = [
    {
      id: "free",
      name: "Starter",
      price: "$0",
      period: "/month",
      description: "Perfect for exploring and testing the platform.",
      icon: Zap,
      features: [
        { text: "1 AI generation per day", included: true },
        { text: "1 Marketing Studio / day", included: true },
        { text: "1 Sales Page / day", included: true },
        { text: "Basic Analytics", included: true },
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
      price: "$29",
      period: "/month",
      description: "Everything you need to create and monetize.",
      icon: Crown,
      features: [
        { text: "Unlimited AI Product Generation", included: true },
        { text: "Marketing Studio Pro", included: true },
        { text: "Sales Page Builder", included: true },
        { text: "Advanced Analytics", included: true },
        { text: "Unlimited Exports", included: true },
        { text: "Priority Support", included: true },
      ],
      popular: true,
      badge: "Most Popular",
      cta: "Start Creating",
      route: "/pricing",
    },
    {
      id: "pro",
      name: "Enterprise",
      price: "$99",
      period: "/month",
      description: "For scaling creators and power users.",
      icon: Rocket,
      features: [
        { text: "Everything in Creator", included: true },
        { text: "AI Business Assistant", included: true },
        { text: "Priority AI Processing", included: true },
        { text: "Early Feature Access", included: true },
        { text: "Advanced Automation", included: true },
        { text: "Dedicated Success Manager", included: true },
      ],
      popular: false,
      badge: "For Power Users",
      cta: "Upgrade to Enterprise",
      route: "/pricing",
    },
  ];

  const desktopPlans = PLANS;
  const mobilePlans = [PLANS[1], PLANS[0], PLANS[2]];

  return (
    <section id="pricing" ref={sectionRef} className="py-[140px] px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20 animate-up">
          <h2 className="text-[clamp(40px,6vw,64px)] font-[900] mb-6 landing-heading leading-tight">
            <span className="text-gradient">Simple, Transparent</span>
            <br />
            <span className="accent-gradient">Pricing</span>
          </h2>
          <p className="text-[clamp(18px,2vw,22px)] text-white/60 max-w-2xl mx-auto landing-section">
            Start free. Upgrade when you're ready to scale your business.
          </p>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 gap-8 items-stretch">
          {desktopPlans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} navigate={navigate} />
          ))}
        </div>

        {/* Mobile Grid */}
        <div className="md:hidden flex flex-col gap-8">
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
      className={`relative flex flex-col rounded-3xl p-10 transition-all animate-up ${isCreator ? 'pricing-creator z-10' : ''}`}
      style={{
        transitionDelay: `${index * 100}ms`,
        background: isCreator ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))' : 'var(--bg-card)',
        border: isCreator 
          ? '2px solid rgba(99, 102, 241, 0.5)' 
          : isPro 
            ? '1px solid rgba(34, 211, 238, 0.2)' 
            : '1px solid var(--border)',
        boxShadow: isCreator 
          ? '0 30px 60px -12px rgba(99, 102, 241, 0.3), inset 0 0 30px rgba(99, 102, 241, 0.05)' 
          : 'none',
        transform: isCreator ? 'scale(1.08)' : 'none',
      }}
    >
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className={`text-[11px] font-bold px-6 py-2 rounded-full whitespace-nowrap text-white landing-section shadow-lg ${isPro ? 'bg-cyan-600' : 'bg-indigo-600'}`} style={{ boxShadow: isPro ? '0 0 20px rgba(34, 211, 238, 0.4)' : '0 0 20px rgba(99, 102, 241, 0.4)' }}>
            {plan.badge}
          </span>
        </div>
      )}

      <div className="text-center mb-10">
        <div className="inline-flex p-4 rounded-2xl mb-6" style={{ background: isCreator ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <plan.icon className="w-8 h-8" style={{ color: isCreator ? '#6366F1' : '#94A3B8' }} />
        </div>
        <h3 className="text-2xl font-[900] mb-3 text-white landing-heading">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className="text-5xl font-[900] text-white landing-heading">{plan.price}</span>
          <span className="text-white/60 landing-section">{plan.period}</span>
        </div>
        <p className="text-white/60 landing-section">{plan.description}</p>
      </div>

      <div className="h-px bg-white/10 mb-10" />

      <ul className="space-y-5 mb-10 flex-1">
        {plan.features.map((feature: any, i: number) => (
          <li key={i} className="flex items-start gap-4">
            {feature.included ? (
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-indigo-400" />
            ) : (
              <X className="w-5 h-5 shrink-0 mt-0.5 text-white/20" />
            )}
            <span className={`text-base landing-section ${feature.included ? 'text-white/90' : 'text-white/40'}`}>{feature.text}</span>
          </li>
        ))}
      </ul>

      <button
        className={`w-full rounded-2xl py-5 text-base font-bold transition-all landing-section ${isCreator ? 'glass-button' : 'border border-white/10 bg-white/5 hover:bg-indigo-500/5 hover:border-indigo-500/30 text-white hover:text-white'}`}
        onClick={() => navigate(plan.route)}
      >
        {plan.cta}
      </button>
    </div>
  );
};

export default PricingSection;
