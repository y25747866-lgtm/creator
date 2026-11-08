import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isPaidPlan, isSubscriptionActive, normalizePlanType } from "@/lib/subscription";
import nexoraLogo from "@/assets/nexora-logo.webp";

const PAYMENT_LINKS = {
  starter: "https://whop.com/checkout/plan_P7Ank0qdHtHHF",
  pro: "https://whop.com/checkout/plan_YvUfetosyziGZ",
  hybrid: "https://whop.com/checkout/plan_o0WkvL4RKGBw6/?session=chs_3XG1bMPMla6fNj",
};

type Feature = { text: string; included: boolean };
type PlanDef = {
  id: "starter" | "pro" | "hybrid";
  name: string;
  price: string;
  description: string;
  credits: string;
  features: Feature[];
  popular?: boolean;
  badge: string;
  cta: string;
  link?: string;
};

const PLANS: PlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$19",
    description: "The focused toolkit for creating and launching your first products.",
    credits: "1,000 credits / month",
    features: [
      { text: "AI Product Generator (1 product/month)", included: true },
      { text: "Marketing Studio", included: true },
      { text: "Sales Page Builder", included: true },
      { text: "Analytics Dashboard", included: false },
      { text: "Agent system", included: false },
    ],
    badge: "",
    cta: "Start Creating",
    link: PAYMENT_LINKS.starter,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    description: "More capacity, deeper insight, and a faster path from idea to sales.",
    credits: "4,000 credits / month",
    features: [
      { text: "Everything in Starter", included: true },
      { text: "Analytics Dashboard", included: true },
      { text: "Downloads & Exports", included: true },
      { text: "Priority generation queue", included: true },
      { text: "Credit top-up packs available", included: true },
    ],
    popular: true,
    badge: "Most Popular",
    cta: "Go Pro",
    link: PAYMENT_LINKS.pro,
  },
  {
    id: "hybrid",
    name: "Hybrid AI OS",
    price: "$249",
    description: "The full AI operating system for teams running ambitious workflows.",
    credits: "10,000 credits / month",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Full NEXUS, SCOUT, FLUX, FORGE, APEX agent system", included: true },
      { text: "Zep persistent memory (NEXUS)", included: true },
      { text: "MiroFish swarm research (SCOUT)", included: true },
      { text: "Multi-agent parallel execution", included: true },
      { text: "WhatsApp + Telegram delivery", included: true },
      { text: "Priority support", included: true },
    ],
    badge: "Full AI Operating System",
    cta: "Start Hybrid AI OS",
    link: PAYMENT_LINKS.hybrid,
  },
];

const COMPARISON_ROWS = [
  { feature: "Monthly credits", values: ["1,000", "4,000", "10,000"] },
  { feature: "Product Generator", values: [true, true, true] },
  { feature: "Marketing Studio", values: [true, true, true] },
  { feature: "Sales Page Builder", values: [true, true, true] },
  { feature: "Analytics", values: [false, true, true] },
  { feature: "Credit top-ups", values: [false, true, true] },
  { feature: "Agent system", values: [false, false, true] },
  { feature: "Priority support", values: [false, false, true] },
] as const;

