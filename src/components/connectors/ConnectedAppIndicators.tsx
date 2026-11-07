import { useMemo } from "react";
import { ConnectorLogo } from "@/components/connectors/ConnectorCatalog";
import { useConnectorConnections } from "@/hooks/useConnectorConnections";
import { getConnectedConnectorDefinitions } from "@/lib/connectors/catalog";

const MAX_VISIBLE_ICONS = 3;

export default function ConnectedAppIndicators() {
  const { apps, loading, error, serviceConfigured } = useConnectorConnections();
  const connectedConnectors = useMemo(() => getConnectedConnectorDefinitions(apps), [apps]);

  if (!serviceConfigured || loading || error || connectedConnectors.length === 0) return null;

  const visibleConnectors = connectedConnectors.slice(0, MAX_VISIBLE_ICONS);
  const overflowCount = connectedConnectors.length - visibleConnectors.length;
  const names = connectedConnectors.map((connector) => connector.name).join(", ");
  const appLabel = connectedConnectors.length === 1 ? "connected app" : "connected apps";

  return (
    <span
      role="img"
      aria-label={`${connectedConnectors.length} ${appLabel}: ${names}`}
      title={`Connected apps: ${names}`}
      data-testid="connected-app-indicators"
      className="flex min-w-0 shrink-0 items-center gap-1.5 px-1"
    >
      <span aria-hidden="true" className="flex items-center -space-x-2">
        {visibleConnectors.map((connector) => (
          <ConnectorLogo
            key={connector.id}
            connector={connector}
            className="!h-5 !w-5 !rounded-md !p-0.5 ring-2 ring-[#1A1D24]"
          />
        ))}
        {overflowCount > 0 && (
          <span className="relative flex h-5 min-w-5 items-center justify-center rounded-md border border-[#303640] bg-[#1A1D24] px-1 text-[9px] font-medium leading-none text-[#F0F2F5] ring-2 ring-[#1A1D24]">
            +{overflowCount}
          </span>
        )}
      </span>
      <span aria-hidden="true" className="text-[10px] font-medium tabular-nums text-[#8B929E]">
        {connectedConnectors.length}
      </span>
    </span>
  );
}
