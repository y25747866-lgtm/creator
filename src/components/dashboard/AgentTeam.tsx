import { BookOpen, Brain, Bot, ChevronRight, Database, Network, ShieldCheck } from "lucide-react";
import { useState } from "react";

type AgentName = "SCOUT" | "NEXUS" | "FORGE" | "FLUX" | "APEX";
type AgentTeamProps = { workingAgent?: AgentName | null };

type Agent = {
  name: AgentName;
  role: string;
  description: string;
};

const AGENTS: Agent[] = [
  { name: "SCOUT", role: "Research", description: "Finds useful sources and checks the evidence behind them." },
  { name: "NEXUS", role: "Orchestrator", description: "Coordinates the team and keeps work moving in the right order." },
  { name: "FORGE", role: "Builder", description: "Turns a brief into a structured product people can use." },
  { name: "FLUX", role: "Creative", description: "Shapes the voice, story, and presentation of your product." },
  { name: "APEX", role: "Strategy", description: "Connects the work to a clear business outcome." },
];

const ACTIVITY = [
  { label: "Thinking", time: "2.3s", Icon: Brain },
  { label: "Reading sources", time: "1.2s", Icon: BookOpen },
  { label: "Checking data", time: "now", Icon: ShieldCheck },
];

function BotAvatar({ name, working }: { name: AgentName; working: boolean }) {
  return (
    <span className={`flex h-16 w-16 items-center justify-center rounded-full border bg-[#111318] text-[#F0F2F5] ${working ? "border-white/55" : "border-white/15"}`} aria-hidden="true">
      <Bot size={28} strokeWidth={1.5} />
      <span className="sr-only">{name} avatar</span>
    </span>
  );
}

export default function AgentTeam({ workingAgent = null }: AgentTeamProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const selected = AGENTS.find((agent) => agent.name === selectedAgent) ?? null;

  return (
    <section aria-labelledby="ai-team-heading" className="mx-auto w-full max-w-[800px] shrink-0 px-4 pt-5 sm:px-8 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8B929E]">Your AI Team</p>
          <p className="mt-1 text-xs text-[#6B7280]">Five specialists, one workspace</p>
        </div>
        <Network size={16} className="text-[#8B929E]" aria-hidden="true" />
        <h2 id="ai-team-heading" className="sr-only">Your AI Team</h2>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="list" aria-label="AI agents">
        {AGENTS.map((agent) => {
          const isWorking = workingAgent === agent.name;
          const isSelected = selectedAgent === agent.name;
          return (
            <button
              key={agent.name}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedAgent(isSelected ? null : agent.name)}
              className={`group flex min-w-[92px] snap-start flex-1 flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C96A3] ${isSelected ? "border-[#8C96A3]/65 bg-[#111318]" : "border-transparent hover:border-white/10 hover:bg-[#111318]/70"}`}
            >
              <span className={`relative rounded-full ${isWorking ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#080A0C]" : ""}`}>
                <BotAvatar name={agent.name} working={isWorking} />
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#080A0C] ${isWorking ? "bg-white" : "bg-[#6B7280]"}`} aria-hidden="true" />
              </span>
              <span className="mt-2 text-xs font-medium tracking-[0.08em] text-[#F0F2F5]">{agent.name}</span>
              <span className={`mt-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none ${isWorking ? "border-white/35 text-white" : "border-white/10 text-[#8B929E]"}`}>
                {isWorking ? "Working" : "Idle"}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded-xl border border-white/10 bg-[#111318] px-3.5 py-3" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#B7BEC8]">
              {selected.name === "SCOUT" ? <BookOpen size={15} /> : selected.name === "NEXUS" ? <Network size={15} /> : selected.name === "APEX" ? <ShieldCheck size={15} /> : selected.name === "FORGE" ? <Database size={15} /> : <Brain size={15} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#F0F2F5]">{selected.name}</p>
                <span className="text-[11px] text-[#6B7280]">{selected.role}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#8B929E]">{selected.description}</p>
            </div>
            <ChevronRight size={15} className="mt-1 shrink-0 text-[#6B7280]" aria-hidden="true" />
          </div>
        </div>
      )}

      {workingAgent && (
        <div className="mt-3 border-l border-white/15 pl-3" aria-label={`${workingAgent} activity`}>
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
