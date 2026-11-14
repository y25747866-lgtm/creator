import { lazy, Suspense, useState } from "react";
import { BookOpen, Brain, ChevronRight, Network, ShieldCheck } from "lucide-react";
import type { BotAvatarType } from "bot-avatars";

type AgentName = "SCOUT" | "NEXUS" | "FORGE" | "FLUX" | "APEX";
export type AgentStatus = "idle" | "working" | "sleeping";
type AgentTeamProps = { status?: AgentStatus; workingAgent?: AgentName | null };
type Agent = { name: AgentName; role: string; description: string; avatar: BotAvatarType };

const LazyAgentAvatar = lazy(async () => {
  const module = await import("bot-avatars");
  return { default: module.BotAvatar };
});
const LazyScoutAgent = lazy(() => import("@/components/agents/ScoutAgent"));
const LazyForgeAgent = lazy(() => import("@/components/agents/ForgeAgent"));
const LazyFluxAgent = lazy(() => import("@/components/agents/FluxAgent"));
const LazyApexAgent = lazy(() => import("@/components/agents/ApexAgent"));

const AGENTS: Agent[] = [
  { name: "SCOUT", role: "Research", description: "Finds useful sources and checks the evidence behind them.", avatar: "clover" },
  { name: "NEXUS", role: "Orchestrator", description: "Coordinates the team and keeps work moving in the right order.", avatar: "circle" },
  { name: "FORGE", role: "Builder", description: "Turns a brief into a structured product people can use.", avatar: "mech" },
  { name: "FLUX", role: "Creative", description: "Shapes the voice, story, and presentation of your product.", avatar: "flower" },
  { name: "APEX", role: "Strategy", description: "Connects the work to a clear business outcome.", avatar: "star" },
];
const ACTIVITY = [
  { label: "Thinking", time: "2.3s", Icon: Brain },
  { label: "Reading sources", time: "1.2s", Icon: BookOpen },
  { label: "Checking data", time: "…", Icon: ShieldCheck },
];

function AvatarSkeleton({ size = 64 }: { size?: 32 | 48 | 64 }) {
  const dimension = size === 64 ? "h-16 w-16" : size === 48 ? "h-12 w-12" : "h-8 w-8";
  return <span className={`skeleton block rounded-full ${dimension}`} aria-label="Loading agent avatar" />;
}

export function BotAvatar({ name, status = "idle", working = false, size = 64 }: { name: AgentName; status?: AgentStatus; working?: boolean; size?: 32 | 48 | 64 }) {
  const agent = AGENTS.find((item) => item.name === name) ?? AGENTS[0];
  const resolvedStatus = working ? "working" : status;
  const dimension = size === 64 ? "h-16 w-16" : size === 48 ? "h-12 w-12" : "h-8 w-8";
  return (
    <span className={`flex ${dimension} items-center justify-center rounded-full border bg-[#111318] ${resolvedStatus === "working" ? "border-white/55" : "border-white/15"}`} aria-hidden="true">
      <Suspense fallback={<AvatarSkeleton size={size} />}>
        <LazyAgentAvatar type={agent.avatar} state={resolvedStatus === "working" ? "working" : resolvedStatus === "sleeping" ? "sleeping" : "default"} size={size} interactive={false} aria-label={`${name} avatar`} />
      </Suspense>
      <span className="sr-only">{name} avatar</span>
    </span>
  );
}

