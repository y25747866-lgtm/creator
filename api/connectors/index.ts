import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser, getConnectedApps } from "../_lib/composio";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: "Sign in to manage connected apps." });
    const apps = await getConnectedApps(user.id);
    return res.status(200).json({ apps });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load connected apps.";
    const status = message.includes("COMPOSIO_API_KEY") || message.includes("not configured") ? 503 : 502;
    return res.status(status).json({ error: message });
  }
}
