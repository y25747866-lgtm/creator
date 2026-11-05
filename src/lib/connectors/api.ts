import { supabase } from "@/integrations/supabase/client";

export type ConnectedComposioApp = {
  slug: string;
  connected: boolean;
};

export type ConnectorConnectionResponse = {
  redirectUrl: string;
};

const agentBaseUrl = String(import.meta.env.VITE_HYBRID_AGENT_URL ?? "").replace(/\/$/, "");

export function isConnectorServiceConfigured(): boolean {
  return Boolean(agentBaseUrl);
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sign in to manage connected apps.");
  }
  return data.session.access_token;
}

async function connectorRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!agentBaseUrl) {
    throw new Error("The authenticated agent service is not configured in this preview.");
  }

  const token = await getAccessToken();
  const response = await fetch(`${agentBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : `Connector request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

export async function listConnectedComposioApps(): Promise<ConnectedComposioApp[]> {
  const payload = await connectorRequest<{ apps: ConnectedComposioApp[] }>("/connectors");
  return Array.isArray(payload.apps) ? payload.apps : [];
}

export function startComposioConnection(connectorId: string): Promise<ConnectorConnectionResponse> {
  return connectorRequest<ConnectorConnectionResponse>(`/connectors/${encodeURIComponent(connectorId)}/connect`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
