import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUp, Loader2, X } from "lucide-react";
import HeroBackground from "@/components/HeroBackground";
import nexoraLogo from "@/assets/nexora-logo.webp";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle } from "@/lib/auth/login";

const Landing = () => {
  const [prompt, setPrompt] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = prompt.trim();
    if (!message) {
      setError("Tell NexoraOS what you want to build first.");
      return;
    }
    setError("");
    if (user) {
      navigate(`/dashboard?query=${encodeURIComponent(message)}`);
      return;
    }
    try {
      window.localStorage.setItem("nexora_initial_build_query", message);
    } catch {
      // The OAuth callback URL also carries the query if storage is unavailable.
    }
    setShowSignIn(true);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in failed. Please try again.");
      setIsSigningIn(false);
    }
  };

  return (
    <main className="nexora-home relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-5 text-[#e8e8e8]">
      <div className="nexora-home-webgl absolute inset-0 -z-10" aria-hidden="true">
        <HeroBackground />
      </div>
      <div className="nexora-home-content relative z-10 flex w-full max-w-[680px] -translate-y-[4vh] flex-col items-center">
        <div className="mb-9 flex items-center gap-3" aria-label="NexoraOS">
          <img src={nexoraLogo} alt="" width="44" height="44" className="h-11 w-11 object-contain" />
          <span className="text-[28px] font-semibold tracking-[-0.055em] text-[#e8e8e8]">NexoraOS</span>
        </div>

        <form onSubmit={handleSubmit} className="group w-full max-w-[600px]">
          <label htmlFor="build-prompt" className="sr-only">What do you want to build today?</label>
          <div className="nexora-prompt-bar flex min-h-[64px] items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2 transition-colors focus-within:border-[#3a4c44] hover:border-[#383838]">
            <input
              id="build-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="What do you want to build today..."
              className="nexora-home-input min-w-0 flex-1 bg-transparent px-1 py-3 text-[15px] font-normal text-[#e8e8e8] outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              aria-label="Send build request"
              className="nexora-send-button flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#00e68e] text-black transition-all duration-200 hover:scale-[1.03] hover:bg-[#31f2a6] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e68e]/40"
            >
              <ArrowUp className="h-[18px] w-[18px] stroke-[2.5]" />
            </button>
          </div>
          {error && !showSignIn && <p className="mt-2 px-1 text-xs text-[#ff7777]">{error}</p>}
        </form>

        <div className="mt-5 flex items-center gap-2.5 text-[12px] text-[#777777]" aria-label="Plans">
          <Link to="/pricing" className="transition-colors hover:text-[#e8e8e8]">Starter</Link>
          <span aria-hidden="true" className="text-[#444444]">·</span>
          <Link to="/pricing" className="transition-colors hover:text-[#e8e8e8]">Pro</Link>
          <span aria-hidden="true" className="text-[#444444]">·</span>
          <Link to="/pricing" className="transition-colors hover:text-[#e8e8e8]">Hybrid AI OS</Link>
        </div>
      </div>

      {showSignIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSigningIn) setShowSignIn(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-in-title"
            className="relative w-full max-w-[420px] rounded-[14px] border border-[#2a2a2a] bg-[#141414] p-7 shadow-[0_24px_100px_rgba(0,0,0,0.7)] sm:p-8"
          >
            <button
              type="button"
              aria-label="Close sign-in dialog"
              onClick={() => setShowSignIn(false)}
              disabled={isSigningIn}
              className="absolute right-4 top-4 rounded-lg p-2 text-[#888888] transition-colors hover:bg-[#1a1a1a] hover:text-white disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
              <img src={nexoraLogo} alt="" width="28" height="28" className="h-7 w-7 object-contain" />
            </div>
            <h2 id="sign-in-title" className="text-xl font-semibold tracking-tight text-[#e8e8e8]">Sign in to continue</h2>
            <p className="mt-2 text-sm leading-6 text-[#888888]">Your build request is ready. Continue with Google to open it in NexoraOS.</p>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-[#2a2a2a] bg-[#1a1a1a] text-sm font-medium text-[#e8e8e8] transition-colors hover:border-[#454545] hover:bg-[#202020] disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
              {isSigningIn ? "Connecting to Google…" : "Continue with Google"}
            </button>
            {error && <p role="alert" className="mt-3 text-sm text-[#ff7777]">{error}</p>}
            <p className="mt-5 text-center text-xs text-[#666666]">Your idea follows you into your workspace.</p>
          </section>
        </div>
      )}
    </main>
  );
};

const GoogleMark = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.20443c0-.63818-.0573-1.25181-.1636-1.8409H9v3.48137h4.8436c-.2087 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7019-1.5668 2.6836-3.8741 2.6836-6.615Z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.4672-.8055 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0359-3.7104H.9573v2.3318C2.4382 15.983 5.4818 18 9 18Z" fill="#34A853" />
    <path d="M3.9641 10.71A5.42 5.42 0 0 1 3.6818 9c0-.5932.1023-1.17.2823-1.71V4.9582H.9573A8.98 8.98 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418l3.0068-2.3318Z" fill="#FBBC05" />
    <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5813C13.4629.8918 11.4257 0 9 0 5.4818 0 2.4382 2.017.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795Z" fill="#EA4335" />
  </svg>
);

export default Landing;
