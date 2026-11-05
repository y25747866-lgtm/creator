import { describe, expect, it } from "vitest";
import { CONNECTOR_CATEGORIES, CONNECTORS, CORE_WORKSPACE_CONNECTOR_IDS } from "./catalog";

describe("curated connector catalog", () => {
  it("keeps every app named in the supplied catalog and its six categories", () => {
    expect(CONNECTORS).toHaveLength(41);
    expect(CONNECTOR_CATEGORIES).toEqual(["Productivity", "Communication", "Sales & Marketing", "Payments", "Dev", "Research"]);
    expect(new Set(CONNECTORS.map((connector) => connector.id)).size).toBe(41);
    expect(CONNECTORS.map((connector) => connector.name)).toEqual(expect.arrayContaining([
      "Gmail", "Google Calendar", "Google Drive", "Google Docs", "Google Sheets", "Outlook", "Notion", "Airtable", "Trello", "Asana", "ClickUp", "Linear", "Todoist",
      "Slack", "Discord", "Telegram", "WhatsApp", "Zoom", "HubSpot", "Salesforce", "Mailchimp", "ConvertKit", "Beehiiv", "Omnisend", "LinkedIn", "Twitter/X", "Instagram", "Meta Ads",
      "Stripe", "Whop", "Gumroad", "Lemon Squeezy", "Shopify", "GitHub", "Supabase", "Vercel", "Zapier", "Make", "n8n", "Perplexity", "Firecrawl",
    ]));
  });

  it("marks only GitHub, Supabase, and Vercel as core workspace services", () => {
    expect([...CORE_WORKSPACE_CONNECTOR_IDS].sort()).toEqual(["github", "supabase", "vercel"]);
  });
  it("allows a separate Composio account connection for the workspace Supabase and Vercel apps", () => {
    expect(CONNECTORS.find((connector) => connector.id === "supabase")).toMatchObject({ workspaceDefault: true, supportsAccountConnection: true, authKind: "api_key" });
    expect(CONNECTORS.find((connector) => connector.id === "vercel")).toMatchObject({ workspaceDefault: true, supportsAccountConnection: true, authKind: "api_key" });
  });
});
