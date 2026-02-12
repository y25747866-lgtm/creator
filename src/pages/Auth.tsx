import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import nexoraLogo from "@/assets/nexora-logo.png";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

const Auth = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, sendMagicLink } = useAuth();

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect") || "/dashboard";
  }, [location.search]);

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      setEmailError(null);
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setEmailError(e.errors[0].message);
      }
      return false;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      const { error } = await sendMagicLink(email);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      setMagicLinkSent(true);
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Google sign-in failed. Please try again.", variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const anyLoading = isLoading || isGoogleLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={nexoraLogo} alt="NexoraOS" className="h-10 w-auto" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {magicLinkSent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground mb-1">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't get it? Check spam or try again.
              </p>
              <Button
                variant="outline"
                onClick={() => { setMagicLinkSent(false); setEmail(""); }}
                className="w-full rounded-xl"
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-foreground mb-1">Sign in to NexoraOS</h1>
                <p className="text-sm text-muted-foreground">
                  Create AI-powered digital businesses instantly.
                </p>
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                    disabled={anyLoading}
                    className="h-11 rounded-xl bg-background"
                    autoFocus
                  />
                  {emailError && (
                    <p className="text-xs text-destructive mt-1.5">{emailError}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl font-medium"
                  disabled={anyLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google */}
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl font-medium gap-3"
                onClick={handleGoogleSignIn}
                disabled={anyLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
          By signing in, you agree to our{" "}
          <a href="#" className="underline hover:text-foreground transition-colors">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="underline hover:text-foreground transition-colors">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
