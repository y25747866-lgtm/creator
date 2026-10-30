import { Link } from "react-router-dom";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";

const agents = [
  { name: "NEXUS", role: "Orchestrator", description: "Coordinates the work and keeps every agent moving toward your goal.", state: "Ready" },
  { name: "SCOUT", role: "Researcher", description: "Finds signals, context, and useful opportunities for your idea.", state: "Idle" },
  { name: "FLUX", role: "Creative", description: "Shapes concepts, messaging, and visual directions.", state: "Idle" },
  { name: "FORGE", role: "Builder", description: "Turns plans into products and launch-ready assets.", state: "Idle" },
  { name: "APEX", role: "Strategist", description: "Connects the pieces into a focused growth plan.", state: "Idle" },
];

export default function HybridAIOS() {
  const { planType, hasPaidSubscription, subscription } = useSubscription();
  const isHybrid = planType === "pro" && hasPaidSubscription && subscription?.status !== "expired";

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1440px] p-6 sm:p-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-[#7928ca]"><Sparkles className="h-4 w-4" /> HYBRID AI OS</div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#e8e8e8]">Your agent command center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#888888]">Five focused agents work together to take an idea from research to launch.</p>
          </div>
        </div>

        {!isHybrid ? (
          <section className="max-w-2xl rounded-[14px] border border-[#2a2a2a] bg-[#1a1a1a] p-6 sm:p-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#21152d] text-[#a875e8]"><Lock className="h-5 w-5" /></div>
            <h2 className="text-lg font-semibold text-[#e8e8e8]">Made for Hybrid AI OS</h2>
            <p className="mt-2 text-sm leading-6 text-[#888888]">Unlock the five-agent workspace with the Hybrid AI OS plan.</p>
            <Link to="/pricing" className="mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#7928ca] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#8c42d7]">Explore plans <ArrowUpRight className="h-4 w-4" /></Link>
          </section>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent, index) => (
              <article key={agent.name} className="rounded-[14px] border border-[#2a2a2a] bg-[#1a1a1a] p-5 transition-colors hover:border-[#414141]">
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#39224d] bg-[#24152f] text-sm font-bold tracking-wide text-[#b07be9]">{agent.name.slice(0, 1)}</span>
                  <span className="flex items-center gap-2 text-xs text-[#888888]"><i className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-[#00e68e]" : "bg-[#555555]"}`} />{agent.state}</span>
                </div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-[#a875e8]">{agent.name}</p>
                <h2 className="mt-1 text-base font-semibold text-[#e8e8e8]">{agent.role}</h2>
                <p className="mt-2 text-sm leading-6 text-[#888888]">{agent.description}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
