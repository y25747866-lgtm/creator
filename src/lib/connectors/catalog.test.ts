import { describe, expect, it } from "vitest";
import { CONNECTOR_CATEGORIES, CONNECTORS, CORE_WORKSPACE_CONNECTOR_IDS, getConnectorLogoUrl } from "./catalog";

describe("curated connector catalog", () => {
  it("contains the 60 requested apps in seven categories", () => {
    expect(CONNECTORS).toHaveLength(60);
    expect(CONNECTOR_CATEGORIES).toEqual([
      "Productivity",
      "Communication",
      "Sales & Marketing",
      "Payments & Commerce",
      "Dev & Infrastructure",
      "AI Tools",
      "Research & Web",
    ]);
    expect(new Set(CONNECTORS.map((connector) => connector.id)).size).toBe(60);
    expect(CONNECTORS.map((connector) => connector.name)).toEqual([
      "Gmail", "Google Calendar", "Google Drive", "Google Docs", "Google Sheets", "Outlook", "Notion", "Airtable", "Trello", "Asana", "ClickUp", "Linear", "Todoist",
      "Slack", "Discord", "Telegram", "WhatsApp", "Zoom", "Microsoft Teams",
      "HubSpot", "Salesforce", "Mailchimp", "ConvertKit", "Beehiiv", "Omnisend", "LinkedIn", "Twitter/X", "Instagram", "Meta Ads Manager", "Typefully",
      "Stripe", "Whop", "Gumroad", "Lemon Squeezy", "Shopify", "PayPal",
      "GitHub", "Supabase", "Vercel", "Zapier", "Make", "n8n", "Jira", "Bitbucket",
      "Perplexity", "ElevenLabs", "HeyGen", "Fal.ai", "Midjourney", "Stability AI", "RunwayML", "Canva", "Gamma", "Jasper",
      "Firecrawl", "Brave Search", "Wikipedia", "YouTube", "Typeform", "Calendly",
    ]);
  });

  it("keeps the requested category distribution and auth metadata", () => {
    const counts = CONNECTORS.reduce<Record<string, number>>((total, connector) => {
      total[connector.category] = (total[connector.category] ?? 0) + 1;
      return total;
    }, {});
    expect(counts).toEqual({
      Productivity: 13,
      Communication: 6,
      "Sales & Marketing": 11,
      "Payments & Commerce": 6,
      "Dev & Infrastructure": 8,
      "AI Tools": 10,
      "Research & Web": 6,
    });
    for (const connector of CONNECTORS) {
      expect(connector.domain).toBeTruthy();
      expect(connector.toolkit).toBeTruthy();
      expect(["oauth", "api_key", "bot_token"]).toContain(connector.authKind);
      expect(connector.authLabel).toBeTruthy();
    }
  });

  it("uses the requested Clearbit logo host for every app", () => {
    for (const connector of CONNECTORS) {
      expect(getConnectorLogoUrl(connector)).toBe(`https://logo.clearbit.com/${connector.domain}`);
    }
    expect(getConnectorLogoUrl(CONNECTORS.find((connector) => connector.id === "fal-ai")!)).toBe("https://logo.clearbit.com/fal.ai");
  });

  it("marks GitHub, Supabase, and Vercel as core workspace services that allow a separate account link", () => {
    expect([...CORE_WORKSPACE_CONNECTOR_IDS].sort()).toEqual(["github", "supabase", "vercel"]);
    for (const id of ["github", "supabase", "vercel"]) {
      expect(CONNECTORS.find((connector) => connector.id === id)).toMatchObject({ workspaceDefault: true, supportsAccountConnection: true });
    }
    expect(CONNECTORS.find((connector) => connector.id === "supabase")).toMatchObject({ authKind: "api_key" });
    expect(CONNECTORS.find((connector) => connector.id === "vercel")).toMatchObject({ authKind: "api_key" });
  });
});
