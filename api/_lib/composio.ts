import { Composio } from "@composio/core";
import type { VercelRequest } from "@vercel/node";
import { CONNECTORS } from "../../src/lib/connectors/catalog.js";

export type ConnectorConfig = { toolkit: string; name: string; authKind: "oauth" | "api_key" | "bot_token" };
export type AuthConfigRecord = { id: string; name?: string; toolkit?: { slug?: string }; isComposioManaged?: boolean };

type ComposioConnectorApi = {
  authConfigs: {
    list: (query: Record<string, unknown>) => Promise<{ items?: AuthConfigRecord[] }>;
    create: (toolkit: string, options: Record<string, unknown>) => Promise<AuthConfigRecord>;
  };
  connectedAccounts: {
    list: (query: Record<string, unknown>) => Promise<{ items: Array<{ toolkit: { slug: string }; status: string; isDisabled?: boolean }> }>;
    link: (userId: string, authConfigId: string, options: { callbackUrl: string }) => Promise<{ redirectUrl?: string }>;
  };
};

export const COMPOSIO_CONNECTORS: Record<string, ConnectorConfig> = Object.fromEntries(
  CONNECTORS.map(({ id, toolkit, name, authKind }) => [id, { toolkit, name, authKind }]),
);

let composioClient: Composio | undefined;
const authConfigCache = new Map<string, Promise<string>>();

function getComposio(): ComposioConnectorApi {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error("Composio is not configured on this preview. Add COMPOSIO_API_KEY as a server-side Vercel environment variable.");
  composioClient ??= new Composio({ apiKey });
  return composioClient as unknown as ComposioConnectorApi;
}

export async function getAuthenticatedUser(req: VercelRequest): Promise<{ id: string } | null> {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase authentication is not configured for the connector API.");
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: unknown };
  if (typeof user.id !== "string") return null;
  return { id: user.id };
}

export async function getConnectedApps(userId: string) {
  const { items } = await getComposio().connectedAccounts.list({ userIds: [userId], limit: 100 });
  return items.map((account) => ({
    slug: account.toolkit.slug,
    connected: account.status === "ACTIVE" && !account.isDisabled,
  }));
}

async function getAuthConfigId(connectorId: string, connector: ConnectorConfig): Promise<string> {
  const composio = getComposio();
  const cached = authConfigCache.get(connectorId);
  if (cached) return cached;
  const pending = (async () => {
    const managed = connector.authKind === "oauth";
    const response = await composio.authConfigs.list({ toolkit: connector.toolkit, isComposioManaged: managed, limit: 100 });
    const existing = (response.items ?? []).find((item) =>
      item.toolkit?.slug === connector.toolkit &&
      (managed ? item.isComposioManaged === true : item.name === `NexoraOS ${connectorId}`),
    );
    if (existing?.id) return existing.id;
    const options = managed
      ? { type: "use_composio_managed_auth", name: `NexoraOS ${connector.name}` }
      : { type: "use_custom_auth", authScheme: "API_KEY", name: `NexoraOS ${connectorId}`, credentials: {} };
    const created = await composio.authConfigs.create(connector.toolkit, options);
    if (!created.id) throw new Error(`Composio did not return an auth configuration for ${connector.name}.`);
    return created.id;
  })();
  authConfigCache.set(connectorId, pending);
  try { return await pending; }
  catch (error) { authConfigCache.delete(connectorId); throw error; }
}

export async function createConnectorLink(userId: string, connectorId: string, callbackUrl: string): Promise<string> {
  const connector = COMPOSIO_CONNECTORS[connectorId];
  if (!connector) throw new Error("This app is not available in the curated catalog.");
  const authConfigId = await getAuthConfigId(connectorId, connector);
  const link = await getComposio().connectedAccounts.link(userId, authConfigId, { callbackUrl });
  if (!link.redirectUrl) throw new Error(`Composio did not return a connection URL for ${connector.name}.`);
  return link.redirectUrl;
}
