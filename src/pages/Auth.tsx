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
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: 1 + Math.random() * 0.5,
      opacity: 0.16 + Math.random() * 0.18,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
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
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" />
  </svg>
);

const DiscordMark = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
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
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
      </div>
    );
  }

  const isSocialLoading = isGoogleLoading || isDiscordLoading;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121212] px-4 py-8 text-[#F0F2F5]">
      <ParticleField />
      <section className="relative z-10 w-full max-w-[400px] rounded-xl border border-[#2A2D34] bg-[#1F1F1F] p-8 shadow-[0_16px_48px_rgba(0,0,0,0.24)]" aria-labelledby="sign-in-heading">
        <div className="text-center">
          <img src={nexoraLogo} alt="NexoraOS" width="44" height="44" className="mx-auto h-11 w-11 brightness-0 invert" />
          <h1 id="sign-in-heading" className="mt-6 text-xl font-bold tracking-tight text-white">Sign in to NexoraOS</h1>
          <p className="mt-2 text-sm text-[#6B7280]">Create AI-powered digital businesses instantly.</p>
        </div>

        <form onSubmit={handleContinue} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-medium text-[#A6ADB8]">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`h-11 w-full rounded-md border bg-[#1F1F1F] px-3.5 text-sm text-white outline-none transition placeholder:text-[#6B7280] focus:border-white ${error ? "border-[#F0F2F5]" : "border-[#2A2D34]"}`}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-medium text-[#A6ADB8]">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="h-11 w-full rounded-md border border-[#2A2D34] bg-[#1F1F1F] px-3.5 text-sm text-white outline-none transition placeholder:text-[#6B7280] focus:border-white"
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

        <div className="flex flex-col gap-3">
          <button type="button" onClick={handleGoogleSignIn} disabled={isLoading || isSocialLoading} aria-label="Continue with Google" className="flex h-11 w-full min-w-0 items-center justify-start gap-3 rounded-md border border-[#E0E0E0] bg-white px-4 text-sm font-medium text-black transition hover:bg-[#F0F0F0] disabled:cursor-not-allowed disabled:opacity-50">
            {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <><GoogleMark /><span>Continue with Google</span></>}
          </button>
          <button type="button" onClick={handleDiscordSignIn} disabled={isLoading || isSocialLoading} aria-label="Continue with Discord" className="flex h-11 w-full min-w-0 items-center justify-start gap-3 rounded-md bg-[#5865F2] px-4 text-sm font-medium text-white transition hover:bg-[#4F5BDE] disabled:cursor-not-allowed disabled:opacity-50">
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
