import { motion } from "framer-motion";
import { Check, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$50.99",
    period: "/month",
    description: "Full access to all NexoraOS features",
    icon: Zap,
    features: [
      "Unlimited AI Ebook Generation",
      "Professional PDF Downloads",
      "Custom Cover Images",
      "Priority Support",
    ],
    popular: false,
    link: "https://whop.com/checkout/plan_cGgxUSfDmR2xF",
  },
  {
    id: "annual",
    name: "Annual",
    price: "$599",
    period: "/year",
    description: "Best value — save over $12/month",
    icon: Crown,
    features: [
      "Everything in Monthly",
      "Save $12+ per month",
      "Extended Support",
      "Early Access to Features",
    ],
    popular: true,
    link: "https://whop.com/checkout/plan_xNlBWUTysLURE",
    badge: "Best Value",
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
            Choose the plan that works for you. Full access to all features, no hidden fees.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                  onClick={() => navigate("/pricing")}
                >
                  Get Started
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
