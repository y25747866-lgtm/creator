import { useCallback, useEffect, useState } from "react";
import { isConnectorServiceConfigured, listConnectedComposioApps, type ConnectedComposioApp } from "@/lib/connectors/api";

export function useConnectorConnections() {
  const [apps, setApps] = useState<ConnectedComposioApp[]>([]);
  const [loading, setLoading] = useState(isConnectorServiceConfigured());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isConnectorServiceConfigured()) {
      setApps([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setApps(await listConnectedComposioApps());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load connected apps.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return {
    apps,
    loading,
    error,
    refresh,
    serviceConfigured: isConnectorServiceConfigured(),
  };
}
