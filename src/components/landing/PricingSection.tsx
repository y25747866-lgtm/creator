import { useEffect, useRef, useState } from "react";
import { Check, X, Zap, Crown, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    price: "$19",
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
    price: "$39",
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

const PricingSection = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="pricing" ref={ref} className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 landing-heading">
            <span className="text-white">Simple, Transparent </span>
            <span style={{ color: '#5B4FE8' }}>Pricing</span>
          </h2>
          <p className="text-base text-white/50 max-w-2xl mx-auto landing-section">
            Start free. Upgrade when you're ready to export and grow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative h-full flex flex-col rounded-2xl p-7 transition-all duration-700 ${plan.popular ? 'md:-mt-3 md:mb-3' : ''} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{
                transitionDelay: `${index * 100 + 200}ms`,
                background: 'rgba(255,255,255,0.04)',
                border: plan.popular ? '1px solid rgba(91, 79, 232, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: plan.popular ? '0 0 40px rgba(91, 79, 232, 0.15)' : 'none',
              }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-semibold px-3.5 py-1 rounded-full whitespace-nowrap text-white landing-section" style={{ background: '#5B4FE8' }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-5">
                <div className="inline-flex p-2.5 rounded-xl mb-3" style={{ background: plan.popular ? 'rgba(91, 79, 232, 0.15)' : 'rgba(255,255,255,0.06)' }}>
                  <plan.icon className="w-5 h-5" style={{ color: plan.popular ? '#5B4FE8' : 'rgba(255,255,255,0.5)' }} />
                </div>
                <h3 className="text-xl font-bold mb-1.5 text-white landing-heading">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-white landing-heading">{plan.price}</span>
                  {plan.period && <span className="text-sm text-white/40 landing-section">{plan.period}</span>}
                </div>
                <p className="text-xs text-white/40 mt-1.5 landing-section">{plan.description}</p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="my-1" />

              <ul className="space-y-2.5 mb-6 flex-1 pt-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#00FFD1' }} />
                    ) : (
                      <X className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    )}
                    <span className={`text-sm landing-section ${feature.included ? 'text-white/80' : 'text-white/30'}`}>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <button
                className="w-full rounded-lg h-10 text-sm font-semibold transition-all landing-section"
                style={{
                  background: plan.popular ? 'linear-gradient(135deg, #5B4FE8, #7C3AED)' : 'rgba(255,255,255,0.06)',
                  color: 'white',
                  border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}
                onClick={() => navigate(plan.route)}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
