import type { ConnectedComposioApp } from "@/lib/connectors/api";

export const CONNECTOR_CATEGORIES = [
  "Productivity",
  "Communication",
  "Sales & Marketing",
  "Payments & Commerce",
  "Dev & Infrastructure",
  "AI Tools",
  "Research & Web",
] as const;

export type ConnectorCategory = (typeof CONNECTOR_CATEGORIES)[number];
export type ConnectorAuthKind = "oauth" | "api_key" | "bot_token";

export type ConnectorDefinition = {
  id: string;
  name: string;
  domain: string;
  category: ConnectorCategory;
  toolkit: string;
  icon: string;
  authKind: ConnectorAuthKind;
  authLabel: string;
  description: string;
  workspaceDefault?: boolean;
  supportsAccountConnection?: boolean;
};

type ConnectorOptions = {
  authLabel?: string;
  workspaceDefault?: boolean;
  supportsAccountConnection?: boolean;
};

function defineConnector(
  id: string,
  name: string,
  domain: string,
  category: ConnectorCategory,
  toolkit: string,
  authKind: ConnectorAuthKind,
  description: string,
  options: ConnectorOptions = {},
): ConnectorDefinition {
  const authLabel = options.authLabel ?? (authKind === "oauth" ? "OAuth 2.0" : authKind === "bot_token" ? "Bot token" : "API key");
  return { id, name, domain, category, toolkit, icon: id, authKind, authLabel, description, ...options };
}

