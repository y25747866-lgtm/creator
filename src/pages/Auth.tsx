import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { signIn, signInWithGoogle } from "@/lib/auth/login";
import { supabase } from "@/integrations/supabase/client";
import nexoraLogo from "@/assets/nexora-logo.webp";

const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: 1 + Math.random() * 0.5,
      opacity: 0.3 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }));
    let animationFrame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(255,255,255,0.4)";
      particles.forEach((particle) => {
        if (!reducedMotion) {
          particle.x = (particle.x + particle.vx + width) % width;
          particle.y = (particle.y + particle.vy + height) % height;
        }
        context.globalAlpha = particle.opacity;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none" />;
};

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 18 18" className="h-[18px] w-[18px] fill-none">
    <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.68-3.88 2.68-6.62Z" fill="#fff" />
    <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" fill="#fff" />
    <path d="M3.96 10.71A5.42 5.42 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z" fill="#fff" />
    <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" fill="#fff" />
  </svg>
);

const DiscordMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-[#5865F2]">
    <path d="M19.54 5.14A16.5 16.5 0 0 0 15.47 4l-.5 1.03a15.2 15.2 0 0 0-5.94 0L8.53 4a16.5 16.5 0 0 0-4.07 1.14C1.88 8.97 1.18 12.71 1.53 16.4a16.6 16.6 0 0 0 5 2.57l1.21-1.64c-.66-.24-1.29-.55-1.88-.91l.46-.35a11.8 11.8 0 0 0 10.36 0l.46.35c-.59.36-1.22.67-1.88.91l1.21 1.64a16.6 16.6 0 0 0 5-2.57c.42-4.28-.72-7.98-1.93-11.26ZM8.46 14.28c-1.01 0-1.84-.93-1.84-2.08s.81-2.08 1.84-2.08 1.85.93 1.84 2.08c0 1.15-.81 2.08-1.84 2.08Zm7.08 0c-1.01 0-1.84-.93-1.84-2.08s.81-2.08 1.84-2.08 1.85.93 1.84 2.08c0 1.15-.81 2.08-1.84 2.08Z" />
  </svg>
);

const NexoraOSSignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDiscordLoading, setIsDiscordLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, sendMagicLink } = useAuth();

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect") || "/dashboard";
  }, [location.search]);

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  const handleContinue = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      if (password) {
        await signIn(email, password);
        toast({ title: "Signed in", description: "Welcome back to NexoraOS." });
      } else {
        const { error: authError } = await sendMagicLink(email);
        if (authError) {
          setError(authError.message || "Failed to send magic link");
          toast({ title: "Error", description: authError.message, variant: "destructive" });
          return;
        }
        toast({ title: "Success", description: "Check your email for the sign-in link" });
      }
    } catch (authError: unknown) {
      const message = authError instanceof Error ? authError.message : "Something went wrong. Please try again.";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (authError: unknown) {
      const message = authError instanceof Error ? authError.message : "Google sign-in failed. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDiscordSignIn = async () => {
    setIsDiscordLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
    } catch (authError: unknown) {
      const message = authError instanceof Error ? authError.message : "Discord sign-in failed. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsDiscordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080A0C]">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
      </div>
    );
  }

  const isSocialLoading = isGoogleLoading || isDiscordLoading;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080A0C] px-4 py-8 text-[#F0F2F5]">
      <ParticleField />
      <section className="relative z-10 w-full max-w-[400px] rounded-xl border border-[#1E2028] bg-[#0D0F12] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8" aria-labelledby="sign-in-heading">
        <div className="text-center">
          <img src={nexoraLogo} alt="NexoraOS" width="44" height="44" className="mx-auto h-11 w-11" />
          <h1 id="sign-in-heading" className="mt-6 text-xl font-bold tracking-tight text-white">Sign in to NexoraOS</h1>
          <p className="mt-2 text-sm text-[#6B7280]">Create AI-powered digital businesses instantly.</p>
        </div>

        <form onSubmit={handleContinue} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-medium text-[#A6ADB8]">EMAIL</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`h-11 w-full rounded-md border bg-[#111318] px-3.5 text-sm text-white outline-none transition placeholder:text-[#6B7280] focus:border-white ${error ? "border-[#F0F2F5]" : "border-[#2A2D34]"}`}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-medium text-[#A6ADB8]">PASSWORD</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="h-11 w-full rounded-md border border-[#2A2D34] bg-[#111318] px-3.5 text-sm text-white outline-none transition placeholder:text-[#6B7280] focus:border-white"
            />
          </div>
          {error && <p role="alert" className="text-xs text-[#F0F2F5]">{error}</p>}
          <button type="submit" disabled={isLoading || isSocialLoading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-bold text-black transition hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Continue →"}
          </button>
        </form>

        <div className="my-7 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-[#1E2028]" />
          <span className="text-[11px] font-medium text-[#6B7280]">OR</span>
          <div className="h-px flex-1 bg-[#1E2028]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleGoogleSignIn} disabled={isLoading || isSocialLoading} aria-label="Continue with Google" className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border border-[#2A2D34] bg-transparent px-2 text-xs font-medium text-white transition hover:bg-[#111318] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm">
            {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <><GoogleMark /><span>Continue with Google</span></>}
          </button>
          <button type="button" onClick={handleDiscordSignIn} disabled={isLoading || isSocialLoading} aria-label="Continue with Discord" className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border border-[#2A2D34] bg-transparent px-2 text-xs font-medium text-white transition hover:bg-[#111318] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm">
            {isDiscordLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <><DiscordMark /><span>Continue with Discord</span></>}
          </button>
        </div>

        <p className="mt-7 text-center text-xs leading-5 text-[#6B7280]">
          By signing in, you agree to our <a href="#" className="text-[#A6ADB8] underline underline-offset-2 hover:text-white">Terms of Service</a> and <a href="#" className="text-[#A6ADB8] underline underline-offset-2 hover:text-white">Privacy Policy</a>
        </p>
      </section>
    </main>
  );
};

export default NexoraOSSignIn;
