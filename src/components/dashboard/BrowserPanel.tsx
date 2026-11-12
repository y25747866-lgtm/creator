import { ArrowLeft, ArrowRight, Globe2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_URL = "https://nexoraos.digital";

type BrowserRequest = { url?: string; label?: string };
type BrowserPanelProps = { onBrowsingChange?: (browsing: boolean) => void };

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function BrowserPanel({ onBrowsingChange }: BrowserPanelProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([DEFAULT_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activityLabel, setActivityLabel] = useState("Ready to browse");
  const currentUrl = history[historyIndex] ?? DEFAULT_URL;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const host = useMemo(() => {
    try { return new URL(currentUrl).hostname; } catch { return currentUrl; }
  }, [currentUrl]);

  useEffect(() => {
    const handleBrowserRequest = (event: Event) => {
      const request = (event as CustomEvent<BrowserRequest>).detail ?? {};
      const nextUrl = safeUrl(request.url ?? DEFAULT_URL);
      if (!nextUrl) return;
      setHistory((current) => [...current.slice(0, historyIndex + 1), nextUrl]);
      setHistoryIndex((current) => current + 1);
      setActivityLabel(request.label || `Browsing ${new URL(nextUrl).hostname}…`);
      setOpen(true);
      onBrowsingChange?.(true);
    };
    window.addEventListener("nexoraos:scout-browsing", handleBrowserRequest);
    return () => window.removeEventListener("nexoraos:scout-browsing", handleBrowserRequest);
  }, [historyIndex, onBrowsingChange]);

  const close = () => {
    setOpen(false);
    setActivityLabel("Ready to browse");
    onBrowsingChange?.(false);
  };

  const goBack = () => {
    if (!canGoBack) return;
    setHistoryIndex((current) => current - 1);
    setActivityLabel(`Browsing ${host}…`);
  };

  const goForward = () => {
    if (!canGoForward) return;
    setHistoryIndex((current) => current + 1);
    setActivityLabel(`Browsing ${host}…`);
  };

  return (
    <aside
      aria-label="SCOUT browser"
      aria-hidden={!open}
      className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-[520px] flex-col border-l border-white/10 bg-[#080A0C] shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`}
    >
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#111318] text-[#B7BEC8]"><Globe2 size={16} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#F0F2F5]">SCOUT browser</p>
          <p className="truncate text-[11px] text-[#8B929E]">{activityLabel}</p>
        </div>
        <button type="button" onClick={close} aria-label="Close SCOUT browser" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B929E] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={18} aria-hidden="true" /></button>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
        <button type="button" onClick={goBack} disabled={!canGoBack} aria-label="Go back" className="flex h-8 w-8 items-center justify-center rounded-md text-[#B7BEC8] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ArrowLeft size={15} aria-hidden="true" /></button>
        <button type="button" onClick={goForward} disabled={!canGoForward} aria-label="Go forward" className="flex h-8 w-8 items-center justify-center rounded-md text-[#B7BEC8] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ArrowRight size={15} aria-hidden="true" /></button>
        <div aria-label="Current browser URL" className="min-w-0 flex-1 truncate rounded-md border border-white/10 bg-[#111318] px-3 py-1.5 text-xs text-[#B7BEC8]">{currentUrl}</div>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {open && <iframe key={currentUrl} title={`SCOUT browsing ${host}`} src={currentUrl} sandbox="allow-forms allow-modals allow-popups allow-presentation allow-scripts" referrerPolicy="no-referrer" className="h-full w-full border-0" />}
      </div>
      <footer className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-[#8B929E]"><span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />Agent activity: {activityLabel}</footer>
    </aside>
  );
}
