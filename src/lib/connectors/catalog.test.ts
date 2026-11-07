import { describe, expect, it } from "vitest";
import { CONNECTOR_CATEGORIES, CONNECTORS, CORE_WORKSPACE_CONNECTOR_IDS, getConnectedConnectorDefinitions, getConnectorLogoUrl } from "./catalog";

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

  it("uses the supplied product-specific artwork and never calls the retired Clearbit endpoint", () => {
    const explicitLogos: Record<string, string> = {
      gmail: "/connector-logos/gmail.svg",
      "google-calendar": "/connector-logos/google-calendar.svg",
      "google-drive": "/connector-logos/google-drive.svg",
      "google-docs": "/connector-logos/google-docs.svg",
      "google-sheets": "/connector-logos/google-sheets.svg",
      outlook: "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg",
      notion: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
      slack: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
      github: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      stripe: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      telegram: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg",
      whatsapp: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
    };
    for (const [id, url] of Object.entries(explicitLogos)) {
      expect(getConnectorLogoUrl(CONNECTORS.find((connector) => connector.id === id)!)).toBe(url);
    }
    for (const connector of CONNECTORS) {
      expect(getConnectorLogoUrl(connector)).not.toContain("logo.clearbit.com");
    }
    expect(getConnectorLogoUrl(CONNECTORS.find((connector) => connector.id === "fal-ai")!)).toBe("https://cdn.simpleicons.org/fal");
  });

  it("marks GitHub, Supabase, and Vercel as core workspace services that allow a separate account link", () => {
    expect([...CORE_WORKSPACE_CONNECTOR_IDS].sort()).toEqual(["github", "supabase", "vercel"]);
    for (const id of ["github", "supabase", "vercel"]) {
      expect(CONNECTORS.find((connector) => connector.id === id)).toMatchObject({ workspaceDefault: true, supportsAccountConnection: true });
    }
    expect(CONNECTORS.find((connector) => connector.id === "supabase")).toMatchObject({ authKind: "api_key" });
    expect(CONNECTORS.find((connector) => connector.id === "vercel")).toMatchObject({ authKind: "api_key" });
  });

  it("maps only unique active Composio toolkit slugs to known connector definitions", () => {
    expect(getConnectedConnectorDefinitions([])).toEqual([]);
    expect(getConnectedConnectorDefinitions([{ slug: "gmail", connected: true }]).map((item) => item.name)).toEqual(["Gmail"]);
    expect(getConnectedConnectorDefinitions([
      { slug: "gmail", connected: true },
      { slug: "slack", connected: true },
      { slug: "github", connected: true },
      { slug: "gmail", connected: true },
      { slug: "notion", connected: false },
      { slug: "not-in-catalog", connected: true },
    ]).map((item) => item.name)).toEqual(["Gmail", "Slack", "GitHub"]);
  });
});
