import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import UnicornScene from 'unicornstudio-react';
import { 
  ArrowRight, Check, Sparkles, Globe, DollarSign,
  Zap, TrendingUp, Rocket, ChevronDown, ChevronUp,
  CreditCard, Layout, Share2, Lightbulb, BarChart2
} from 'lucide-react';
import nexoraLogo from '@/assets/nexora-logo.png';
import founderPhoto from '@/assets/founder-photo.jpg';
import { PlasmaWeb } from '@/components/PlasmaWeb';
import LandingSkeleton from '@/components/LandingSkeleton';
import { useLandingLoading } from '@/hooks/useLandingLoading';

/* ─── Section wrapper with fade-up ─── */
const Section = ({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

const Landing = () => {
  const heroWordsRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useLandingLoading(1500);

  useEffect(() => {
    if (heroWordsRef.current) {
      const words = heroWordsRef.current.querySelectorAll('.hero-word');
      words.forEach((word, index) => {
        setTimeout(() => {
          word.classList.add('opacity-100');
        }, index * 150);
      });
    }
  }, []);

  const faqs = [
    { q: 'Do I need technical skills?', a: 'No. If you can type and click, you can use NexoraOS. The AI handles the technical stuff.' },
    { q: 'How long does it take to create a product?', a: 'Most products are done in under an hour. Some take 20 minutes. Depends on what you\'re building.' },
    { q: 'Can I sell on my own platform?', a: 'Yes. NexoraOS integrates with Gumroad, Whop, Shopify, and more. Or use our built-in checkout.' },
    { q: 'What if I don\'t like it?', a: 'Cancel anytime. No contracts, no commitments, no hard feelings.' },
    { q: 'Is this another course or template library?', a: 'No. This is software that builds products for you. Not tutorials. Not inspiration. Actual products you can sell today.' },
    { q: 'Is there a free plan?', a: 'Yes. Start free, no credit card needed. Upgrade when you\'re ready.' },
  ];

  // Show skeleton while loading
  if (isLoading) {
    return <LandingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-white selection:text-[#0A0A0A] overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ═══ NAVBAR ═══ */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-2xl"
      >
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={nexoraLogo} alt="NexoraOS" className="w-8 h-8" />
            <span className="font-bold text-lg text-white" style={{ fontFamily: "'Syne', sans-serif" }}>NexoraOS</span>
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#666666] absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="px-5 py-2 text-sm font-semibold rounded-lg bg-white text-[#0A0A0A] hover:bg-[#F0F0F0] transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ═══ HERO ═══ */}
      <section
        id="hero"
        className="pt-48 pb-24 hero-section"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Unicorn Studio animated background */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        >
          <UnicornScene
            projectId="mphmwraF225iCJdgjLPD"
            width="100%"
            height="100%"
            scale={1}
            dpi={1.5}
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.6/dist/unicornStudio.umd.js"
          />
        </div>

        {/* Hero content wrapper */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-7xl mx-auto"
            >
              {/* Badge */}
              <div className="flex justify-start mb-8">
                <span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase"
                  style={{ background: '#111111', border: '1px solid #1A1A1A', color: '#FFFFFF', opacity: 0.6 }}>
                  AI-POWERED BUSINESS OS
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left: Text */}
                <div className="text-left">
                  <div ref={heroWordsRef}>
                    <h1 className="text-4xl md:text-[64px] font-[800] leading-[1.1] mb-8" style={{ fontFamily: "'Syne', sans-serif" }}>
                      <div className="hero-word opacity-0 transition-opacity duration-500 text-white/85">Your idea.</div>
                      <div className="hero-word opacity-0 transition-opacity duration-500 text-white/85">Your product.</div>
                      <div className="hero-word opacity-0 transition-opacity duration-500">
                        <span className="text-white/85">Your </span>
                        <span className="text-white font-[900] opacity-100">income.</span>
                      </div>
                      <div className="hero-word opacity-0 transition-opacity duration-500 text-white/85">In one session.</div>
                    </h1>
                  </div>

                  <p className="text-[#666666] mb-10 text-lg leading-relaxed max-w-lg">
                    NexoraOS is the only system built for creators who are done waiting. Build, launch, and monetize — all in one place.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-4">
                    <Link
                      to="/auth"
                      className="px-8 py-4 font-bold rounded-lg bg-white text-[#0A0A0A] hover:bg-[#F0F0F0] transition-all text-sm flex items-center gap-2"
                    >
                      Start Building Now <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <p className="text-[#333333] text-xs">No credit card. No fluff.</p>
                </div>

                {/* Right: Terminal Window */}
                <div className="hidden lg:block">
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl max-w-md ml-auto"
                  >
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1A1A1A]">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                    </div>
                    <div className="p-8 space-y-5 font-mono text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-white">✓</span>
                        <span className="text-[#CCCCCC]">Product Generated</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white">✓</span>
                        <span className="text-[#CCCCCC]">Sales Page Live</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white">✓</span>
                        <span className="text-[#CCCCCC]">First Sale: <span className="text-white font-bold">$49</span></span>
                      </div>
                      <div className="pt-4 border-t border-[#1A1A1A]">
                        <span className="text-[#666666]">Time elapsed: </span>
                        <span className="text-white">47 minutes</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION ═══ */}
      <Section id="features" className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-left mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              WHAT YOU GET
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-left mb-16" style={{ fontFamily: "'Syne', sans-serif" }}>
            What you can do
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
            {/* Generate - 60% */}
            <div className="md:col-span-6 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Generate</h3>
              <p className="text-[#666666] leading-relaxed">AI builds your digital product from scratch. eBooks, courses, templates, software—whatever you can sell, we can generate.</p>
            </div>

            {/* Launch - 40% */}
            <div className="md:col-span-4 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Launch</h3>
              <p className="text-[#666666] leading-relaxed">Sales page, checkout, delivery—all automated. You just share the link.</p>
            </div>

            {/* Sell - 40% */}
            <div className="md:col-span-4 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Sell</h3>
              <p className="text-[#666666] leading-relaxed">Plug into any platform. Keep 100% of your earnings.</p>
            </div>

            {/* Track - 60% */}
            <div className="md:col-span-6 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Track</h3>
              <p className="text-[#666666] leading-relaxed">Real-time analytics. Know what's working. Know what's making money. No guesswork.</p>
            </div>

            {/* Scale - 100% width, inline format */}
            <div className="md:col-span-10 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  <h3 className="text-2xl font-bold whitespace-nowrap" style={{ fontFamily: "'Syne', sans-serif" }}>Scale</h3>
                  <p className="text-[#666666] leading-relaxed">One product works? Spin up 10 more. The system does the heavy lifting.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ PLATFORM STRIP ═══ */}
      <section
        className="relative overflow-hidden"
        style={{ background: '#080808', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', padding: '32px 0' }}
        onMouseEnter={(e) => {
          const track = e.currentTarget.querySelector('.platform-track') as HTMLElement;
          if (track) track.style.animationPlayState = 'paused';
        }}
        onMouseLeave={(e) => {
          const track = e.currentTarget.querySelector('.platform-track') as HTMLElement;
          if (track) track.style.animationPlayState = 'running';
        }}
      >
        <p style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#333333', marginBottom: '20px', fontFamily: "'DM Sans', sans-serif" }}>
          SELL ON ANY PLATFORM
        </p>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none" style={{ width: '120px', background: 'linear-gradient(to right, #080808, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none" style={{ width: '120px', background: 'linear-gradient(to left, #080808, transparent)' }} />

        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div
            className="platform-track"
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              gap: '80px',
              width: 'max-content',
              animation: 'platform-scroll 35s linear infinite',
            }}
          >
            {[1,2,3,4,5,6,7,8,1,2,3,4,5,6,7,8].map((n, i) => (
              <img
                key={i}
                src={`/logos/logo-${n}.png`}
                alt={`Platform logo ${n}`}
                style={{ height: '40px', width: 'auto', flexShrink: 0, opacity: 0.5, transition: 'opacity 300ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOUNDER ═══ */}
      <Section className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              WHY I BUILT THIS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Founder Photo */}
            <div className="flex justify-center">
              <div className="aspect-square w-full max-w-sm rounded-3xl overflow-hidden border border-[#1A1A1A]">
                <img src={founderPhoto} alt="Yesh Malik — Founder of NexoraOS" className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Quote */}
            <div>
              <p className="text-[#333333] text-7xl font-serif leading-none mb-6">"</p>
              <p className="text-white text-xl md:text-2xl leading-relaxed mb-8 -mt-8" style={{ fontFamily: "'Syne', sans-serif" }}>
                I built this because I was tired of watching talented people waste years learning 'the right way' while others were already cashing out.
              </p>
              <div className="h-px bg-[#1A1A1A] mb-6" />
              <p className="text-white font-bold text-lg">Yesh Malik</p>
              <p className="text-[#666666] text-sm">Founder, NexoraOS</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ PRICING ═══ */}
      <Section id="pricing" className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-left mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              SIMPLE PRICING
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-left mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            Simple pricing
          </h2>
          <p className="text-left text-[#666666] mb-16">Pick what works. Cancel anytime.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Creator */}
            <div className="bg-white border border-white rounded-2xl p-8 flex flex-col md:order-2 relative">
              <h3 className="text-lg font-bold mb-2 text-[#0A0A0A]">Creator</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-bold text-[#0A0A0A]">$19</span>
                <span className="text-[#666666]">/mo</span>
              </div>
              <p className="text-[#666666] text-sm mb-6">Cancel anytime. No questions.</p>
              <div className="space-y-3 mb-8 flex-grow">
                {['Unlimited AI Generations', 'Premium Sales Page Builder', 'Advanced Analytics', 'Full-length exports', 'Built-in Monetization'].map((f, j) => (
                  <div key={j} className="flex items-center gap-3 text-sm text-[#0A0A0A]/70">
                    <Check className="w-4 h-4 text-[#0A0A0A] shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/pricing" className="w-full py-3.5 rounded-lg bg-[#0A0A0A] text-white font-bold text-center text-sm hover:opacity-90 transition-all block">
                Get Started
              </Link>
            </div>

            {/* Free */}
            <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 flex flex-col md:order-1">
              <h3 className="text-lg font-bold mb-2">Free</h3>
              <div className="flex items-baseline mb-2">
                <span className="text-5xl font-bold">$0</span>
              </div>
              <p className="text-[#666666] text-sm mb-6">Try it out. See if it clicks.</p>
              <div className="space-y-3 mb-8 flex-grow">
                {['1 AI generation/day', 'Basic Sales Page Builder', 'Standard Analytics', 'Short-form exports'].map((f, j) => (
                  <div key={j} className="flex items-center gap-3 text-sm text-[#999999]">
                    <Check className="w-4 h-4 text-[#333333] shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth" className="w-full py-3.5 rounded-lg border border-[#242424] text-white font-bold text-center text-sm hover:border-white/20 transition-all block">
                Start Free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 flex flex-col md:order-3">
              <h3 className="text-lg font-bold mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-bold">$39</span>
                <span className="text-[#666666]">/mo</span>
              </div>
              <p className="text-[#666666] text-sm mb-6">For those going all in.</p>
              <div className="space-y-3 mb-8 flex-grow">
                {['Everything in Creator', 'AI Business Assistant', 'Priority Processing', 'Custom Domain Support', 'Advanced Automation'].map((f, j) => (
                  <div key={j} className="flex items-center gap-3 text-sm text-[#999999]">
                    <Check className="w-4 h-4 text-[#333333] shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/pricing" className="w-full py-3.5 rounded-lg border border-[#242424] text-white font-bold text-center text-sm hover:border-white/20 transition-all block">
                Go Pro
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-left mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              QUESTIONS
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              Frequently Asked
            </h2>
            <h2 className="text-3xl md:text-5xl font-bold text-white/30" style={{ fontFamily: "'Syne', sans-serif" }}>
              Questions
            </h2>
          </div>
          
          <div className="space-y-12">
            {faqs.map((faq, i) => (
              <div key={i} className="relative pl-20">
                <span className="absolute left-0 top-0 text-6xl font-bold text-white/5 font-mono leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-bold text-white mb-3">{faq.q}</h3>
                <p className="text-[#666666] leading-relaxed max-w-2xl">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-16 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <img src={nexoraLogo} alt="NexoraOS" className="w-8 h-8" />
                <span className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>NexoraOS</span>
              </div>
              <p className="text-[#333333] text-sm">Built by a creator, for creators.</p>
              <p className="text-[#222222] text-xs mt-1">No VC money. No corporate BS.</p>
            </div>
            <div className="flex gap-8 text-sm text-[#333333]">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <span>© 2026 NexoraOS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
