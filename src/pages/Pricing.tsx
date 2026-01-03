import { motion } from "framer-motion";
import { Check, Zap, Crown, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Background3D from "@/components/Background3D";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import nexoraLogo from "@/assets/nexora-logo.png";
import { useToast } from "@/hooks/use-toast";

// Payment links configuration - easily replaceable
const PAYMENT_LINKS = {
  monthly: "https://whop.com/checkout/plan_cGgxUSfDmR2xF",
  annual: "https://whop.com/checkout/plan_xNlBWUTysLURE",
};

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
      "All Future Updates",
    ],
    popular: false,
    link: PAYMENT_LINKS.monthly,
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
      "Exclusive Content",
    ],
    popular: true,
    link: PAYMENT_LINKS.annual,
    badge: "Best Value",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  const handlePurchase = (link: string) => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

  // If user has active subscription, redirect to dashboard
  if (hasActiveSubscription) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Background3D />

      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={nexoraLogo} alt="NexoraOS" className="h-8 w-auto" />
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Home
                </Button>
                {user && (
                  <Button variant="outline" onClick={handleSignOut} className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Pricing Section */}
        <div className="container mx-auto px-6 pt-32 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your <span className="gradient-text">Plan</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlock the full power of NexoraOS. Start creating professional AI-generated ebooks today.
            </p>
            {!user && (
              <p className="text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/auth")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className={`glass-panel p-8 relative h-full flex flex-col ${
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
                        plan.popular
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      <plan.icon
                        className={`w-6 h-6 ${
                          plan.popular ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
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
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => {
                      if (!user) {
                        navigate("/auth");
                        return;
                      }
                      handlePurchase(plan.link);
                    }}
                  >
                    {user ? "Get Started" : "Sign Up to Purchase"}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Secure payment processing powered by Whop • Cancel anytime
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
