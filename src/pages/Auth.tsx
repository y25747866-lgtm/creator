import React, { useState, useEffect, useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { signInWithGoogle } from "@/lib/auth/login";
import nexoraLogo from "@/assets/nexora-logo.png";

const emailSchema = z.string().email("Please enter a valid email address");

const NexoraOSSignIn = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error: authError } = await sendMagicLink(email);
      if (authError) {
        setError(authError.message || 'Failed to send magic link');
        toast({ title: "Error", description: authError.message, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Check your email for the sign-in link" });
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-6 h-6 animate-spin text-[#666666]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <style>{`
        ::selection {
          background: #FFFFFF;
          color: #0A0A0A;
        }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 100px #111111 inset;
          -webkit-text-fill-color: #FFFFFF;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease forwards;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease forwards;
        }
        
        .stagger-1 {
          animation-delay: 0.1s;
          opacity: 0;
        }
        
        .stagger-2 {
          animation-delay: 0.2s;
          opacity: 0;
        }
        
        .stagger-3 {
          animation-delay: 0.3s;
          opacity: 0;
        }
        
        .stagger-4 {
          animation-delay: 0.4s;
          opacity: 0;
        }
        
        .stagger-5 {
          animation-delay: 0.5s;
          opacity: 0;
        }
        
        .stagger-6 {
          animation-delay: 0.6s;
          opacity: 0;
        }
        
        .stagger-7 {
          animation-delay: 0.7s;
          opacity: 0;
        }
      `}</style>

      {/* Left Panel */}
      <div 
        className="md:w-[55%] bg-[#0A0A0A] relative overflow-hidden h-14 md:h-screen flex flex-col"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      >
        {/* Subtle glow effect */}
        <div 
          className="absolute bottom-0 left-0 w-[600px] h-[600px] pointer-events-none hidden md:block"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)',
          }}
        />
        
        {/* Logo - Always visible */}
        <div className="absolute top-0 left-0 p-6 md:p-8 flex items-center gap-2 animate-fade-in stagger-1 z-20">
          <div className="w-8 h-8 bg-white flex items-center justify-center font-bold text-black text-sm">
            N
          </div>
          <span className="text-white font-semibold text-base">NexoraOS</span>
        </div>

        {/* Center Content - Hidden on mobile */}
        <div className="hidden md:flex flex-col justify-center items-start h-full px-12 relative z-10">
          <div className="max-w-lg">
            {/* Badge */}
            <div className="mb-6 animate-fade-in stagger-2">
              <span 
                className="inline-block px-3 py-1.5 text-[10px] font-semibold tracking-wider"
                style={{
                  background: '#111111',
                  border: '1px solid #1A1A1A',
                  color: '#FFFFFF',
                  opacity: 0.5,
                }}
              >
                AI-POWERED BUSINESS OS
              </span>
            </div>

            {/* Headline */}
            <h1 
              className="text-white mb-4 animate-fade-in stagger-3"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '40px',
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              Turn your idea into income.
            </h1>

            {/* Subheadline */}
            <p 
              className="text-[#666666] mb-6 animate-fade-in stagger-4"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Everything you need to build, launch, and sell digital products — in one place.
            </p>

            {/* Features */}
            <div className="space-y-3 mt-6">
              {[
                'Generate a full ebook in under 60 seconds',
                'Launch a sales page without touching code',
                'Sell on Whop, Gumroad, Payhip and more'
              ].map((feature, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 animate-fade-in stagger-${index + 5}`}
                >
                  <Check className="w-4 h-4 text-white flex-shrink-0" />
                  <span 
                    className="text-[#999999]"
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                    }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright - Hidden on mobile */}
        <div className="hidden md:block absolute bottom-0 left-0 p-8 z-20">
          <p className="text-[#333333] text-[11px]">© 2026 NexoraOS</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 md:w-[45%] bg-[#080808] flex flex-col justify-center items-center h-screen p-12">
        <div className="w-full max-w-[340px] animate-fade-in-up">
          {/* Header */}
          <div className="mb-8">
            <h2 
              className="text-white mb-2"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              Sign in to NexoraOS
            </h2>
            <p 
              className="text-[#666666]"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
              }}
            >
              Create AI-powered digital businesses instantly.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleContinue} className="space-y-4">
            {/* Email Input */}
            <div>
              <label 
                htmlFor="email"
                className="text-[#444444] text-[10px] font-semibold tracking-wider mb-2 block"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full h-11 bg-[#111111] border rounded-md px-3.5 text-white placeholder:text-[#333333] focus:outline-none transition-all ${
                  error 
                    ? 'border-[#FF4444]' 
                    : 'border-[#1A1A1A] focus:border-[rgba(255,255,255,0.3)] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]'
                }`}
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                }}
              />
              {error && (
                <p className="text-[#FF4444] text-xs mt-1.5">{error}</p>
              )}
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-white text-[#0A0A0A] font-bold rounded-md hover:bg-[#F0F0F0] transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none flex items-center justify-center gap-2"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                height: '44px',
                fontWeight: 700,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Continue →'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-[#1A1A1A]" />
              <span className="text-[#333333] text-xs">OR</span>
              <div className="flex-1 h-px bg-[#1A1A1A]" />
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full h-11 bg-[#111111] border border-[#1A1A1A] rounded-md flex items-center justify-center gap-3 text-[#999999] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#161616] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.20443C17.64 8.56625 17.5827 7.95262 17.4764 7.36353H9V10.8449H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8194H14.9564C16.6582 14.2526 17.64 11.9453 17.64 9.20443Z" fill="#4285F4"/>
                    <path d="M8.99976 18C11.4298 18 13.467 17.1941 14.9561 15.8195L12.0475 13.5613C11.2416 14.1013 10.2107 14.4204 8.99976 14.4204C6.65567 14.4204 4.67158 12.8372 3.96385 10.71H0.957031V13.0418C2.43794 15.9831 5.48158 18 8.99976 18Z" fill="#34A853"/>
                    <path d="M3.96409 10.7098C3.78409 10.1698 3.68182 9.59301 3.68182 8.99983C3.68182 8.40665 3.78409 7.82983 3.96409 7.28983V4.95801H0.957273C0.347727 6.17301 0 7.54755 0 8.99983C0 10.4521 0.347727 11.8266 0.957273 13.0416L3.96409 10.7098Z" fill="#FBBC05"/>
                    <path d="M8.99976 3.57955C10.3211 3.57955 11.5075 4.03364 12.4402 4.92545L15.0216 2.34409C13.4629 0.891818 11.4257 0 8.99976 0C5.48158 0 2.43794 2.01682 0.957031 4.95818L3.96385 7.29C4.67158 5.16273 6.65567 3.57955 8.99976 3.57955Z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </form>

          {/* Terms */}
          <p 
            className="text-[#333333] text-center mt-6"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              lineHeight: 1.5,
            }}
          >
            By signing in, you agree to our{' '}
            <a href="#" className="text-[#555555] underline hover:text-[#777777]">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[#555555] underline hover:text-[#777777]">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default NexoraOSSignIn;
