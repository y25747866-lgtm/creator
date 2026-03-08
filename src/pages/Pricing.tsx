import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Zap, Crown, Rocket, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Background3D from "@/components/Background3D";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import nexoraLogo from "@/assets/nexora-logo.png";
import { useToast } from "@/hooks/use-toast";
import { isPaidPlan, isSubscriptionActive, normalizePlanType } from "@/lib/subscription";

const PAYMENT_LINKS = {
  creator: "https://whop.com/checkout/5q5mTvNs1ODMBL3RPr-Z5Wp-Zly1-KwwP-lGktR6dgK7UO/",
  pro: "https://whop.com/checkout/plan_PFB3YG5Pyzlme",
};

type PlanDef = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: typeof Zap;
  features: { text: string; included: boolean }[];
  popular: boolean;
  badge?: string;
  cta: string;
  link?: string;
};

const PLANS: PlanDef[] = [
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
      { text: "Marketing Studio (full access)", included: true },
      { text: "Sales Page Builder (full access)", included: true },
      { text: "Analytics Dashboard", included: true },
      { text: "Downloads & Exports", included: true },
      { text: "AI Business Assistant", included: false },
    ],
    popular: true,
    badge: "Most Popular",
    cta: "Start Creating",
    link: PAYMENT_LINKS.creator,
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
    link: PAYMENT_LINKS.pro,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasPaidSubscription, loading: subLoading } = useSubscription();
  const { toast } = useToast();

  const [purchaseStarted, setPurchaseStarted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

  const isReady = useMemo(() => !!user && !subLoading, [user, subLoading]);

  // Redirect only if user has a PAID plan
  useEffect(() => {
    if (hasPaidSubscription) {
      navigate("/dashboard", { replace: true });
    }
  }, [hasPaidSubscription, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out" });
    navigate("/");
  };

  const handlePurchase = (plan: PlanDef) => {
    if (!user) { navigate("/auth"); return; }
    if (plan.id === "free") { navigate("/dashboard"); return; }
    if (plan.link) {
      setPurchaseStarted(true);
      window.open(plan.link, "_blank");
    }
  };

  const checkAccessNow = async () => {
    if (!user) { navigate("/auth"); return; }
    setCheckingAccess(true);
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status, plan_type, expires_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const paid = !!data && isSubscriptionActive(data) && isPaidPlan(normalizePlanType(data.plan_type));

      if (paid) {
        navigate("/dashboard", { replace: true });
      } else {
        toast({ title: "No paid subscription found", description: "Complete payment to unlock access." });
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
    setCheckingAccess(false);
  };


  useEffect(() => {
    if (!purchaseStarted || !isReady) return;
    const onFocus = () => { void checkAccessNow(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseStarted, isReady]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Background3D />
      <div className="relative z-10 min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={nexoraLogo} alt="NexoraOS logo" className="h-8 w-auto" loading="lazy" />
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Home
                </Button>
                {user && (
                  <Button variant="outline" onClick={handleSignOut} className="gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 pt-32 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent <span className="gradient-text">Pricing</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade when you're ready to export and grow your digital business.
            </p>
            {!user && (
              <p className="text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">Sign in</button>
              </p>
            )}
          </motion.div>

          {user && purchaseStarted && (
            <div className="max-w-5xl mx-auto mb-8">
              <Card className="glass-panel p-6 text-left">
                <p className="text-sm text-muted-foreground">
                  After completing checkout, come back to this tab. We'll unlock your account as soon as the payment confirmation arrives.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Button onClick={checkAccessNow} disabled={checkingAccess} className="sm:w-auto">
                    {checkingAccess ? "Checking…" : "I've paid — Unlock access"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard")} className="sm:w-auto">
                    Go to Dashboard
                  </Button>
                </div>
              </Card>
            </div>
          )}

          <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start" aria-label="Pricing plans">
            {PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
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
                    <div className={`inline-flex p-2.5 rounded-xl mb-3 ${plan.popular ? "bg-primary/10" : "bg-muted"}`}>
                      <plan.icon className={`w-5 h-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <h2 className="text-2xl font-bold mb-1.5">{plan.name}</h2>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{plan.description}</p>
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
                    onClick={() => handlePurchase(plan)}
                  >
                    {plan.cta}
                  </Button>
                  {plan.id === "free" && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2.5">Create products for free. Upgrade to export and monetize.</p>
                  )}
                </Card>
              </motion.div>
            ))}
          </section>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">Secure payment processing powered by Whop • Cancel anytime</p>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Pricing;
