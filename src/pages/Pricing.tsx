import { useEffect, useMemo, useState } from "react";
import { Check, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isPaidPlan, isSubscriptionActive, normalizePlanType } from "@/lib/subscription";

const PAYMENT_LINKS = {
  creator: "https://whop.com/nexora-b5b0/creator-d2/?ref=related_products&funnelId=product_f1bf7e78-2e66-48fc-89fd-90cd24354d47",
  pro: "https://whop.com/nexora-b5b0/pro-24-ca4a/?ref=related_products&funnelId=product_cdcea7cf-32f3-489e-b11e-1b3014193cac",
};

type PlanDef = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
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
    features: [
      { text: "Everything in Creator", included: true },
      { text: "AI Business Assistant", included: true },
      { text: "Priority AI processing", included: true },
      { text: "Early feature access", included: true },
      { text: "Advanced automation tools", included: true },
    ],
    popular: false,
    badge: "Best for Power Users",
    cta: "Go Pro",
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
  }, [purchaseStarted, isReady]);

  return (
    <div className="min-h-screen bg-[#05050D] text-[#EFF0F4]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#05050D]/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl font-clash">
            <div className="w-8 h-8 bg-[#0A26E6] rounded flex items-center justify-center">
              <span className="text-white text-xs">N</span>
            </div>
            <span>NexoraOS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-[#9EA4C0] hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
            {user && (
              <Button variant="outline" onClick={handleSignOut} className="border-white/10 text-[#9EA4C0] hover:text-white gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-clash">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-[#9EA4C0] max-w-2xl mx-auto">
            Choose the plan that fits your stage of growth. No hidden fees.
          </p>
          {!user && (
            <p className="text-sm text-[#9EA4C0] mt-4">
              Already have an account?{" "}
              <button onClick={() => navigate("/auth")} className="text-[#0A26E6] hover:underline font-medium">Sign in</button>
            </p>
          )}
        </div>

        {user && purchaseStarted && (
          <div className="max-w-5xl mx-auto mb-8 animate-fade-in">
            <Card className="bg-[#0F172A] border-white/10 p-6 text-left">
              <p className="text-sm text-[#9EA4C0]">
                After completing checkout, come back to this tab. We'll unlock your account as soon as the payment confirmation arrives.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button onClick={checkAccessNow} disabled={checkingAccess} className="bg-[#0A26E6] hover:bg-[#081eb8] text-white sm:w-auto">
                  {checkingAccess ? "Checking…" : "I've paid — Unlock access"}
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="border-white/10 text-[#9EA4C0] hover:text-white sm:w-auto">
                  Go to Dashboard
                </Button>
              </div>
            </Card>
          </div>
        )}

        <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start" aria-label="Pricing plans">
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              className={`animate-fade-in h-full`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Card
                className={`bg-[#0F172A] p-8 relative h-full flex flex-col rounded-2xl border transition-all duration-200 ${
                  plan.popular
                    ? "border-[#0A26E6] shadow-xl shadow-[#0A26E6]/10"
                    : "border-white/10 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#0A26E6] text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2 font-clash">{plan.name}</h2>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-sm text-[#6B7280]">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-[#9EA4C0] leading-relaxed">{plan.description}</p>
                </div>
                <div className="border-t border-white/5 my-1" />
                <ul className="space-y-4 mb-8 flex-1 pt-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${feature.included ? "text-[#0A26E6]" : "text-white/10"}`} />
                      <span className={`text-sm ${feature.included ? "text-[#9EA4C0]" : "text-white/20"}`}>{feature.text}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className={`w-full rounded-lg font-bold transition-all ${
                    plan.popular 
                      ? "bg-[#0A26E6] hover:bg-[#081eb8] text-white" 
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                  onClick={() => handlePurchase(plan)}
                >
                  {plan.cta}
                </Button>
              </Card>
            </div>
          ))}
        </section>

        <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-sm text-[#6B7280]">Secure payment processing powered by Whop • Cancel anytime</p>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
