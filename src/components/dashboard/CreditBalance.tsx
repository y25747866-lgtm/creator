import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Coins, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CREDIT_PACKS = [
  { credits: 1_000, price: "$19", href: "https://whop.com/checkout/plan_P7Ank0qdHtHHF" },
  { credits: 5_000, price: "$49", href: "https://whop.com/checkout/plan_YvUfetosyziGZ" },
] as const;

const PLAN_CEILINGS: Record<string, number | null> = {
  starter: 1_000,
  pro: 4_000,
  hybrid: null,
};

type CreditBalanceProps = { showLabels: boolean };

type CreditRow = { balance: number | null };
type ProfileRow = { plan_type: string | null };

const formatCredits = (value: number) => new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));

const normalizePlanType = (value: string | null | undefined) => {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "hybrid" || normalized === "hybrid-ai-os") return "hybrid";
  if (normalized === "pro") return "pro";
  return "starter";
};

export default function CreditBalance({ showLabels }: CreditBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [planType, setPlanType] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [packsOpen, setPacksOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setBalance(0);
      setPlanType("starter");
      setLoading(false);
      return;
    }

    setLoading(true);
    const loadCredits = async () => {
      const [creditResult, profileResult] = await Promise.all([
        supabase.from("user_credits").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("plan_type").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (creditResult.error) console.error("Failed to load credit balance:", creditResult.error);
      if (profileResult.error) console.error("Failed to load plan tier:", profileResult.error);
      setBalance(Number((creditResult.data as CreditRow | null)?.balance ?? 0));
      setPlanType(normalizePlanType((profileResult.data as ProfileRow | null)?.plan_type));
      setLoading(false);
    };

    void loadCredits();
    return () => { cancelled = true; };
  }, [user?.id]);

  const ceiling = PLAN_CEILINGS[planType];
  const topUpsAvailable = planType === "pro" || planType === "hybrid";
  const percentage = useMemo(() => ceiling ? Math.min(100, Math.max(0, (balance / ceiling) * 100)) : 0, [balance, ceiling]);
  const strokeOffset = 100 - percentage;

  if (!showLabels) {
    return (
      <div className="flex justify-center border-t border-[#111318] px-2 py-3" title={`${formatCredits(balance)} credits`}>
        <Coins size={17} className="text-white/60" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="border-t border-[#111318] px-3 py-3" data-testid="credit-balance">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative h-9 w-9 shrink-0" aria-label={ceiling ? `${formatCredits(balance)} of ${formatCredits(ceiling)} credits` : `${formatCredits(balance)} credits`}>
            {ceiling ? (
              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" pathLength="100" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#D6DCE5" strokeWidth="3" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={strokeOffset} />
              </svg>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15">
                <Coins size={15} className="text-white/70" aria-hidden="true" />
              </div>
            )}
            {ceiling && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white">{Math.round(percentage)}%</span>}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Credits</p>
            <p className="truncate text-sm font-semibold text-white" aria-live="polite">{loading ? "Loading…" : formatCredits(balance)}</p>
          </div>
        </div>
        {topUpsAvailable && (
          <div className="relative shrink-0">
            <button type="button" onClick={() => setPacksOpen((open) => !open)} aria-expanded={packsOpen} aria-haspopup="menu" className="flex min-h-8 items-center gap-1 rounded-lg border border-white/15 px-2 text-[10px] text-white/70 transition hover:bg-white/[0.06] hover:text-white">
              Top up <ChevronDown size={12} aria-hidden="true" />
            </button>
            {packsOpen && (
              <div role="menu" aria-label="Credit top-up packs" className="absolute bottom-10 right-0 z-50 w-48 rounded-xl border border-white/15 bg-[#111318] p-1.5 shadow-2xl">
                {CREDIT_PACKS.map((pack) => (
                  <a key={pack.credits} href={pack.href} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setPacksOpen(false)} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs text-white/75 transition hover:bg-white/[0.07] hover:text-white">
                    <span>{formatCredits(pack.credits)} cr</span>
                    <span className="flex items-center gap-1 text-white/50">{pack.price} <ExternalLink size={11} aria-hidden="true" /></span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {!loading && ceiling && <p className="mt-2 text-[10px] text-white/35">{formatCredits(balance)} / {formatCredits(ceiling)} monthly credits</p>}
      {!loading && !ceiling && <p className="mt-2 text-[10px] text-white/35">Top-up packs available</p>}
      {loading && <Loader2 className="mt-2 h-3 w-3 animate-spin text-white/35" aria-label="Loading credits" />}
    </div>
  );
}
