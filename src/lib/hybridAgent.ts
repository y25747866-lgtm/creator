import { supabase } from "@/integrations/supabase/client";

export type HybridAgentStatus = "idle" | "queued" | "thinking" | "working" | "waiting" | "success" | "error";

export interface HybridTask {
  id: string;
  goal: string;
  agent: "nexus" | "scout" | "flux" | "apex" | "forge";
  status: HybridAgentStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

type RunOptions = {
  answers?: Record<string, unknown>;
  skipDiscovery?: boolean;
};

const agentBaseUrl = String(import.meta.env.VITE_HYBRID_AGENT_URL ?? "").replace(/\/$/, "");

export function isHybridAgentConfigured(): boolean {
  return Boolean(agentBaseUrl);
}

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sign in is required before using Hybrid Agentic System.");
  }
  return data.session.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!agentBaseUrl) {
    throw new Error("Hybrid Agentic System is not connected in this preview. Configure VITE_HYBRID_AGENT_URL.");
  }
  const token = await accessToken();
  const response = await fetch(`${agentBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Hybrid agent request failed (${response.status}).`);
  return payload as T;
}

export async function submitHybridTask(goal: string, options: RunOptions = {}): Promise<{ taskId: string }> {
  const cleanGoal = goal.trim();
  if (!cleanGoal || cleanGoal.length > 4000) throw new Error("Agent goals must contain 1–4000 characters.");
  return request<{ taskId: string }>("/run", {
    method: "POST",
    body: JSON.stringify({ goal: cleanGoal, channel: "web", answers: options.answers, skipDiscovery: options.skipDiscovery }),
  });
}

export function getHybridTask(taskId: string): Promise<HybridTask> {
  return request<HybridTask>(`/tasks/${encodeURIComponent(taskId)}`);
}

export async function waitForHybridTask(taskId: string, options: { timeoutMs?: number; intervalMs?: number } = {}): Promise<HybridTask> {
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 1500;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lastTask = await getHybridTask(taskId);
    if (["success", "error"].includes(lastTask.status)) return lastTask;
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
  throw new Error(`Hybrid task ${taskId} did not finish before the recovery timeout.`);
}
