import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ConnectorCatalog from "@/components/connectors/ConnectorCatalog";
import { useConnectorConnections } from "@/hooks/useConnectorConnections";

export default function ConnectorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);
  const { refresh, serviceConfigured } = useConnectorConnections();

  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;

    if (status === "success") {
      setNotice("Composio returned successfully. Refreshing connected account status.");
      void refresh();
    } else {
      setNotice("The Composio connection did not complete. No new connection is shown as active.");
    }

    // Do not retain callback identifiers or status parameters in the visible URL.
    const cleaned = new URLSearchParams(searchParams);
    cleaned.delete("status");
    cleaned.delete("connected_account_id");
    setSearchParams(cleaned, { replace: true });
  }, [refresh, searchParams, setSearchParams]);

  return (
    <DashboardLayout>
      <main className="min-h-full bg-[#121212] px-4 py-8 text-white sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <p className="text-xs text-[#8A8A8A]">Workspace settings</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Connectors</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#979797]">Manage apps available to NexoraOS. Provider credentials are collected by Composio-hosted authorization after you choose Connect; do not paste provider keys into the chat.</p>
          </header>

          {notice && <p role="status" className="rounded-lg border border-[#315277] bg-[#131E2A] px-4 py-3 text-sm text-[#D5E4F5]">{notice}</p>}
          {!serviceConfigured && <p className="rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-3 text-xs leading-5 text-[#A0A0A0]">Live authorization is unavailable in this local session. The Vercel preview uses a same-origin server route and needs COMPOSIO_API_KEY set as a server-side Preview environment variable.</p>}

          <section className="rounded-2xl border border-white/10 bg-[#1F1F1F] p-4 sm:p-6" aria-label="Connector catalog">
            <ConnectorCatalog />
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
