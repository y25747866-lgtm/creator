import { Composio } from "@composio/core";
import type { VercelRequest } from "@vercel/node";

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

export const COMPOSIO_CONNECTORS: Record<string, ConnectorConfig> = {
  gmail: { toolkit: "gmail", name: "Gmail", authKind: "oauth" },
  "google-calendar": { toolkit: "googlecalendar", name: "Google Calendar", authKind: "oauth" },
  "google-drive": { toolkit: "googledrive", name: "Google Drive", authKind: "oauth" },
  "google-docs": { toolkit: "googledocs", name: "Google Docs", authKind: "oauth" },
  "google-sheets": { toolkit: "googlesheets", name: "Google Sheets", authKind: "oauth" },
  outlook: { toolkit: "outlook", name: "Outlook", authKind: "oauth" },
  notion: { toolkit: "notion", name: "Notion", authKind: "oauth" },
  airtable: { toolkit: "airtable", name: "Airtable", authKind: "oauth" },
  trello: { toolkit: "trello", name: "Trello", authKind: "oauth" },
  asana: { toolkit: "asana", name: "Asana", authKind: "oauth" },
  clickup: { toolkit: "clickup", name: "ClickUp", authKind: "oauth" },
  linear: { toolkit: "linear", name: "Linear", authKind: "oauth" },
  todoist: { toolkit: "todoist", name: "Todoist", authKind: "oauth" },
  slack: { toolkit: "slack", name: "Slack", authKind: "oauth" },
  discord: { toolkit: "discord", name: "Discord", authKind: "oauth" },
  telegram: { toolkit: "telegrambotapi", name: "Telegram", authKind: "bot_token" },
  whatsapp: { toolkit: "whatsapp", name: "WhatsApp", authKind: "bot_token" },
  zoom: { toolkit: "zoom", name: "Zoom", authKind: "oauth" },
  hubspot: { toolkit: "hubspot", name: "HubSpot", authKind: "oauth" },
  salesforce: { toolkit: "salesforce", name: "Salesforce", authKind: "oauth" },
  mailchimp: { toolkit: "mailchimp", name: "Mailchimp", authKind: "api_key" },
  convertkit: { toolkit: "kit", name: "ConvertKit", authKind: "api_key" },
  beehiiv: { toolkit: "beehiiv", name: "Beehiiv", authKind: "api_key" },
  omnisend: { toolkit: "omnisend", name: "Omnisend", authKind: "api_key" },
  linkedin: { toolkit: "linkedin", name: "LinkedIn", authKind: "oauth" },
  twitter: { toolkit: "twitter", name: "Twitter/X", authKind: "oauth" },
  instagram: { toolkit: "instagram", name: "Instagram", authKind: "oauth" },
  "meta-ads": { toolkit: "facebookads", name: "Meta Ads", authKind: "oauth" },
  stripe: { toolkit: "stripe", name: "Stripe", authKind: "api_key" },
  whop: { toolkit: "whop", name: "Whop", authKind: "oauth" },
  gumroad: { toolkit: "gumroad", name: "Gumroad", authKind: "oauth" },
  "lemon-squeezy": { toolkit: "lemonsqueezy", name: "Lemon Squeezy", authKind: "oauth" },
  shopify: { toolkit: "shopify", name: "Shopify", authKind: "oauth" },
  zapier: { toolkit: "zapier", name: "Zapier", authKind: "oauth" },
  make: { toolkit: "make", name: "Make", authKind: "oauth" },
  n8n: { toolkit: "n8n", name: "n8n", authKind: "api_key" },
  perplexity: { toolkit: "perplexityai", name: "Perplexity", authKind: "api_key" },
  firecrawl: { toolkit: "firecrawl", name: "Firecrawl", authKind: "api_key" },
  supabase: { toolkit: "supabase", name: "Supabase", authKind: "api_key" },
  vercel: { toolkit: "vercel", name: "Vercel", authKind: "api_key" },
};

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
