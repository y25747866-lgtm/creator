import { BookOpen, Brain, ChevronRight, Database, Network, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { BotAvatar as AgentAvatar, type BotAvatarType } from "bot-avatars";
import ApexAgent from "@/components/agents/ApexAgent";
import FluxAgent from "@/components/agents/FluxAgent";
import ForgeAgent from "@/components/agents/ForgeAgent";
import ScoutAgent from "@/components/agents/ScoutAgent";

type AgentName = "SCOUT" | "NEXUS" | "FORGE" | "FLUX" | "APEX";
type AgentTeamProps = { workingAgent?: AgentName | null };

type Agent = {
  name: AgentName;
  role: string;
  description: string;
  avatar: BotAvatarType;
};

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
  { label: "Checking data", time: "now", Icon: ShieldCheck },
];

export function BotAvatar({ name, working, size = 64 }: { name: AgentName; working: boolean; size?: 32 | 64 }) {
  const agent = AGENTS.find((item) => item.name === name) ?? AGENTS[0];
  return (
    <span className={`flex items-center justify-center rounded-full border bg-[#111318] ${size === 64 ? "h-16 w-16" : "h-8 w-8"} ${working ? "border-white/55" : "border-white/15"}`} aria-hidden="true">
      <AgentAvatar
        type={agent.avatar}
        state={working ? "working" : "default"}
        size={size}
        interactive={false}
        aria-label={`${name} avatar`}
      />
      <span className="sr-only">{name} avatar</span>
    </span>
  );
}

function AgentDetail({ agent, working }: { agent: Agent; working: boolean }) {
  const commonProps = { isWorking: working, className: "border-white/10 bg-transparent p-0" };
  if (agent.name === "SCOUT") return <ScoutAgent {...commonProps} />;
  if (agent.name === "FORGE") return <ForgeAgent {...commonProps} />;
  if (agent.name === "FLUX") return <FluxAgent {...commonProps} />;
  if (agent.name === "APEX") return <ApexAgent {...commonProps} />;
  return (
    <div className="flex items-center gap-3">
      <BotAvatar name="NEXUS" working={working} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#F0F2F5]">NEXUS</p>
        <p className="mt-1 text-xs text-[#6B7280]">{working ? "Working" : "Idle"}</p>
      </div>
    </div>
  );
}

export default function AgentTeam({ workingAgent = null }: AgentTeamProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const selected = AGENTS.find((agent) => agent.name === selectedAgent) ?? null;

  return (
    <section aria-labelledby="ai-team-heading" className="mx-auto w-full max-w-3xl shrink-0 px-0 sm:px-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 id="ai-team-heading" className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8B929E]">Your AI Team</h2>
          <p className="mt-1 text-xs text-[#6B7280]">Five specialists, one workspace</p>
        </div>
        <Network size={16} className="text-[#8B929E]" aria-hidden="true" />
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="list" aria-label="AI agents">
        {AGENTS.map((agent) => {
          const isWorking = workingAgent === agent.name;
          const isSelected = selectedAgent === agent.name;
          return (
            <button
              key={agent.name}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedAgent(isSelected ? null : agent.name)}
              className={`group flex min-w-[76px] flex-1 snap-start flex-col items-center rounded-xl border px-1.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C96A3] ${isSelected ? "border-[#8C96A3]/65 bg-[#111318]" : "border-transparent hover:border-white/10 hover:bg-[#111318]/70"}`}
            >
              <span className={`relative rounded-full ${isWorking ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#080A0C]" : ""}`}>
                <BotAvatar name={agent.name} working={isWorking} />
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#080A0C] ${isWorking ? "bg-white" : "bg-[#6B7280]"}`} aria-hidden="true" />
              </span>
              <span className="mt-1.5 text-[11px] font-medium tracking-[0.08em] text-[#F0F2F5]">{agent.name}</span>
              <span className={`mt-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none ${isWorking ? "border-white/35 text-white" : "border-white/10 text-[#8B929E]"}`}>
                {isWorking ? "Working" : "Idle"}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-2 rounded-xl border border-white/10 bg-[#111318] px-3.5 py-3" aria-live="polite">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <AgentDetail agent={selected} working={workingAgent === selected.name} />
              <p className="mt-2 text-xs leading-5 text-[#8B929E]">{selected.description}</p>
            </div>
            <ChevronRight size={15} className="mt-1 shrink-0 text-[#6B7280]" aria-hidden="true" />
          </div>
        </div>
      )}

      {workingAgent && (
        <div className="mt-2 border-l border-white/15 pl-3" aria-label={`${workingAgent} activity`}>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#8B929E]">{workingAgent} activity</p>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY.map(({ label, time, Icon }, index) => (
              <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-[#111318] px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[#B7BEC8]"><Icon size={13} aria-hidden="true" /><span className="truncate text-[11px]">{label}</span></div>
                <p className={`mt-1 text-[10px] ${index === ACTIVITY.length - 1 ? "text-white" : "text-[#6B7280]"}`}>{time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
