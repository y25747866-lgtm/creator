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
      <main className="min-h-full bg-[#080A0C] px-4 py-8 text-[#F0F2F5] sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <p className="text-xs text-[#8B929E]">Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Plugins</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8B929E]">Review the apps connected to your account or connect another supported app. Authorization is handled by Composio; do not paste provider credentials into chat.</p>
          </header>

          {notice && <p role="status" className="rounded-lg border border-[#303640] bg-[#111318] px-4 py-3 text-sm text-[#F0F2F5]">{notice}</p>}
          {!serviceConfigured && <p className="rounded-lg border border-[#303640] bg-[#111318] px-4 py-3 text-xs leading-5 text-[#8B929E]">Live authorization is unavailable in this local session. The Vercel preview uses a same-origin server route and needs COMPOSIO_API_KEY set as a server-side Preview environment variable.</p>}

          <section className="rounded-2xl border border-[#303640] bg-[#111318] p-4 sm:p-6" aria-label="Plugins and available apps">
            <ConnectorCatalog />
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
