export const CONNECTOR_CATEGORIES = [
  "Productivity",
  "Communication",
  "Sales & Marketing",
  "Payments",
  "Dev",
  "Research",
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
  localLogo?: string;
};

// The supplied list contains 41 apps (not 40). All listed apps are retained.
export const CONNECTORS: ConnectorDefinition[] = [
  { id: "gmail", name: "Gmail", domain: "gmail.com", category: "Productivity", toolkit: "gmail", icon: "gmail", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Gmail to work with messages and email workflows.", localLogo: "/google-workspace/gmail.svg" },
  { id: "google-calendar", name: "Google Calendar", domain: "calendar.google.com", category: "Productivity", toolkit: "googlecalendar", icon: "googlecalendar", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect calendars to review schedules and manage events.", localLogo: "/google-workspace/google-calendar.svg" },
  { id: "google-drive", name: "Google Drive", domain: "drive.google.com", category: "Productivity", toolkit: "googledrive", icon: "googledrive", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Drive to find and organize workspace files.", localLogo: "/google-workspace/google-drive.svg" },
  { id: "google-docs", name: "Google Docs", domain: "docs.google.com", category: "Productivity", toolkit: "googledocs", icon: "googledocs", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Docs to find and work with documents.", localLogo: "/google-workspace/google-docs.svg" },
  { id: "google-sheets", name: "Google Sheets", domain: "sheets.google.com", category: "Productivity", toolkit: "googlesheets", icon: "googlesheets", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Sheets to work with spreadsheet data.", localLogo: "/google-workspace/google-sheets.svg" },
  { id: "outlook", name: "Outlook", domain: "outlook.com", category: "Productivity", toolkit: "outlook", icon: "microsoftoutlook", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Outlook email and calendar workflows." },
  { id: "notion", name: "Notion", domain: "notion.so", category: "Productivity", toolkit: "notion", icon: "notion", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Notion pages and team knowledge." },
  { id: "airtable", name: "Airtable", domain: "airtable.com", category: "Productivity", toolkit: "airtable", icon: "airtable", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Airtable bases and records." },
  { id: "trello", name: "Trello", domain: "trello.com", category: "Productivity", toolkit: "trello", icon: "trello", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Trello boards, cards, and workflows." },
  { id: "asana", name: "Asana", domain: "asana.com", category: "Productivity", toolkit: "asana", icon: "asana", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Asana projects and tasks." },
  { id: "clickup", name: "ClickUp", domain: "clickup.com", category: "Productivity", toolkit: "clickup", icon: "clickup", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect ClickUp spaces and task workflows." },
  { id: "linear", name: "Linear", domain: "linear.app", category: "Productivity", toolkit: "linear", icon: "linear", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Linear issues and project workflows." },
  { id: "todoist", name: "Todoist", domain: "todoist.com", category: "Productivity", toolkit: "todoist", icon: "todoist", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Todoist tasks and project lists." },

  { id: "slack", name: "Slack", domain: "slack.com", category: "Communication", toolkit: "slack", icon: "slack", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Slack workspaces, messages, and channels." },
  { id: "discord", name: "Discord", domain: "discord.com", category: "Communication", toolkit: "discord", icon: "discord", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Discord servers and communication workflows." },
  { id: "telegram", name: "Telegram", domain: "telegram.org", category: "Communication", toolkit: "telegrambotapi", icon: "telegram", authKind: "bot_token", authLabel: "Bot token", description: "Connect a Telegram bot through Composio's hosted credential flow." },
  { id: "whatsapp", name: "WhatsApp", domain: "whatsapp.com", category: "Communication", toolkit: "whatsapp", icon: "whatsapp", authKind: "bot_token", authLabel: "Token and phone ID", description: "Connect WhatsApp Business credentials through Composio's hosted flow." },
  { id: "zoom", name: "Zoom", domain: "zoom.us", category: "Communication", toolkit: "zoom", icon: "zoom", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Zoom meetings and scheduling workflows." },

  { id: "hubspot", name: "HubSpot", domain: "hubspot.com", category: "Sales & Marketing", toolkit: "hubspot", icon: "hubspot", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect HubSpot CRM and marketing workflows." },
  { id: "salesforce", name: "Salesforce", domain: "salesforce.com", category: "Sales & Marketing", toolkit: "salesforce", icon: "salesforce", authKind: "oauth", authLabel: "OAuth 2.0", description: "Connect Salesforce records and CRM workflows." },
  { id: "mailchimp", name: "Mailchimp", domain: "mailchimp.com", category: "Sales & Marketing", toolkit: "mailchimp", icon: "mailchimp", authKind: "api_key", authLabel: "API key", description: "Connect Mailchimp audiences and campaign workflows." },
  { id: "convertkit", name: "ConvertKit", domain: "convertkit.com", category: "Sales & Marketing", toolkit: "kit", icon: "kit", authKind: "api_key", authLabel: "API key", description: "Connect ConvertKit (Kit) subscribers and creator email workflows." },
  { id: "beehiiv", name: "Beehiiv", domain: "beehiiv.com", category: "Sales & Marketing", toolkit: "beehiiv", icon: "beehiiv", authKind: "api_key", authLabel: "API key", description: "Connect Beehiiv publications and newsletter workflows." },
  { id: "omnisend", name: "Omnisend", domain: "omnisend.com", category: "Sales & Marketing", toolkit: "omnisend", icon: "omnisend", authKind: "api_key", authLabel: "API key", description: "Connect Omnisend marketing and customer workflows." },
  { id: "linkedin", name: "LinkedIn", domain: "linkedin.com", category: "Sales & Marketing", toolkit: "linkedin", icon: "linkedin", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect LinkedIn account workflows." },
  { id: "twitter", name: "Twitter/X", domain: "x.com", category: "Sales & Marketing", toolkit: "twitter", icon: "x", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Twitter/X account workflows." },
  { id: "instagram", name: "Instagram", domain: "instagram.com", category: "Sales & Marketing", toolkit: "instagram", icon: "instagram", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Instagram account workflows." },
  { id: "meta-ads", name: "Meta Ads", domain: "facebook.com", category: "Sales & Marketing", toolkit: "facebookads", icon: "meta", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Meta advertising account workflows." },

  { id: "stripe", name: "Stripe", domain: "stripe.com", category: "Payments", toolkit: "stripe", icon: "stripe", authKind: "api_key", authLabel: "API key", description: "Connect Stripe payment and billing workflows." },
  { id: "whop", name: "Whop", domain: "whop.com", category: "Payments", toolkit: "whop", icon: "whop", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Whop products and commerce workflows." },
  { id: "gumroad", name: "Gumroad", domain: "gumroad.com", category: "Payments", toolkit: "gumroad", icon: "gumroad", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Gumroad products and sales workflows." },
  { id: "lemon-squeezy", name: "Lemon Squeezy", domain: "lemonsqueezy.com", category: "Payments", toolkit: "lemonsqueezy", icon: "lemonsqueezy", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Lemon Squeezy store and order workflows." },
  { id: "shopify", name: "Shopify", domain: "shopify.com", category: "Payments", toolkit: "shopify", icon: "shopify", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Shopify store and commerce workflows." },

  { id: "github", name: "GitHub", domain: "github.com", category: "Dev", toolkit: "github", icon: "github", authKind: "oauth", authLabel: "Workspace service", description: "GitHub is linked to the NexoraOS source workspace.", workspaceDefault: true },
  { id: "supabase", name: "Supabase", domain: "supabase.com", category: "Dev", toolkit: "supabase", icon: "supabase", authKind: "api_key", authLabel: "Workspace service", description: "Supabase is configured as the NexoraOS application backend.", workspaceDefault: true },
  { id: "vercel", name: "Vercel", domain: "vercel.com", category: "Dev", toolkit: "vercel", icon: "vercel", authKind: "oauth", authLabel: "Workspace service", description: "Vercel is linked to the NexoraOS preview deployment.", workspaceDefault: true },
  { id: "zapier", name: "Zapier", domain: "zapier.com", category: "Dev", toolkit: "zapier", icon: "zapier", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Zapier automation workflows." },
  { id: "make", name: "Make", domain: "make.com", category: "Dev", toolkit: "make", icon: "make", authKind: "oauth", authLabel: "Composio-hosted auth", description: "Connect Make scenarios and automation workflows." },
  { id: "n8n", name: "n8n", domain: "n8n.io", category: "Dev", toolkit: "n8n", icon: "n8n", authKind: "api_key", authLabel: "API key", description: "Connect an n8n instance using its configured credential flow." },

  { id: "perplexity", name: "Perplexity", domain: "perplexity.ai", category: "Research", toolkit: "perplexityai", icon: "perplexity", authKind: "api_key", authLabel: "API key", description: "Connect Perplexity research workflows." },
  { id: "firecrawl", name: "Firecrawl", domain: "firecrawl.dev", category: "Research", toolkit: "firecrawl", icon: "firecrawl", authKind: "api_key", authLabel: "API key", description: "Connect Firecrawl web extraction workflows." },
];

export const CORE_WORKSPACE_CONNECTOR_IDS = new Set(
  CONNECTORS.filter((connector) => connector.workspaceDefault).map((connector) => connector.id),
);

export function getConnectorLogoUrl(connector: ConnectorDefinition): string {
  if (connector.localLogo) return connector.localLogo;
  return `https://cdn.simpleicons.org/${encodeURIComponent(connector.icon)}`;
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
    case "Payments":
      return [`Summarize recent activity in ${name}`, `Find the latest order or payment updates in ${name}`];
    case "Dev":
      return [`Review recent updates in ${name}`, `Find the latest project activity in ${name}`];
    case "Research":
      return [`Use ${name} to research a question and summarize the sources`, `Find recent information about a topic with ${name}`];
  }
}
