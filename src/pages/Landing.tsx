import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Box, Megaphone, PanelsTopLeft, Telescope } from "lucide-react";
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

const shortcuts = [
  { label: "Product Generator", cost: "500 cr", icon: Box, starter: "Create a digital product about " },
  { label: "Marketing Studio", cost: "100 cr", icon: Megaphone, starter: "Create marketing content for " },
  { label: "Sales Page", cost: "100 cr", icon: PanelsTopLeft, starter: "Build a sales page for " },
  { label: "Deep Research", cost: "150 cr", icon: Telescope, starter: "Research " },
  { label: "Analytics", cost: "0 cr", icon: BarChart3, starter: "Show me my business analytics" },
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

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");

  const submitPrompt = (value: string) => {
    setPrompt(value);
    setAuthError("");
    if (user) {
      navigate(`/dashboard?query=${encodeURIComponent(value)}`);
      return;
    }
    setAuthOpen(true);
  };

  const selectShortcut = (starter: string) => {
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
    <main className="nexora-home flex min-h-screen w-full flex-col items-center bg-[#0a0a0a] px-4 text-[#e8e8e8] sm:px-6" style={{ paddingTop: "40vh" }}>
      <div className="flex w-full flex-col items-center">
        <div className="flex select-none items-center gap-3" aria-label="NexoraOS">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M9 5L18 18L9 31" stroke="#00e68e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 5L31 18L22 31" stroke="#00e68e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[28px] font-semibold tracking-[-0.02em] text-[#e8e8e8]">NexoraOS</span>
        </div>

        <div className="mt-8 w-full max-w-[600px]">
          <ChatGPTPromptInput value={prompt} onChange={setPrompt} onSubmit={submitPrompt} inputRef={promptRef} />
        </div>

        <div className="mt-4 flex w-full max-w-[1040px] flex-wrap items-center justify-center gap-2" aria-label="Product shortcuts">
          {shortcuts.map(({ label, cost, icon: Icon, starter }) => (
            <button
              key={label}
              type="button"
              onClick={() => selectShortcut(starter)}
              className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3.5 py-2 text-[12px] font-medium text-[#888888] transition-colors hover:border-[#00e68e]/40 hover:text-[#00e68e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e68e]/50"
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              <span className="font-mono text-[10px] text-[#666666] group-hover:text-[#00e68e]/80">{cost}</span>
            </button>
          ))}
        </div>

        <nav className="mt-5 flex items-center gap-2.5 text-[13px]" aria-label="Plans">
          <Link to="/pricing" className="text-[#888888] transition-colors hover:text-[#00e68e]">Starter</Link>
          <span className="text-[#444444]" aria-hidden="true">·</span>
          <Link to="/pricing" className="text-[#888888] transition-colors hover:text-[#00e68e]">Pro</Link>
          <span className="text-[#444444]" aria-hidden="true">·</span>
          <Link to="/pricing" className="font-semibold text-[#7928ca] transition-colors hover:text-[#00e68e]">Hybrid AI OS</Link>
        </nav>
      </div>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-[420px] rounded-[20px] border-[#2a2a2a] bg-[#111111] p-6 text-[#e8e8e8]">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="text-xl font-semibold text-[#e8e8e8]">Save your first build request</DialogTitle>
            <DialogDescription className="pt-2 leading-6 text-[#888888]">
              Continue with Google to open your workspace. Your idea will be ready on the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-28 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-sm leading-6 text-[#c8c8c8]">
            {prompt}
          </div>
          {authError && <p role="alert" className="text-sm text-[#ff4444]">{authError}</p>}
          <button
            type="button"
            onClick={() => void continueWithGoogle()}
            disabled={isSigningIn}
            className="inline-flex h-11 items-center justify-center gap-3 rounded-[10px] border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-sm font-semibold text-[#e8e8e8] transition-colors hover:border-[#00e68e]/40 hover:bg-[#202020] disabled:cursor-wait disabled:opacity-60"
          >
            <GoogleMark />
            {isSigningIn ? "Connecting to Google…" : "Continue with Google"}
          </button>
          <p className="text-center text-xs text-[#666666]">Your prompt is stored locally only to complete this sign-in.</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
