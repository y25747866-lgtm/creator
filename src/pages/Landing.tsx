import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Globe, DollarSign,
  Zap, TrendingUp, Rocket, ChevronDown, ChevronUp,
  CreditCard, Layout, Share2, Lightbulb, BarChart2
} from 'lucide-react';
import nexoraLogo from '@/assets/nexora-logo.png';
import { PlasmaWeb } from '@/components/PlasmaWeb';

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

/* ─── FAQ Item ─── */
const FAQItem = ({ num, q, a }: { num: string; q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#1A1A1A]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-6 py-6 text-left hover:opacity-80 transition-opacity">
        <span className="text-[#333333] text-sm font-mono w-6 shrink-0">{num}</span>
        <span className="font-semibold text-white flex-1">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-[#666666] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#333333] shrink-0" />}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="pl-12 pb-6 text-[#666666] leading-relaxed text-sm max-w-2xl">{a}</p>
      </motion.div>
    </div>
  );
};

const Landing = () => {
  const heroWordsRef = useRef<HTMLDivElement>(null);

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

  const systemItems = [
    { icon: Lightbulb, title: 'Creation', benefit: 'Turn any idea into a structured digital product.' },
    { icon: Zap, title: 'Automation', benefit: 'Automate your marketing and sales assets.' },
    { icon: CreditCard, title: 'Monetization', benefit: 'Built-in checkout and revenue tracking.' },
    { icon: Layout, title: 'Management', benefit: 'Control all your products from one dashboard.' },
    { icon: TrendingUp, title: 'Scaling', benefit: 'Optimize conversions with real-time data.' },
    { icon: Share2, title: 'Distribution', benefit: 'Export and sell on any platform you choose.' },
  ];

  const faqs = [
    { q: 'Do I need technical skills?', a: 'No. If you can type and click, you can use NexoraOS. The AI handles the technical stuff.' },
    { q: 'How long does it take to create a product?', a: 'Most products are done in under an hour. Some take 20 minutes. Depends on what you\'re building.' },
    { q: 'Can I sell on my own platform?', a: 'Yes. NexoraOS integrates with Gumroad, Whop, Shopify, and more. Or use our built-in checkout.' },
    { q: 'What if I don\'t like it?', a: 'Cancel anytime. No contracts, no commitments, no hard feelings.' },
    { q: 'Is this another course or template library?', a: 'No. This is software that builds products for you. Not tutorials. Not inspiration. Actual products you can sell today.' },
    { q: 'Is there a free plan?', a: 'Yes. Start free, no credit card needed. Upgrade when you\'re ready.' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-white selection:text-[#0A0A0A] overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={nexoraLogo} alt="NexoraOS" className="w-8 h-8" />
            <span className="font-bold text-lg text-white" style={{ fontFamily: "'Syne', sans-serif" }}>NexoraOS</span>
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#666666]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-[#666666] hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link to="/auth" className="px-5 py-2 text-sm font-semibold rounded-lg bg-white text-[#0A0A0A] hover:bg-[#F0F0F0] transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-32 pb-24 relative overflow-hidden hero-section">
        <div className="absolute inset-0 -z-10">
          <PlasmaWeb
            hueShift={270}
            density={0.6}
            glowIntensity={0.8}
            saturation={0.5}
            brightness={0.3}
            energyFlow={0.6}
            pulseIntensity={0.1}
            attractionStrength={1.2}
            mouseAttraction={true}
            transparent={false}
            speed={0.3}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-transparent to-[#0A0A0A] -z-10" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-7xl mx-auto"
          >
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase"
                style={{ background: '#111111', border: '1px solid #1A1A1A', color: '#FFFFFF', opacity: 0.6 }}>
                AI-POWERED BUSINESS OS
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: Text */}
              <div>
                <div ref={heroWordsRef}>
                  <h1 className="text-4xl md:text-[56px] font-black leading-[1.1] mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">Your </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">idea. </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">Your </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">product. </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">Your </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">income. </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">In </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block">one </span>
                    <span className="hero-word opacity-0 transition-opacity duration-500 inline-block text-[#7C3AED]">session.</span>
                  </h1>
                </div>

                <p className="text-[#666666] mb-8 text-base leading-relaxed max-w-lg">
                  NexoraOS is the only system built for creators who are done waiting. Build, launch, and monetize — all in one place.
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                  <Link
                    to="/auth"
                    className="px-8 py-3.5 font-bold rounded-lg bg-white text-[#0A0A0A] hover:bg-[#F0F0F0] transition-all text-sm flex items-center gap-2"
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 30px rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 0px rgba(255,255,255,0)')}
                  >
                    Start Building Now <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#features"
                    className="px-8 py-3.5 font-bold rounded-lg border border-[#242424] text-[#999999] hover:border-white/20 hover:text-white transition-all text-sm"
                  >
                    Explore the OS
                  </a>
                </div>
                <p className="text-[#333333] text-xs">No credit card. No fluff.</p>
              </div>

              {/* Right: Terminal Window */}
              <div className="hidden lg:block">
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1A1A1A]">
                    <div className="w-3 h-3 rounded-full bg-[#333333]" />
                    <div className="w-3 h-3 rounded-full bg-[#333333]" />
                    <div className="w-3 h-3 rounded-full bg-[#333333]" />
                  </div>
                  <div className="p-6 space-y-4 font-mono text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-green-500">✓</span>
                      <span className="text-[#CCCCCC]">Product Generated</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-500">✓</span>
                      <span className="text-[#CCCCCC]">Sales Page Live</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-500">✓</span>
                      <span className="text-[#CCCCCC]">First Sale: <span className="text-white font-bold">$49</span></span>
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t border-[#1A1A1A]">
                      <span className="text-[#666666]">Time elapsed:</span>
                      <span className="text-white font-bold">47 minutes</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION ═══ */}
      <Section id="features" className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              WHAT YOU GET
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16" style={{ fontFamily: "'Syne', sans-serif" }}>
            What you can do
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Generate - Large */}
            <div className="md:col-span-6 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Generate</h3>
              <p className="text-[#666666] leading-relaxed">AI builds your digital product from scratch. eBooks, courses, templates, software—whatever you can sell, we can generate.</p>
            </div>

            {/* Launch */}
            <div className="md:col-span-4 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Launch</h3>
              <p className="text-[#666666] leading-relaxed">Sales page, checkout, delivery—all automated. You just share the link.</p>
            </div>

            {/* Sell */}
            <div className="md:col-span-4 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer md:col-start-1">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Sell</h3>
              <p className="text-[#666666] leading-relaxed">Plug into any platform. Keep 100% of your earnings.</p>
            </div>

            {/* Track */}
            <div className="md:col-span-6 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>Track</h3>
              <p className="text-[#666666] leading-relaxed">Real-time analytics. Know what's working. Know what's making money. No guesswork.</p>
            </div>

            {/* Scale - Full width */}
            <div className="md:col-span-12 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8 hover:border-[#2A2A2A] transition-all group cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Scale</h3>
                  <p className="text-[#666666] leading-relaxed">One product works? Spin up 10 more. The system does the heavy lifting.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ PLATFORM STRIP ═══ */}
      <Section className="py-12 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-semibold tracking-[0.2em] uppercase text-[#333333] mb-6">
            SELL ON ANY PLATFORM
          </p>
          <div className="marquee">
            <div className="marquee-content">
              {[...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  <span className="text-[#333333] text-sm font-medium">Payhip</span>
                  <span className="text-[#1A1A1A]">·</span>
                  <span className="text-[#333333] text-sm font-medium">Etsy</span>
                  <span className="text-[#1A1A1A]">·</span>
                  <span className="text-[#333333] text-sm font-medium">Gumroad</span>
                  <span className="text-[#1A1A1A]">·</span>
                  <span className="text-[#333333] text-sm font-medium">Whop</span>
                  <span className="text-[#1A1A1A]">·</span>
                  <span className="text-[#333333] text-sm font-medium">Shopify</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ INFRASTRUCTURE ═══ */}
      <Section className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>Built on Powerful Infrastructure</h2>
            <p className="text-[#666666] max-w-2xl mx-auto text-lg">Everything you need, nothing you don't.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemItems.map((item, i) => (
              <div key={i} className="flex items-start gap-5 p-7 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl hover:border-[#2A2A2A] transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#111111] border border-[#1A1A1A] flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">{item.title}</h4>
                  <p className="text-sm text-[#666666]">{item.benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOUNDER ═══ */}
      <Section className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              WHY I BUILT THIS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Photo placeholder */}
            <div className="flex justify-center">
              <div className="aspect-square w-full max-w-sm rounded-3xl bg-[#0F0F0F] border border-[#1A1A1A] flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                  YM
                </div>
                <p className="text-[#333333] text-sm">Photo coming soon</p>
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
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              SIMPLE PRICING
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            Simple pricing
          </h2>
          <p className="text-center text-[#666666] mb-16">Pick what works. Cancel anytime.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Creator - Featured first */}
            <div className="bg-[#0F0F0F] border border-[#242424] rounded-2xl p-8 flex flex-col md:order-2 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#0A0A0A] text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg font-bold mb-2">Creator</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-bold">$19</span>
                <span className="text-[#666666]">/mo</span>
              </div>
              <p className="text-[#666666] text-sm mb-6">Cancel anytime. No questions.</p>
              <div className="space-y-3 mb-8 flex-grow">
                {['Unlimited AI Generations', 'Premium Sales Page Builder', 'Advanced Analytics', 'Full-length exports', 'Built-in Monetization'].map((f, j) => (
                  <div key={j} className="flex items-center gap-3 text-sm text-[#999999]">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth" className="w-full py-3.5 rounded-lg bg-white text-[#0A0A0A] font-bold text-center text-sm hover:bg-[#F0F0F0] transition-all block">
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
              <Link to="/auth" className="w-full py-3.5 rounded-lg border border-[#242424] text-white font-bold text-center text-sm hover:border-white/20 transition-all block">
                Go Pro
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#666666] border border-[#1A1A1A] bg-[#111111] mb-6">
              QUESTIONS
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            Frequently Asked
          </h2>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#333333]" style={{ fontFamily: "'Syne', sans-serif" }}>
            Questions
          </h2>
          <div>
            {faqs.map((faq, i) => (
              <FAQItem key={i} num={String(i + 1).padStart(2, '0')} q={faq.q} a={faq.a} />
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
