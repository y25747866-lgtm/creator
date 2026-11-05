import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Loader2, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  CONNECTOR_CATEGORIES,
  CONNECTORS,
  getConnectorExamples,
  getConnectorLogoUrl,
  type ConnectorDefinition,
  type ConnectorCategory,
} from "@/lib/connectors/catalog";
import { startComposioConnection } from "@/lib/connectors/api";
import { useConnectorConnections } from "@/hooks/useConnectorConnections";

type ConnectorCatalogProps = { compact?: boolean };

export function ConnectorLogo({ connector, className = "" }: { connector: ConnectorDefinition; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const initial = connector.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase();
  const fallbackUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(connector.domain)}&sz=64`;

  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/5 bg-white p-1.5 ${className}`}>
      {!fallbackFailed ? (
        <img
          src={failed ? fallbackUrl : getConnectorLogoUrl(connector)}
          alt={`${connector.name} logo`}
          width="24"
          height="24"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
          onError={() => {
            if (!failed) setFailed(true);
            else setFallbackFailed(true);
          }}
        />
      ) : (
        <span aria-label={`${connector.name} logo unavailable`} className="text-xs font-semibold text-[#252525]">{initial}</span>
      )}
    </span>
  );
}

function ConnectedMark({ connector }: { connector: ConnectorDefinition }) {
  const label = connector.workspaceDefault && !connector.supportsAccountConnection ? "Connected to workspace" : "Connected";
  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <button type="button" disabled className="relative inline-flex h-[18px] w-[32px] items-center rounded-full bg-[#195A9F] p-[2px] disabled:cursor-default" role="switch" aria-checked="true" aria-label={`${connector.name}: ${label}`}>
        <span className="ml-auto h-[14px] w-[14px] rounded-full bg-white" />
      </button>
      <span className="text-[11px] text-[#AEBBD0]">{connector.workspaceDefault ? "Workspace" : "Connected"}</span>
    </span>
  );
}

