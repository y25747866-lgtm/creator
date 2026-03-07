import { motion } from "framer-motion";
import { Check, X, Zap, Crown, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    description: "Explore the platform. Upgrade to export and monetize.",
    icon: Zap,
    features: [
      { text: "1 AI Product Generation per day", included: true },
      { text: "1 Marketing Studio generation per day", included: true },
      { text: "1 Sales Page generation per day", included: true },
      { text: "Analytics Dashboard (view access)", included: true },
      { text: "Downloads & Exports", included: false },
      { text: "AI Business Assistant", included: false },
    ],
    popular: false,
    cta: "Start Free",
    note: "Create products for free. Upgrade to export and monetize.",
    route: "/auth",
  },
  {
    id: "creator",
    name: "Creator",
    price: "$19",
    period: "/month",
    description: "Everything you need to create and sell digital products.",
    icon: Crown,
    features: [
      { text: "AI Product Generator (full access)", included: true },
      { text: "Marketing Studio", included: true },
      { text: "Sales Page Builder", included: true },
      { text: "Analytics Dashboard", included: true },
      { text: "Downloads & Exports", included: true },
      { text: "AI Business Assistant", included: false },
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
    period: "/month",
    description: "Advanced tools for power users and scaling creators.",
    icon: Rocket,
    features: [
      { text: "Everything in Creator", included: true },
      { text: "AI Business Assistant", included: true },
      { text: "Priority AI processing", included: true },
      { text: "Early feature access", included: true },
      { text: "Advanced automation tools", included: true },
    ],
    popular: false,
    badge: "Best for Power Users",
    cta: "Upgrade to Pro",
    route: "/pricing",
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade when you're ready to export and grow your digital business.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -3 }}
              className={plan.popular ? "md:-mt-3 md:mb-3" : ""}
            >
              <Card
                className={`bg-card p-7 relative h-full flex flex-col rounded-2xl border transition-all duration-200 ${
                  plan.popular
                    ? "border-primary/40 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15"
                    : "border-border shadow-sm hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-3.5 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-5">
                  <div
                    className={`inline-flex p-2.5 rounded-xl mb-3 ${
                      plan.popular ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <plan.icon
                      className={`w-5 h-5 ${
                        plan.popular ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-1.5">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {plan.description}
                  </p>
                </div>

                <div className="border-t border-border/40 my-1" />

                <ul className="space-y-2.5 mb-6 flex-1 pt-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? "" : "text-muted-foreground/50"}`}>{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className="w-full rounded-lg h-10 text-sm"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate(plan.route)}
                >
                  {plan.cta}
                </Button>
                {plan.note && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2.5">{plan.note}</p>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