export const CONNECTORS: ConnectorDefinition[] = [
  // Productivity (13)
  defineConnector("gmail", "Gmail", "gmail.com", "Productivity", "gmail", "oauth", "Connect Gmail to work with messages and email workflows."),
  defineConnector("google-calendar", "Google Calendar", "calendar.google.com", "Productivity", "googlecalendar", "oauth", "Connect calendars to review schedules and manage events."),
  defineConnector("google-drive", "Google Drive", "drive.google.com", "Productivity", "googledrive", "oauth", "Connect Drive to find and organize workspace files."),
  defineConnector("google-docs", "Google Docs", "docs.google.com", "Productivity", "googledocs", "oauth", "Connect Docs to find and work with documents."),
  defineConnector("google-sheets", "Google Sheets", "sheets.google.com", "Productivity", "googlesheets", "oauth", "Connect Sheets to work with spreadsheet data."),
  defineConnector("outlook", "Outlook", "outlook.com", "Productivity", "outlook", "oauth", "Connect Outlook email and calendar workflows."),
  defineConnector("notion", "Notion", "notion.so", "Productivity", "notion", "oauth", "Connect Notion pages and team knowledge."),
  defineConnector("airtable", "Airtable", "airtable.com", "Productivity", "airtable", "oauth", "Connect Airtable bases and records."),
  defineConnector("trello", "Trello", "trello.com", "Productivity", "trello", "oauth", "Connect Trello boards, cards, and workflows."),
  defineConnector("asana", "Asana", "asana.com", "Productivity", "asana", "oauth", "Connect Asana projects and tasks."),
  defineConnector("clickup", "ClickUp", "clickup.com", "Productivity", "clickup", "oauth", "Connect ClickUp spaces and task workflows."),
  defineConnector("linear", "Linear", "linear.app", "Productivity", "linear", "oauth", "Connect Linear issues and project workflows."),
  defineConnector("todoist", "Todoist", "todoist.com", "Productivity", "todoist", "oauth", "Connect Todoist tasks and project lists."),

  // Communication (6)
  defineConnector("slack", "Slack", "slack.com", "Communication", "slack", "oauth", "Connect Slack workspaces, messages, and channels."),
  defineConnector("discord", "Discord", "discord.com", "Communication", "discord", "oauth", "Connect Discord servers and communication workflows."),
  defineConnector("telegram", "Telegram", "telegram.org", "Communication", "telegrambotapi", "bot_token", "Connect a Telegram bot through Composio's hosted credential flow."),
  defineConnector("whatsapp", "WhatsApp", "whatsapp.com", "Communication", "whatsapp", "bot_token", "Connect WhatsApp Business credentials through Composio's hosted flow.", { authLabel: "Token and phone ID" }),
  defineConnector("zoom", "Zoom", "zoom.us", "Communication", "zoom", "oauth", "Connect Zoom meetings and scheduling workflows."),
  defineConnector("microsoft-teams", "Microsoft Teams", "teams.microsoft.com", "Communication", "microsoftteams", "oauth", "Connect Teams messages, channels, and meeting workflows."),

  // Sales & Marketing (11)
  defineConnector("hubspot", "HubSpot", "hubspot.com", "Sales & Marketing", "hubspot", "oauth", "Connect HubSpot CRM and marketing workflows."),
  defineConnector("salesforce", "Salesforce", "salesforce.com", "Sales & Marketing", "salesforce", "oauth", "Connect Salesforce records and CRM workflows."),
  defineConnector("mailchimp", "Mailchimp", "mailchimp.com", "Sales & Marketing", "mailchimp", "api_key", "Connect Mailchimp audiences and campaign workflows."),
  defineConnector("convertkit", "ConvertKit", "convertkit.com", "Sales & Marketing", "kit", "api_key", "Connect ConvertKit subscribers and creator email workflows."),
  defineConnector("beehiiv", "Beehiiv", "beehiiv.com", "Sales & Marketing", "beehiiv", "api_key", "Connect Beehiiv publications and newsletter workflows."),
  defineConnector("omnisend", "Omnisend", "omnisend.com", "Sales & Marketing", "omnisend", "api_key", "Connect Omnisend marketing and customer workflows."),
  defineConnector("linkedin", "LinkedIn", "linkedin.com", "Sales & Marketing", "linkedin", "oauth", "Connect LinkedIn account workflows."),
  defineConnector("twitter", "Twitter/X", "x.com", "Sales & Marketing", "twitter", "oauth", "Connect Twitter/X account workflows."),
  defineConnector("instagram", "Instagram", "instagram.com", "Sales & Marketing", "instagram", "oauth", "Connect Instagram account workflows."),
  defineConnector("meta-ads", "Meta Ads Manager", "facebook.com", "Sales & Marketing", "facebookads", "oauth", "Connect Meta advertising account workflows."),
  defineConnector("typefully", "Typefully", "typefully.com", "Sales & Marketing", "typefully", "api_key", "Connect Typefully drafts and social publishing workflows."),

  // Payments & Commerce (6)
  defineConnector("stripe", "Stripe", "stripe.com", "Payments & Commerce", "stripe", "api_key", "Connect Stripe payment and billing workflows."),
  defineConnector("whop", "Whop", "whop.com", "Payments & Commerce", "whop", "oauth", "Connect Whop products and commerce workflows."),
  defineConnector("gumroad", "Gumroad", "gumroad.com", "Payments & Commerce", "gumroad", "oauth", "Connect Gumroad products and sales workflows."),
  defineConnector("lemon-squeezy", "Lemon Squeezy", "lemonsqueezy.com", "Payments & Commerce", "lemonsqueezy", "oauth", "Connect Lemon Squeezy store and order workflows."),
  defineConnector("shopify", "Shopify", "shopify.com", "Payments & Commerce", "shopify", "oauth", "Connect Shopify store and commerce workflows."),
  defineConnector("paypal", "PayPal", "paypal.com", "Payments & Commerce", "paypal", "oauth", "Connect PayPal payments and transaction workflows."),

  // Dev & Infrastructure (8)
  defineConnector("github", "GitHub", "github.com", "Dev & Infrastructure", "github", "oauth", "Connect GitHub repositories and developer workflows.", { workspaceDefault: true, supportsAccountConnection: true }),
  defineConnector("supabase", "Supabase", "supabase.com", "Dev & Infrastructure", "supabase", "api_key", "Link a Supabase project through Composio's hosted credential flow. NexoraOS also uses its configured workspace backend.", { workspaceDefault: true, supportsAccountConnection: true, authLabel: "Composio-hosted project token" }),
  defineConnector("vercel", "Vercel", "vercel.com", "Dev & Infrastructure", "vercel", "api_key", "Link a Vercel account through Composio's hosted credential flow. NexoraOS also uses its preview deployment.", { workspaceDefault: true, supportsAccountConnection: true, authLabel: "Composio-hosted access token" }),
  defineConnector("zapier", "Zapier", "zapier.com", "Dev & Infrastructure", "zapier", "oauth", "Connect Zapier automation workflows."),
  defineConnector("make", "Make", "make.com", "Dev & Infrastructure", "make", "oauth", "Connect Make scenarios and automation workflows."),
  defineConnector("n8n", "n8n", "n8n.io", "Dev & Infrastructure", "n8n", "api_key", "Connect an n8n instance using its configured credential flow."),
  defineConnector("jira", "Jira", "atlassian.com", "Dev & Infrastructure", "jira", "oauth", "Connect Jira projects, issues, and workflows."),
  defineConnector("bitbucket", "Bitbucket", "bitbucket.org", "Dev & Infrastructure", "bitbucket", "oauth", "Connect Bitbucket repositories and pull requests."),

  // AI Tools (10)
  defineConnector("perplexity", "Perplexity", "perplexity.ai", "AI Tools", "perplexityai", "api_key", "Connect Perplexity research workflows."),
  defineConnector("elevenlabs", "ElevenLabs", "elevenlabs.io", "AI Tools", "elevenlabs", "api_key", "Connect ElevenLabs speech and audio generation."),
  defineConnector("heygen", "HeyGen", "heygen.com", "AI Tools", "heygen", "api_key", "Connect HeyGen video creation workflows."),
  defineConnector("fal-ai", "Fal.ai", "fal.ai", "AI Tools", "fal", "api_key", "Connect Fal model and media generation workflows."),
  defineConnector("midjourney", "Midjourney", "midjourney.com", "AI Tools", "midjourney", "api_key", "Connect Midjourney image creation workflows."),
  defineConnector("stability-ai", "Stability AI", "stability.ai", "AI Tools", "stability_ai", "api_key", "Connect Stability AI image and media workflows."),
  defineConnector("runwayml", "RunwayML", "runwayml.com", "AI Tools", "runwayml", "api_key", "Connect Runway media generation workflows."),
  defineConnector("canva", "Canva", "canva.com", "AI Tools", "canva", "oauth", "Connect Canva designs and collaboration workflows."),
  defineConnector("gamma", "Gamma", "gamma.app", "AI Tools", "gamma", "api_key", "Connect Gamma presentation and document workflows."),
  defineConnector("jasper", "Jasper", "jasper.ai", "AI Tools", "jasper", "api_key", "Connect Jasper content workflows."),

  // Research & Web (6)
  defineConnector("firecrawl", "Firecrawl", "firecrawl.dev", "Research & Web", "firecrawl", "api_key", "Connect Firecrawl web extraction workflows."),
  defineConnector("brave-search", "Brave Search", "search.brave.com", "Research & Web", "brave_search", "api_key", "Connect Brave Search for web research."),
  defineConnector("wikipedia", "Wikipedia", "wikipedia.org", "Research & Web", "wikipedia", "api_key", "Connect Wikipedia for encyclopedia research.", { authLabel: "No key required" }),
  defineConnector("youtube", "YouTube", "youtube.com", "Research & Web", "youtube", "oauth", "Connect YouTube channels and video research."),
  defineConnector("typeform", "Typeform", "typeform.com", "Research & Web", "typeform", "oauth", "Connect Typeform responses and form workflows."),
  defineConnector("calendly", "Calendly", "calendly.com", "Research & Web", "calendly", "oauth", "Connect Calendly events and scheduling workflows."),
];

