import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  FolderOpen,
  Lightbulb,
  Mail,
  Megaphone,
  Monitor,
  PanelsTopLeft,
  Puzzle,
  Search,
  Sparkles,
  Telescope,
  X,
} from "lucide-react";
import { signInWithGoogle } from "@/lib/auth/login";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ChatGPTPromptInput } from "@/components/ui/chatgpt-prompt-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const tools = [
  { label: "3D Make", icon: Box, starter: "Create a 3D concept for " },
  { label: "Product", icon: Sparkles, starter: "Create a digital product about " },
  { label: "Marketing", icon: Megaphone, starter: "Create a marketing campaign for " },
  { label: "Sales page", icon: PanelsTopLeft, starter: "Build a sales page for " },
  { label: "Docs", icon: FileText, starter: "Draft a document about " },
  { label: "Sheets", icon: BarChart3, starter: "Create a spreadsheet to track " },
  { label: "Research", icon: Telescope, starter: "Research " },
];

const plugins = [
  { name: "Gmail", icon: Mail, tint: "#f87171", description: "Search and draft email" },
  { name: "Google Drive", icon: FolderOpen, tint: "#60a5fa", description: "Find your files" },
  { name: "Google Calendar", icon: CalendarDays, tint: "#34d399", description: "Plan your schedule" },
  { name: "Slack", icon: Puzzle, tint: "#c084fc", description: "Connect your workspace" },
  { name: "Figma", icon: PanelsTopLeft, tint: "#fb923c", description: "Explore your designs" },
];

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.204A8.64 8.64 0 0 0 17.48 7.36H9v3.48h4.84a5.1 5.1 0 0 1-1.8 2.72l2.91 2.26c1.7-1.56 2.69-3.87 2.69-6.62Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33C2.44 15.98 5.48 18 9 18Z" fill="#34A853" />
      <path d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function NexoraMark() {
  return (
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true" className="h-10 w-10 sm:h-11 sm:w-11">
      <rect x="2" y="2" width="48" height="48" rx="13" fill="#00E68E" />
      <path d="M15 14.5v23M15.5 37.5l21-23M36.5 14.5v23" stroke="#07110D" strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [pluginsOpen, setPluginsOpen] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [projectNotice, setProjectNotice] = useState(false);

  const submitPrompt = (value: string) => {
    setPrompt(value);
    setAuthError("");
    if (user) {
      navigate(`/dashboard?query=${encodeURIComponent(value)}`);
      return;
    }
    setAuthOpen(true);
  };

  const selectTool = (starter: string) => {
    setPrompt(starter);
    requestAnimationFrame(() => promptRef.current?.focus());
  };

  const continueWithGoogle = async () => {
    setIsSigningIn(true);
    setAuthError("");
    try {
      try {
        window.localStorage.setItem("nexora_initial_build_query", prompt.trim());
      } catch {
        // Continue OAuth even when browser storage is restricted.
      }
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed. Please try again.";
      setAuthError(message);
      toast({ title: "Google sign-in failed", description: message, variant: "destructive" });
      setIsSigningIn(false);
    }
  };

  return (
    <main className="nexora-home min-h-[100dvh] w-full bg-[#0a0a0a] p-[5px] text-[#e8e8e8]">
      <section className="nexora-home-frame relative min-h-[calc(100dvh-10px)] overflow-hidden rounded-[13px] border border-[#282828] bg-[#101010]">
        <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-[#777777]" aria-hidden="true">
          <PanelsTopLeft className="h-4 w-4" strokeWidth={1.7} />
        </div>
        <Link to="/pricing" className="nexora-upgrade absolute left-1/2 top-2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#153454] bg-[#0b1d2d] px-3 py-1.5 text-[11px] font-medium text-[#60a5fa] transition-colors hover:border-[#1d4f7a] hover:bg-[#10263a]">
          <Sparkles className="h-3 w-3" /> Upgrade your plan
        </Link>

        <div className="nexora-workspace-stage">
          <div className="nexora-brand-lockup" aria-label="NexoraOS">
            <NexoraMark />
            <div className="flex flex-col leading-none">
              <span className="nexora-wordmark">NEXORA</span>
              <span className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.36em] text-[#646464]">AI workspace</span>
            </div>
          </div>

          <div className="nexora-composer-wrap">
            <ChatGPTPromptInput value={prompt} onChange={setPrompt} onSubmit={submitPrompt} inputRef={promptRef} placeholder="Ask anything, or tell Nexora what to build..." />
            <div className="nexora-composer-meta flex items-center justify-between px-3.5 pt-2.5">
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProjectNotice((open) => !open)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#999999] transition-colors hover:bg-[#252525] hover:text-[#e2e2e2]"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Choose project
                </button>
                <button
                  type="button"
                  aria-expanded={pluginsOpen}
                  onClick={() => setPluginsOpen((open) => !open)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${pluginsOpen ? "border-[#393939] bg-[#292929] text-[#e2e2e2]" : "border-transparent text-[#999999] hover:border-[#303030] hover:bg-[#242424] hover:text-[#e2e2e2]"}`}
                >
                  <span className="flex -space-x-1.5" aria-hidden="true">
                    {plugins.slice(0, 3).map((plugin) => {
                      const Icon = plugin.icon;
                      return <span key={plugin.name} className="flex h-4 w-4 items-center justify-center rounded-full border border-[#202020] bg-[#343434]" style={{ color: plugin.tint }}><Icon className="h-2.5 w-2.5" /></span>;
                    })}
                  </span>
                  Plugins
                </button>
                {pluginsOpen && (
                  <div className="nexora-plugin-menu absolute left-20 top-9 z-30 w-[220px] rounded-xl border border-[#343434] bg-[#242424] p-2 shadow-2xl shadow-black/50">
                    <div className="flex items-center justify-between px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#777777]">
                      Recommended
                      <button type="button" onClick={() => setPluginsOpen(false)} aria-label="Close plugins" className="rounded p-1 text-[#777777] hover:bg-[#333333] hover:text-white"><X className="h-3 w-3" /></button>
                    </div>
                    {plugins.map((plugin) => {
                      const Icon = plugin.icon;
                      const isSelected = selectedPlugin === plugin.name;
                      return (
                        <button key={plugin.name} type="button" onClick={() => setSelectedPlugin(isSelected ? null : plugin.name)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#303030]">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#333333]" style={{ color: plugin.tint }}><Icon className="h-3.5 w-3.5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] text-[#dddddd]">{plugin.name}</span>
                            <span className="block truncate text-[9px] text-[#777777]">{plugin.description}</span>
                          </span>
                          {isSelected ? <Check className="h-3.5 w-3.5 text-[#00e68e]" /> : <span className="text-[9px] text-[#777777]">Preview</span>}
                        </button>
                      );
                    })}
                    <div className="mt-1 border-t border-[#363636] px-2 pt-2">
                      <span className="inline-flex items-center gap-2 text-[10px] text-[#929292]"><Puzzle className="h-3 w-3" /> Manage plugins</span>
                    </div>
                  </div>
                )}
                {projectNotice && (
                  <div className="absolute left-0 top-9 z-20 w-52 rounded-lg border border-[#343434] bg-[#242424] p-3 text-[11px] text-[#a0a0a0] shadow-xl">
                    Sign in to create and organize projects.
                  </div>
                )}
              </div>
              <button type="button" onClick={() => toast({ title: "Desktop app", description: "The NexoraOS desktop app is coming soon." })} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#999999] transition-colors hover:bg-[#252525] hover:text-[#e2e2e2]">
                <Monitor className="h-3.5 w-3.5" /> <span className="hidden min-[440px]:inline">Use desktop app</span>
              </button>
            </div>
          </div>

          <nav className="nexora-tool-row" aria-label="Quick tools">
            {tools.map(({ label, icon: Icon, starter }) => (
              <button key={label} type="button" onClick={() => selectTool(starter)} className="nexora-tool-chip">
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                <span>{label}</span>
              </button>
            ))}
            <button type="button" aria-label="More tools" className="nexora-tool-more" onClick={() => selectTool("Help me explore NexoraOS tools")}><ChevronRight className="h-4 w-4" /></button>
          </nav>

          <div className="nexora-home-hint">
            <Search className="h-3.5 w-3.5" /> Start with an idea. Make it real.
          </div>
        </div>

        <Link to="/pricing" className="nexora-inspiration absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap text-[11px] text-[#666666] transition-colors hover:text-[#a0a0a0]">
          <Lightbulb className="h-3.5 w-3.5" /> Explore inspiration <ArrowRight className="ml-0.5 h-3 w-3" />
        </Link>
      </section>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-[420px] rounded-[20px] border-[#2a2a2a] bg-[#111111] p-6 text-[#e8e8e8]">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="text-xl font-semibold text-[#e8e8e8]">Save your first build request</DialogTitle>
            <DialogDescription className="pt-2 leading-6 text-[#888888]">Continue with Google to open your workspace. Your idea will be ready on the dashboard.</DialogDescription>
          </DialogHeader>
          <div className="max-h-28 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-sm leading-6 text-[#c8c8c8]">{prompt}</div>
          {authError && <p role="alert" className="text-sm text-[#ff4444]">{authError}</p>}
          <button type="button" onClick={() => void continueWithGoogle()} disabled={isSigningIn} className="inline-flex h-11 items-center justify-center gap-3 rounded-[10px] border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-sm font-semibold text-[#e8e8e8] transition-colors hover:border-[#00e68e]/40 hover:bg-[#202020] disabled:cursor-wait disabled:opacity-60">
            <GoogleMark />{isSigningIn ? "Connecting to Google…" : "Continue with Google"}
          </button>
          <p className="text-center text-xs text-[#666666]">Your prompt is stored locally only to complete this sign-in.</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
