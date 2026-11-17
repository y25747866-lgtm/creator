import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock3, XCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AgentEvent = {
  id: string;
  event_type?: string | null;
  status?: string | null;
  message?: string | null;
  created_at?: string | null;
};

type AgentActivityPanelProps = { taskId?: string | null };

type EventsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
};

const statusIcon = (status: string | null | undefined) => {
  const normalized = status?.toLowerCase();
  if (["complete", "completed", "success", "done"].includes(normalized ?? "")) return <CheckCircle2 size={15} className="text-primary" aria-label="Complete" />;
  if (["error", "failed", "failure"].includes(normalized ?? "")) return <XCircle size={15} className="text-red-400" aria-label="Error" />;
  if (["working", "in_progress", "in-progress", "running", "active"].includes(normalized ?? "")) return <Clock3 size={15} className="text-amber-400" aria-label="In progress" />;
  return <Circle size={15} className="text-muted-foreground" aria-label="Pending" />;
};

const eventLabel = (event: AgentEvent) => event.message?.trim() || event.event_type?.replace(/[_-]+/g, " ") || "Agent step";

export default function AgentActivityPanel({ taskId }: AgentActivityPanelProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setEvents([]);
      setExpanded(false);
      return undefined;
    }
    let cancelled = false;
    const readEvents = async () => {
      const database = supabase as unknown as EventsClient;
      const { data } = await database.from("agent_events").select("id,event_type,status,message,created_at").eq("task_id", taskId).order("created_at", { ascending: true });
      if (!cancelled) setEvents((data ?? []).map((event) => event as AgentEvent));
    };
    void readEvents();
    const channel = supabase
      .channel(`agent-events:${taskId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_events", filter: `task_id=eq.${taskId}` }, (payload) => {
        const event = payload.new as AgentEvent;
        setEvents((current) => current.some((item) => item.id === event.id) ? current : [...current, event]);
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [taskId]);

  const latest = useMemo(() => events.at(-1), [events]);
  if (!taskId) return null;

  return (
    <div className="mb-3 w-full">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex min-h-9 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Zap size={14} aria-hidden="true" />
        <span className="font-medium">Agent working…</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{latest ? eventLabel(latest) : "Waiting for tool updates"}</span>
        <span className="text-muted-foreground">{expanded ? "Hide" : "View steps"}</span>
      </button>
      {expanded && (
        <div className="mt-2 rounded-xl border border-border bg-card p-3" role="region" aria-label="Agent activity steps">
          {events.length ? (
            <ol className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0">{statusIcon(event.status)}</span>
                  <span className="min-w-0 flex-1 text-foreground">{eventLabel(event)}</span>
                  {event.created_at && <time className="shrink-0 text-muted-foreground" dateTime={event.created_at}>{new Date(event.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>}
                </li>
              ))}
            </ol>
          ) : <p className="text-xs text-muted-foreground">Waiting for the first tool call</p>}
        </div>
      )}
    </div>
  );
}