function AgentDetail({ agent, status }: { agent: Agent; status: AgentStatus }) {
  const commonProps = { isWorking: status === "working", isActive: status !== "sleeping", className: "border-white/10 bg-transparent p-0" };
  const fallback = <div className="flex items-center gap-3"><AvatarSkeleton size={64} /><div className="skeleton h-8 w-28" /></div>;
  if (agent.name === "SCOUT") return <Suspense fallback={fallback}><LazyScoutAgent {...commonProps} /></Suspense>;
  if (agent.name === "FORGE") return <Suspense fallback={fallback}><LazyForgeAgent {...commonProps} /></Suspense>;
  if (agent.name === "FLUX") return <Suspense fallback={fallback}><LazyFluxAgent {...commonProps} /></Suspense>;
  if (agent.name === "APEX") return <Suspense fallback={fallback}><LazyApexAgent {...commonProps} /></Suspense>;
  return <div className="flex items-center gap-3"><BotAvatar name="NEXUS" status={status} /><div className="min-w-0"><p className="text-sm font-medium text-[#F0F2F5]">NEXUS</p><p className="mt-1 text-xs text-[#6B7280]">{status[0].toUpperCase() + status.slice(1)}</p></div></div>;
}

export default function AgentTeam({ status = "idle", workingAgent = null }: AgentTeamProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const selected = AGENTS.find((agent) => agent.name === selectedAgent) ?? null;
  const effectiveStatus: AgentStatus = workingAgent ? "working" : status;
  return (
    <section aria-labelledby="ai-team-heading" className="mx-auto w-full max-w-3xl shrink-0 px-0 sm:px-4">
      <div className="flex items-center justify-between gap-3 px-1"><div><h2 id="ai-team-heading" className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8B929E]">Your AI Team</h2><p className="mt-1 text-xs text-[#6B7280]">Five specialists, one workspace</p></div><Network size={16} className="text-[#8B929E]" aria-hidden="true" /></div>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="list" aria-label="AI agents">
        {AGENTS.map((agent) => { const isSelected = selectedAgent === agent.name; return <button key={agent.name} type="button" aria-pressed={isSelected} onClick={() => setSelectedAgent(isSelected ? null : agent.name)} className={`group flex min-w-[76px] flex-1 snap-start flex-col items-center rounded-xl border px-1.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C96A3] ${isSelected ? "border-[#8C96A3]/65 bg-[#111318]" : "border-transparent hover:border-white/10 hover:bg-[#111318]/70"}`}>
          <span className={`relative rounded-full ${effectiveStatus === "working" ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#080A0C]" : ""}`}><BotAvatar name={agent.name} status={effectiveStatus} /><span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#080A0C] ${effectiveStatus === "working" ? "bg-white" : effectiveStatus === "sleeping" ? "bg-[#3D424B]" : "bg-[#6B7280]"}`} aria-hidden="true" /></span>
          <span className="mt-1.5 text-[11px] font-medium tracking-[0.08em] text-[#F0F2F5]">{agent.name}</span><span className={`mt-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none ${effectiveStatus === "working" ? "border-white/35 text-white" : "border-white/10 text-[#8B929E]"}`}>{effectiveStatus[0].toUpperCase() + effectiveStatus.slice(1)}</span>
        </button>; })}
      </div>
      {selected && <div className="mt-2 rounded-xl border border-white/10 bg-[#111318] px-3.5 py-3" aria-live="polite"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><AgentDetail agent={selected} status={effectiveStatus} /><p className="mt-2 text-xs leading-5 text-[#8B929E]">{selected.description}</p></div><ChevronRight size={15} className="mt-1 shrink-0 text-[#6B7280]" aria-hidden="true" /></div></div>}
      {effectiveStatus === "working" && <div className="mt-2 border-l border-white/15 pl-3" aria-label={workingAgent ? `${workingAgent} activity` : "AI team activity"}><p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#8B929E]">Team activity</p><div className="grid grid-cols-3 gap-2">{ACTIVITY.map(({ label, time, Icon }) => <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#111318] px-2.5 py-2"><div className="flex items-center gap-1.5 text-[#B7BEC8]"><Icon size={13} aria-hidden="true" /><span className="truncate text-[11px]">{label}</span></div><p className="mt-1 text-[10px] text-[#6B7280]">{time}</p></div>)}</div></div>}
    </section>
  );
}
