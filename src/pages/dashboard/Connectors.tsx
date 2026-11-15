import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Lock, PlugZap, Search } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";

const connectorList = [
  { name: "Gmail", category: "Communication", description: "Email, drafts, and inbox search" },
  { name: "Slack", category: "Communication", description: "Channels, messages, and team updates" },
  { name: "Google Drive", category: "Productivity", description: "Files, folders, and shared documents" },
  { name: "Google Calendar", category: "Productivity", description: "Events, availability, and reminders" },
  { name: "Notion", category: "Productivity", description: "Pages, databases, and workspace search" },
  { name: "GitHub", category: "Developer tools", description: "Repositories, issues, and pull requests" },
  { name: "Vercel", category: "Developer tools", description: "Deployments and project status" },
  { name: "Supabase", category: "Developer tools", description: "Your configured data and application services" },
  { name: "Mailchimp", category: "Marketing", description: "Campaigns and audience lists" },
  { name: "Stripe", category: "Finance", description: "Revenue and payment links" },
];

export default function Connectors() {
  const { planType, hasPaidSubscription, subscription } = useSubscription();
  const [search, setSearch] = useState("");
  const isAllowed = (planType === "creator" || planType === "pro") && hasPaidSubscription && subscription?.status !== "expired";
  const filtered = useMemo(() => connectorList.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const categories = Array.from(new Set(filtered.map((item) => item.category)));

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1440px] p-6 sm:p-10">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-[#888888]"><PlugZap className="h-4 w-4" /> CONNECTORS</div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#e8e8e8]">Connect your workspace</h1>
          <p className="mt-2 text-sm leading-6 text-[#888888]">Bring the tools your agents work with into one place.</p>
        </div>

        {!isAllowed ? (
          <section className="max-w-2xl rounded-[14px] border border-[#2a2a2a] bg-[#1a1a1a] p-6 sm:p-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#202020] text-[#888888]"><Lock className="h-5 w-5" /></div>
            <h2 className="text-lg font-semibold text-[#e8e8e8]">Available on Pro and Hybrid AI OS</h2>
            <p className="mt-2 text-sm leading-6 text-[#888888]">Upgrade your plan to explore workspace connectors.</p>
            <Link to="/pricing" className="mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#00e68e] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#31f2a6]">View plans <ArrowUpRight className="h-4 w-4" /></Link>
          </section>
        ) : (
          <>
            <label className="mb-7 flex max-w-xl items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-[#888888] focus-within:border-[#00e68e]/50">
              <Search className="h-4 w-4 shrink-0" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search connectors" className="w-full bg-transparent text-sm text-[#e8e8e8] outline-none placeholder:text-[#666666]" />
            </label>
            <div className="space-y-8">
              {categories.map((category) => (
                <section key={category}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#888888]">{category}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.filter((item) => item.category === category).map((item) => (
                      <article key={item.name} className="flex min-h-[112px] items-start gap-3 rounded-[14px] border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition-colors hover:border-[#00e68e]/40">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#303030] bg-[#202020] text-xs font-semibold text-[#e8e8e8]">{item.name.slice(0, 1)}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-[#e8e8e8]">{item.name}</h3>
                          <p className="mt-1 text-xs leading-5 text-[#888888]">{item.description}</p>
                        </div>
                        <span className="mt-0.5 rounded-md border border-[#303030] px-2 py-1 text-[10px] text-[#888888]">Connect</span>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              {filtered.length === 0 && <p className="text-sm text-[#888888]">No connectors match that search.</p>}
            </div>
            <p className="mt-8 text-xs text-[#666666]">Connector authorization is not enabled from this frontend-only hub.</p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