export default function ConnectorCatalog({ compact = false }: ConnectorCatalogProps) {
  const [category, setCategory] = useState<ConnectorCategory>(CONNECTOR_CATEGORIES[0]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ConnectorDefinition | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { apps, loading, error, refresh, serviceConfigured } = useConnectorConnections();
  const connectedToolkitSlugs = useMemo(() => new Set(apps.filter((app) => app.connected).map((app) => app.slug.toLowerCase())), [apps]);
  const visibleConnectors = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return CONNECTORS.filter((connector) => connector.category === category && (!needle || `${connector.name} ${connector.domain}`.toLocaleLowerCase().includes(needle)));
  }, [category, search]);
  const connectorIsConnected = (connector: ConnectorDefinition) => Boolean((connector.workspaceDefault && !connector.supportsAccountConnection) || connectedToolkitSlugs.has(connector.toolkit.toLowerCase()));

  const handleConnect = async (connector: ConnectorDefinition) => {
    setActionError(null);
    if (connector.workspaceDefault && !connector.supportsAccountConnection) return;
    if (!serviceConfigured) {
      setActionError("The local connector API is not available in this session. No account was connected.");
      return;
    }
    setConnectingId(connector.id);
    try {
      const { redirectUrl } = await startComposioConnection(connector.id);
      const redirect = new URL(redirectUrl);
      const trustedComposioHost = redirect.hostname === "composio.dev" || redirect.hostname.endsWith(".composio.dev") || redirect.hostname === "composio.com" || redirect.hostname.endsWith(".composio.com");
      if (redirect.protocol !== "https:" || !trustedComposioHost) throw new Error("The connection link was not a trusted Composio HTTPS URL.");
      window.location.assign(redirect.toString());
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not start the Composio connection.");
      setConnectingId(null);
      await refresh();
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-[#C7C7C7]">Apps</p>
          <p className="mt-1 text-[10px] text-[#737373]">{CONNECTORS.length} curated apps · six categories</p>
        </div>
        {loading && <Loader2 size={14} className="mt-0.5 animate-spin text-[#8B8B8B]" aria-label="Checking connections" />}
      </div>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-2.5 text-[#777]">
        <Search size={14} aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search apps"
          aria-label="Search connectors"
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#686868]"
        />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-[#888] hover:text-white"><X size={13} /></button>}
      </label>

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Connector categories">
        {CONNECTOR_CATEGORIES.map((item) => (
          <button
            key={item}
            id={`connector-tab-${item.replace(/\W/g, "-").toLowerCase()}`}
            type="button"
            role="tab"
            aria-selected={category === item}
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] transition ${category === item ? "border-[#195A9F] bg-[#131E2A] text-white" : "border-white/10 text-[#8F8F8F] hover:text-white"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`connector-tab-${category.replace(/\W/g, "-").toLowerCase()}`}
        className={`grid gap-1.5 ${compact ? "max-h-[min(34dvh,340px)] grid-cols-1 overflow-y-auto pr-1" : "grid-cols-1 sm:grid-cols-2"}`}
      >
        {visibleConnectors.length === 0 ? (
          <p className="col-span-full rounded-lg border border-white/10 px-3 py-5 text-center text-xs text-[#7C7C7C]">No apps match this search</p>
        ) : visibleConnectors.map((connector) => {
          const connected = connectorIsConnected(connector);
          return (
            <div key={connector.id} className="flex min-h-[48px] items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.015] px-2 py-1.5">
              <ConnectorLogo connector={connector} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{connector.name}</p>
                {!compact && <p className="mt-0.5 truncate text-[10px] text-[#747474]">{connector.workspaceDefault && connector.supportsAccountConnection ? `Workspace ready · ${connector.authLabel}` : connector.authLabel}</p>}
              </div>
              {connected ? (
                <ConnectedMark connector={connector} />
              ) : (
                <button
                  type="button"
                  onClick={() => { setSelected(connector); setActionError(null); }}
                  className="rounded-md border border-[#315277] bg-[#131E2A] px-2.5 py-1.5 text-[10px] font-medium text-[#D5E4F5] transition hover:border-[#195A9F] hover:bg-[#195A9F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]"
                >
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!serviceConfigured && (
        <p className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-[10px] leading-4 text-[#858585]">
          Composio account status and authorization need the server-side COMPOSIO_API_KEY configured for this preview.
        </p>
      )}
      {serviceConfigured && error && <p role="status" className="text-[10px] leading-4 text-[#C8A6A6]">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <a href="https://composio.dev/toolkits" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#A7A7A7] hover:text-white">
          + Browse all 1,000+ apps <ArrowUpRight size={12} aria-hidden="true" />
        </a>
        <Link to="/app/connectors" className="text-[10px] text-[#A7A7A7] hover:text-white">Manage connectors</Link>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="connector-detail-title" className="w-full max-w-md rounded-2xl border border-white/15 bg-[#1F1F1F] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <ConnectorLogo connector={selected} className="h-10 w-10 rounded-[10px] p-2" />
              <div className="min-w-0 flex-1">
                <h2 id="connector-detail-title" className="text-base font-medium text-white">{selected.name}</h2>
                <p className="mt-1 text-xs text-[#8F8F8F]">{selected.authLabel}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close connector details" className="rounded-md p-1 text-[#888] hover:bg-white/10 hover:text-white"><X size={17} /></button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#C0C0C0]">{selected.description}</p>
            <div className="mt-4">
              <p className="text-[11px] font-medium text-white">Example prompts</p>
              <ul className="mt-2 space-y-2">
                {getConnectorExamples(selected).map((example) => (
                  <li key={example} className="flex gap-2 rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2 text-xs leading-5 text-[#AFAFAF]">
                    <Check size={13} className="mt-1 shrink-0 text-[#195A9F]" aria-hidden="true" />{example}
                  </li>
                ))}
              </ul>
            </div>
              {actionError && <p role="alert" className="mt-4 rounded-lg border border-[#6B3F3F] bg-[#281919] px-3 py-2 text-xs leading-5 text-[#E7BABA]">{actionError}</p>}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-[#BDBDBD] hover:bg-white/[0.05]">Cancel</button>
              <button
                type="button"
                onClick={() => void handleConnect(selected)}
                disabled={Boolean(connectingId)}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#195A9F] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#246BAF] disabled:cursor-wait disabled:opacity-60"
              >
                {connectingId === selected.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                {connectingId === selected.id ? "Starting connection" : "Connect"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
