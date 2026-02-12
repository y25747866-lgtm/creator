import { motion } from "framer-motion";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PLANS = [
  {
    id: "trial",
    name: "Free Trial",
    price: "$0",
    period: "10 min",
    description: "Experience the full OS — no credit card required",
    icon: Zap,
    features: [
      "Full product creation access",
      "Monetization engine preview",
      "Analytics dashboard access",
      "Downloads & exports disabled",
    ],
    popular: false,
    cta: "Start Free Trial",
    route: "/dashboard",
  },
  {
    id: "creator",
    name: "Creator",
    price: "$50.99",
    period: "/month",
    description: "Full access to create, monetize, and export",
    icon: Crown,
    features: [
      "Unlimited AI Product Creation",
      "Monetization Engine Access",
      "Funnel + Course Builder",
      "Analytics Dashboard",
      "Download & Export System",
      "Priority Support",
    ],
    popular: true,
    badge: "Most Popular",
    cta: "Get Creator",
    route: "/pricing",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "Enterprise-grade AI with self-evolving intelligence",
    icon: Rocket,
    features: [
      "Everything in Creator",
      "Self-Evolving AI System",
      "Micro SaaS Blueprints",
      "Version Intelligence",
      "Priority AI Queue",
      "Early Feature Access",
    ],
    popular: false,
    badge: "Best Value",
    cta: "Go Pro",
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade when you're ready to export and scale.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card
                className={`glass-panel p-8 relative h-full flex flex-col hover-lift ${
                  plan.popular
                    ? "border-primary/50 shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`inline-flex p-3 rounded-xl mb-4 ${
                      plan.popular ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <plan.icon
                      className={`w-6 h-6 ${
                        plan.popular ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate(plan.route)}
                >
                  {plan.cta}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
