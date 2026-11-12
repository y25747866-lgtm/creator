import { ArrowUpRight, LockKeyhole, Radar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";

function DeepSearchContent() {
  const { planType, hasPaidSubscription, loading, error } = useSubscription();
  const hasDeepSearchAccess = hasPaidSubscription && (planType === "pro" || planType === "hybrid");

  return (
    <main className="min-h-screen bg-[#080A0C] px-4 pb-12 pt-6 text-white sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-xs text-white/45">Research workspace</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Radar size={22} className="text-[#7022FC]" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight">Deep Search</h1>
            <span className="rounded-full border border-[#7022FC]/35 bg-[#7022FC]/10 px-2 py-1 text-[10px] font-bold tracking-[0.1em] text-[#7022FC]">PRO</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">A focused research space for finding, checking, and organizing useful sources.</p>
        </header>

        {loading ? (
          <div role="status" className="rounded-2xl border border-white/10 bg-[#111318] p-6 text-sm text-white/55">Checking plan access…</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-white/10 bg-[#111318] p-6 text-sm text-white/65">We couldn’t verify your plan. Refresh the page to try again.</div>
        ) : hasDeepSearchAccess ? (
          <section aria-labelledby="scout-title" className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111318] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#7022FC]/30 bg-[#7022FC]/10 text-[#7022FC]">
                  <Radar size={23} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7022FC]">SCOUT agent</p>
                  <h2 id="scout-title" className="mt-1 text-xl font-semibold tracking-tight">Coming Soon</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">SCOUT will search across trusted sources, synthesize the strongest findings, and keep citations connected to your research brief.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><Sparkles size={13} aria-hidden="true" /> In development</span>
            </div>
          </section>
        ) : (
          <section aria-labelledby="deep-search-upgrade-title" className="rounded-2xl border border-[#7022FC]/20 bg-[#111318] p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7022FC]/25 bg-[#7022FC]/10 text-[#7022FC]">
              <LockKeyhole size={19} aria-hidden="true" />
            </div>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7022FC]">Premium workspace</p>
            <h2 id="deep-search-upgrade-title" className="mt-2 text-xl font-semibold tracking-tight">Upgrade to unlock Deep Search</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">Deep Search is available with Pro and Hybrid AI OS plans. Upgrade to open the SCOUT research workspace.</p>
            <Link to="/pricing" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#080A0C] transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7022FC]">
              View plans <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

export default function DeepSearchPage() {
  return (
    <DashboardLayout>
      <DeepSearchContent />
    </DashboardLayout>
  );
}
