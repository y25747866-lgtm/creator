import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
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
type ConnectorFilter = ConnectorCategory | "All";
const CONNECTOR_FILTERS: ConnectorFilter[] = ["All", ...CONNECTOR_CATEGORIES];

export function ConnectorLogo({ connector, className = "" }: { connector: ConnectorDefinition; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const initial = connector.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase();
  const fallbackUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(connector.domain)}&sz=64`;

  useEffect(() => {
    setFailed(false);
    setFallbackFailed(false);
  }, [connector.id]);

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
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#00E68E]" title={label}>
      <Check size={13} aria-hidden="true" />
      <span>{connector.workspaceDefault && !connector.supportsAccountConnection ? "Workspace" : "Connected"}</span>
    </span>
  );
}

export default function ConnectorCatalog({ compact = false }: ConnectorCatalogProps) {
  const [category, setCategory] = useState<ConnectorFilter>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ConnectorDefinition | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { apps, loading, error, refresh, serviceConfigured } = useConnectorConnections();
  const connectedToolkitSlugs = useMemo(() => new Set(apps.filter((app) => app.connected).map((app) => app.slug.toLowerCase())), [apps]);
  const visibleConnectors = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return CONNECTORS.filter((connector) =>
      (category === "All" || connector.category === category) &&
      (!needle || `${connector.name} ${connector.domain}`.toLocaleLowerCase().includes(needle)),
    );
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
          <p className="text-[11px] font-medium text-[#F0F2F5]">Apps</p>
          <p className="mt-1 text-[10px] text-[#8B929E]">{CONNECTORS.length} curated apps · seven categories</p>
        </div>
        {loading && <Loader2 size={14} className="mt-0.5 animate-spin text-[#8B929E]" aria-label="Checking connections" />}
      </div>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-[#303640] bg-[#111318] px-2.5 text-[#8B929E]">
        <Search size={14} aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search apps"
          aria-label="Search connectors"
          className="min-w-0 flex-1 bg-transparent text-xs text-[#F0F2F5] outline-none placeholder:text-[#8B929E]"
        />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-[#8B929E] hover:text-[#F0F2F5]"><X size={13} /></button>}
      </label>

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Connector categories">
        {CONNECTOR_FILTERS.map((item) => (
          <button
            key={item}
            id={`connector-tab-${item.replace(/\W/g, "-").toLowerCase()}`}
            type="button"
            role="tab"
            aria-selected={category === item}
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] transition ${category === item ? "border-[#00E68E] bg-[#1A1D24] text-[#F0F2F5]" : "border-[#303640] text-[#8B929E] hover:bg-[#1A1D24] hover:text-[#F0F2F5]"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`connector-tab-${category.replace(/\W/g, "-").toLowerCase()}`}
        className={`grid gap-1.5 ${compact ? "max-h-[min(55dvh,500px)] grid-cols-1 overflow-y-auto pr-1" : "grid-cols-1 sm:grid-cols-2"}`}
      >
        {visibleConnectors.length === 0 ? (
          <p className="col-span-full rounded-lg border border-[#303640] px-3 py-5 text-center text-xs text-[#8B929E]">No apps match this search</p>
        ) : visibleConnectors.map((connector) => {
          const connected = connectorIsConnected(connector);
          return (
            <button
              key={connector.id}
              type="button"
              onClick={() => { setSelected(connector); setActionError(null); }}
              aria-haspopup="dialog"
              aria-label={`${connector.name} connector details`}
              className="flex min-h-[48px] w-full items-center gap-2 rounded-lg border border-[#303640]/70 bg-[#111318] px-2 py-1.5 text-left transition hover:border-[#303640] hover:bg-[#1A1D24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E]"
            >
              <ConnectorLogo connector={connector} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#F0F2F5]">{connector.name}</p>
                {!compact && <p className="mt-0.5 truncate text-[10px] text-[#8B929E]">{connector.workspaceDefault && connector.supportsAccountConnection ? `Workspace ready · ${connector.authLabel}` : connector.authLabel}</p>}
              </div>
              {connected ? (
                <ConnectedMark connector={connector} />
              ) : (
                <span className="rounded-md border border-[#303640] bg-[#F0F2F5] px-2.5 py-1.5 text-[10px] font-medium text-[#080A0C]">Connect</span>
              )}
            </button>
          );
        })}
      </div>

      {!serviceConfigured && (
        <p className="rounded-lg border border-[#303640] bg-[#111318] px-3 py-2 text-[10px] leading-4 text-[#8B929E]">
          Composio account status and authorization need the server-side COMPOSIO_API_KEY configured for this preview.
        </p>
      )}
      {serviceConfigured && error && <p role="status" className="text-[10px] leading-4 text-[#C8A6A6]">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-[#303640] pt-3">
        <Link to="/app/connectors" className="text-[10px] text-[#8B929E] hover:text-[#F0F2F5]">Manage connectors</Link>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="connector-detail-title" className="w-full max-w-md rounded-2xl border border-[#303640] bg-[#111318] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <ConnectorLogo connector={selected} className="h-12 w-12 rounded-xl p-2.5" />
              <div className="min-w-0 flex-1">
                <h2 id="connector-detail-title" className="text-base font-medium text-[#F0F2F5]">{selected.name}</h2>
                <p className="mt-1 text-xs text-[#8B929E]">{selected.authLabel}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close connector details" className="rounded-md p-1 text-[#8B929E] hover:bg-[#1A1D24] hover:text-[#F0F2F5]"><X size={17} /></button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#8B929E]">{selected.description}</p>
            <div className="mt-4">
              <p className="text-[11px] font-medium text-[#F0F2F5]">Example prompts</p>
              <ul className="mt-2 space-y-2">
                {getConnectorExamples(selected).map((example) => (
                  <li key={example} className="flex gap-2 rounded-lg border border-[#303640]/70 bg-[#111318] px-3 py-2 text-xs leading-5 text-[#8B929E]">
                    <Check size={13} className="mt-1 shrink-0 text-[#00E68E]" aria-hidden="true" />{example}
                  </li>
                ))}
              </ul>
            </div>
              {actionError && <p role="alert" className="mt-4 rounded-lg border border-[#6B3F3F] bg-[#281919] px-3 py-2 text-xs leading-5 text-[#E7BABA]">{actionError}</p>}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-[#303640] px-3 py-2 text-xs text-[#8B929E] hover:bg-[#1A1D24]">Cancel</button>
              <button
                type="button"
                onClick={() => void handleConnect(selected)}
                disabled={Boolean(connectingId) || connectorIsConnected(selected) || (selected.workspaceDefault && !selected.supportsAccountConnection)}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#F0F2F5] px-4 py-2 text-xs font-medium text-[#080A0C] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E] disabled:cursor-wait disabled:opacity-60"
              >
                {connectingId === selected.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                {connectingId === selected.id ? "Starting connection" : connectorIsConnected(selected) ? "Connected" : selected.workspaceDefault && !selected.supportsAccountConnection ? "Workspace-connected" : "Connect"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
