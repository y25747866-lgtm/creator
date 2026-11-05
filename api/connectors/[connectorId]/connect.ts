import type { VercelRequest, VercelResponse } from "@vercel/node";
import { COMPOSIO_CONNECTORS, createConnectorLink, getAuthenticatedUser } from "../../_lib/composio";

function getCallbackUrl(req: VercelRequest): string {
  const configured = process.env.CONNECTOR_CALLBACK_URL?.trim();
  if (configured) {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("CONNECTOR_CALLBACK_URL must use HTTPS.");
    return parsed.toString();
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/app/connectors`;
  const host = req.headers.host;
  if (host === "localhost:5173" || host === "127.0.0.1:5173") return `http://${host}/app/connectors`;
  throw new Error("Connector callback URL is not configured for this preview.");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const connectorId = String(req.query.connectorId ?? "");
  if (!Object.hasOwn(COMPOSIO_CONNECTORS, connectorId)) return res.status(404).json({ error: "This app is not available in the curated catalog." });
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: "Sign in to manage connected apps." });
    const redirectUrl = await createConnectorLink(user.id, connectorId, getCallbackUrl(req));
    const parsed = new URL(redirectUrl);
    const trustedHost = parsed.hostname === "composio.dev" || parsed.hostname.endsWith(".composio.dev") || parsed.hostname === "composio.com" || parsed.hostname.endsWith(".composio.com");
    if (parsed.protocol !== "https:" || !trustedHost) return res.status(502).json({ error: "Composio returned an untrusted connection URL." });
    return res.status(200).json({ redirectUrl: parsed.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the Composio connection.";
    const status = message.includes("COMPOSIO_API_KEY") || message.includes("not configured") ? 503 : 502;
    return res.status(status).json({ error: message });
  }
}
