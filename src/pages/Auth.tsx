import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Loader2, Sparkles, BookOpen, Download, DollarSign, ArrowRight, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { signInWithGoogle } from "@/lib/auth/login";
import { PlasmaWeb } from "@/components/PlasmaWeb";

const emailSchema = z.string().email("Please enter a valid email address");

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

interface OrbitingIconProps {
  icon: React.ReactNode;
  radius: number;
  angle: number;
  duration: number;
  delay: number;
}

function OrbitingIcon({ icon, radius, angle, duration, delay }: OrbitingIconProps) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        animation: `orbit ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        // @ts-ignore
        "--orbit-radius": `${radius}px`,
      }}
    >
      <div
        className="absolute"
        style={{
          left: `${radius * Math.cos((angle * Math.PI) / 180)}px`,
          top: `${radius * Math.sin((angle * Math.PI) / 180)}px`,
        }}
      >
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-cyan-400/30 to-purple-500/30 backdrop-blur-sm border border-purple-400/30 flex items-center justify-center text-purple-300 hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </div>
  );
}

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
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      toast({
        title: "Error",
        description: err.message || "Google sign-in failed. Please try again.",
        variant: "destructive",
      });
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
    <div className="min-h-screen w-full bg-black flex flex-col md:flex-row overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orbit {
          from {
            transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg);
          }
        }
        
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(168, 85, 247, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(168, 85, 247, 0.2);
          }
        }
      `}} />

      {/* Left Side: Visuals with Enhanced Design */}
      <div className="relative w-full md:w-1/2 min-h-[50vh] md:min-h-screen flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-black">
          <PlasmaWeb
            hueShift={270}
            density={0.8}
            glowIntensity={1.2}
            saturation={0.6}
            brightness={0.5}
            energyFlow={0.8}
            pulseIntensity={0.2}
            attractionStrength={1.5}
            mouseAttraction={true}
            transparent={false}
            speed={0.5}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 lg:py-0">
          {/* Enhanced Animated Orb */}
          <div className="relative w-40 h-40 md:w-56 md:h-56 mb-8 md:mb-12">
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/40 via-purple-500/30 to-transparent blur-3xl"
              style={{ animation: "breathe 4s ease-in-out infinite" }}
            />
            
            <div 
              className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 shadow-2xl"
              style={{ 
                animation: "breathe 4s ease-in-out infinite",
                boxShadow: "0 0 40px rgba(168, 85, 247, 0.6), inset 0 0 40px rgba(168, 85, 247, 0.3)"
              }}
            />

            <div className="absolute inset-0">
              <OrbitingIcon
                icon={<Sparkles className="w-5 h-5" />}
                radius={100}
                angle={0}
                duration={12}
                delay={0}
              />
              <OrbitingIcon
                icon={<BookOpen className="w-5 h-5" />}
                radius={100}
                angle={90}
                duration={12}
                delay={3}
              />
              <OrbitingIcon
                icon={<Download className="w-5 h-5" />}
                radius={100}
                angle={180}
                duration={12}
                delay={6}
              />
              <OrbitingIcon
                icon={<DollarSign className="w-5 h-5" />}
                radius={100}
                angle={270}
                duration={12}
                delay={9}
              />
            </div>
          </div>

          {/* Enhanced Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white text-center mb-4 md:mb-6 max-w-3xl leading-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              Transform Ideas into Reality
            </h1>
            <p className="text-sm md:text-base text-purple-200/80 text-center max-w-2xl leading-relaxed">
              AI-powered platform to create digital products instantly
            </p>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap gap-3 justify-center mt-8 md:mt-12"
          >
            <div className="px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 backdrop-blur-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-xs md:text-sm text-purple-200">Lightning Fast</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 backdrop-blur-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-xs md:text-sm text-purple-200">Secure & Private</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 backdrop-blur-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs md:text-sm text-purple-200">AI Powered</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Auth Form - Improved Design */}
      <div className="relative w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-black md:bg-gradient-to-br md:from-zinc-950 md:to-black overflow-y-auto shrink-0">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl bg-gradient-to-br from-zinc-900/80 to-black/80 backdrop-blur-xl border border-purple-500/20 shadow-2xl p-8 md:p-10"
            style={{
              boxShadow: "0 0 40px rgba(168, 85, 247, 0.1), inset 0 0 40px rgba(168, 85, 247, 0.05)"
            }}
          >
            {magicLinkSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex justify-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/30">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                  <p className="text-gray-400">
                    We sent a sign-in link to <span className="font-medium text-purple-300">{email}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => { setMagicLinkSent(false); setEmail(""); }}
                  className="w-full rounded-xl border-gray-700 text-white hover:bg-white/5 transition-all duration-200"
                >
                  Use a different email
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                      Welcome Back
                    </h2>
                    <p className="text-sm text-gray-400">
                      Sign in to your NexoraOS account
                    </p>
                  </motion.div>
                </div>

                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
                  {/* Email Input */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full flex flex-col gap-2"
                  >
                    <label className="text-xs font-medium text-gray-300">Email Address</label>
                    <Input
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                      disabled={anyLoading}
                      className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border border-purple-500/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all hover:bg-white/8 disabled:opacity-50"
                    />
                    {emailError && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-400 text-left"
                      >
                        {emailError}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Continue Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Button
                      type="submit"
                      disabled={anyLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold h-auto py-3 rounded-lg shadow-lg shadow-purple-500/30 transition-all duration-200 text-sm flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  {/* Divider */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="relative my-2"
                  >
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-zinc-900 text-gray-500">OR</span>
                    </div>
                  </motion.div>

                  {/* Google Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      disabled={anyLoading}
                      className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-gray-700 rounded-lg h-auto py-3 font-medium text-white shadow transition-all duration-200 text-sm disabled:opacity-50"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <GoogleIcon />
                          Continue with Google
                        </>
                      )}
                    </Button>
                  </motion.div>

                  {/* Terms & Privacy */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="w-full text-center mt-6"
                  >
                    <span className="text-xs text-gray-500">
                      By signing in, you agree to our{" "}
                      <a href="#" className="text-purple-400 hover:text-purple-300 underline transition-colors">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-purple-400 hover:text-purple-300 underline transition-colors">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