export function getConnectedConnectorDefinitions(apps: readonly ConnectedComposioApp[]): ConnectorDefinition[] {
  const activeToolkits = new Set(
    apps
      .filter((app) => app.connected)
      .map((app) => app.slug.trim().toLowerCase())
      .filter(Boolean),
  );
  const matchedToolkits = new Set<string>();

  return CONNECTORS.filter((connector) => {
    const toolkit = connector.toolkit.toLowerCase();
    if (!activeToolkits.has(toolkit) || matchedToolkits.has(toolkit)) return false;
    matchedToolkits.add(toolkit);
    return true;
  });
}

export const CORE_WORKSPACE_CONNECTOR_IDS = new Set(
  CONNECTORS.filter((connector) => connector.workspaceDefault).map((connector) => connector.id),
);

const DIRECT_LOGO_URLS: Record<string, string> = {
  gmail: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
  "google-calendar": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
  "google-drive": "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
  "google-docs": "https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg",
  "google-sheets": "https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg",
  "google-slides": "https://upload.wikimedia.org/wikipedia/commons/1/16/Google_Slides_2019_Logo.svg",
  outlook: "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg",
  notion: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
  slack: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
  github: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
  stripe: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
  telegram: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg",
  whatsapp: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
};

const SIMPLE_ICON_SLUGS: Record<string, string> = {
  "microsoft-teams": "microsoftteams",
  "meta-ads": "meta",
  "lemon-squeezy": "lemonsqueezy",
  "fal-ai": "fal",
  "stability-ai": "stabilityai",
  "brave-search": "brave",
  "google-calendar": "googlecalendar",
  "google-drive": "googledrive",
  "google-docs": "googledocs",
  "google-sheets": "googlesheets",
};

export function getConnectorLogoUrl(connector: ConnectorDefinition): string {
  const directLogo = DIRECT_LOGO_URLS[connector.id];
  if (directLogo) return directLogo;
  const iconSlug = SIMPLE_ICON_SLUGS[connector.id] ?? connector.toolkit.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `https://cdn.simpleicons.org/${encodeURIComponent(iconSlug)}`;
}

export function getConnectorExamples(connector: ConnectorDefinition): string[] {
  const name = connector.name;
  switch (connector.category) {
    case "Productivity":
      return [`Find the latest updates in ${name}`, `Summarize my important ${name} items from today`];
    case "Communication":
      return [`Summarize the latest activity in ${name}`, `Draft a reply for my ${name} conversations`];
    case "Sales & Marketing":
      return [`Review recent activity in ${name}`, `Summarize the latest campaign or lead updates in ${name}`];
    case "Payments & Commerce":
      return [`Summarize recent activity in ${name}`, `Find the latest order or payment updates in ${name}`];
    case "Dev & Infrastructure":
      return [`Review recent updates in ${name}`, `Find the latest project activity in ${name}`];
    case "AI Tools":
      return [`Create a first draft with ${name}`, `Review recent ${name} projects or generations`];
    case "Research & Web":
      return [`Use ${name} to research a question and summarize the sources`, `Find recent information about a topic with ${name}`];
  }
}