const Pricing = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasPaidSubscription, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  const [purchaseStarted, setPurchaseStarted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const isReady = useMemo(() => !!user && !subLoading, [user, subLoading]);

  useEffect(() => {
    if (hasPaidSubscription) navigate("/dashboard", { replace: true });
  }, [hasPaidSubscription, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out" });
    navigate("/");
  };

  const checkAccessNow = useCallback(async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
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
    } finally {
      setCheckingAccess(false);
    }
  }, [navigate, toast, user]);

  useEffect(() => {
    if (!purchaseStarted || !isReady) return;
    const onFocus = () => void checkAccessNow();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [checkAccessNow, isReady, purchaseStarted]);

  const handlePurchase = (plan: PlanDef) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!plan.link) {
      toast({ title: "Hybrid AI OS checkout is not configured yet", description: "Please contact support to start the Hybrid AI OS plan." });
      return;
    }
    setPurchaseStarted(true);
    window.open(plan.link, "_blank");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A0C] text-[#F0F2F5] selection:bg-[#00E68E] selection:text-[#080A0C]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="border-b border-white/[0.07] bg-[#080A0C]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="NexoraOS home">
            <img src={nexoraLogo} alt="NexoraOS" width="32" height="32" className="h-8 w-8" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>NexoraOS</span>
          </Link>
          <div className="flex items-center gap-3">
            {!user && (
              <button type="button" onClick={() => navigate("/auth")} className="text-sm text-[#A6ADB8] transition hover:text-white">
                Already have an account? <span className="font-semibold text-[#F0F2F5] underline underline-offset-4">Sign in</span>
              </button>
            )}
            {user && (
              <Button variant="outline" onClick={handleSignOut} className="gap-2 border-white/10 bg-transparent text-[#A6ADB8] hover:bg-[#1A1D24] hover:text-white">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#6B7280]">NexoraOS membership</p>
          <h1 className="text-4xl font-bold tracking-[-0.04em] text-[#F0F2F5] sm:text-6xl" style={{ fontFamily: "'Syne', sans-serif" }}>Build more. Operate smarter.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6B7280] sm:text-lg">Choose the operating level that matches your ambition. Every plan is built around useful output, not feature clutter.</p>
        </div>

        {user && purchaseStarted && (
          <div className="mx-auto mb-8 mt-10 max-w-5xl">
            <Card className="border-white/[0.08] bg-[#111318] p-5 text-left">
              <p className="text-sm text-[#A6ADB8]">After completing checkout, come back to this tab. We&apos;ll unlock your account as soon as the payment confirmation arrives.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button onClick={checkAccessNow} disabled={checkingAccess} className="bg-[#F0F2F5] text-[#080A0C] hover:bg-white sm:w-auto">{checkingAccess ? "Checking…" : "I&apos;ve paid — Unlock access"}</Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="border-white/10 bg-transparent text-[#A6ADB8] hover:bg-[#1A1D24] hover:text-white sm:w-auto">Go to Dashboard</Button>
              </div>
            </Card>
          </div>
        )}

        <section className="mx-auto mt-12 grid max-w-6xl items-stretch gap-4 lg:grid-cols-3" aria-label="Pricing plans">
          {PLANS.map((plan) => (
            <Card key={plan.id} className={`relative flex h-full flex-col rounded-2xl border bg-[#111318] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-8 ${plan.popular ? "border-[#00E68E] shadow-[0_0_0_1px_rgba(0,230,142,0.2),0_20px_70px_rgba(0,230,142,0.08)]" : "border-white/[0.08]"}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-6">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${plan.popular ? "border-[#00E68E] bg-[#111318] text-[#00E68E]" : "border-white/20 bg-[#1A1D24] text-[#A6ADB8]"}`}>{plan.badge}</span>
                </div>
              )}
              <div className="border-b border-white/[0.08] pb-7">
                <h2 className="text-xl font-bold tracking-tight text-[#F0F2F5]">{plan.name}</h2>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-[-0.06em] text-[#F0F2F5]">{plan.price}</span>
                  <span className="text-sm text-[#6B7280]">/month</span>
                </div>
                <p className={`mt-5 text-sm font-semibold ${plan.popular ? "text-[#00E68E]" : "text-[#A6ADB8]"}`}>{plan.credits}</p>
                <p className="mt-3 min-h-12 text-sm leading-6 text-[#6B7280]">{plan.description}</p>
              </div>
              <ul className="flex-1 space-y-4 py-7">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3 text-sm leading-5">
                    {feature.included ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00E68E]" aria-hidden="true" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden="true" />}
                    <span className={feature.included ? "text-[#D6DAE0]" : "text-[#6B7280]"}>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => handlePurchase(plan)} className={`w-full rounded-xl font-semibold ${plan.popular ? "bg-[#00E68E] text-[#080A0C] hover:bg-[#2AF0A7]" : "border border-white/15 bg-[#1A1D24] text-[#F0F2F5] hover:bg-[#242832]"}`}>{plan.cta}</Button>
            </Card>
          ))}
        </section>

        <section className="mx-auto mt-20 max-w-6xl" aria-labelledby="comparison-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">Side by side</p>
              <h2 id="comparison-heading" className="mt-2 text-2xl font-bold tracking-tight text-[#F0F2F5]">Compare what&apos;s included</h2>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#111318]">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-[#A6ADB8]">
                  <th className="px-5 py-4 font-medium">Feature</th>
                  {PLANS.map((plan) => <th key={plan.id} className={`px-5 py-4 font-semibold ${plan.popular ? "text-[#00E68E]" : "text-[#F0F2F5]"}`}>{plan.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-white/[0.06] last:border-0">
                    <th scope="row" className="px-5 py-4 font-medium text-[#A6ADB8]">{row.feature}</th>
                    {row.values.map((value, index) => (
                      <td key={`${row.feature}-${index}`} className="px-5 py-4 text-[#D6DAE0]">{typeof value === "boolean" ? (value ? <Check className="h-4 w-4 text-[#00E68E]" aria-label="Included" /> : <X className="h-4 w-4 text-[#6B7280]" aria-label="Not included" />) : value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[#6B7280]">Secure payment processing powered by Whop · Cancel anytime</p>
          <button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm text-[#A6ADB8] transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to home</button>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
