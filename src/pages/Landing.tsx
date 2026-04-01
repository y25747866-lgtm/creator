import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Globe, Layers, BarChart3, 
  Cpu, Zap, TrendingUp, Users, Star, DollarSign,
  Lightbulb, Rocket, ChevronDown, ChevronUp,
  BookOpen, Megaphone, Target, Download, RefreshCw,
  GitBranch, Share2, LayoutDashboard, MessageSquare
} from 'lucide-react';
import nexoraLogo from '@/assets/nexora-logo.png';
import LogoMarquee from '@/components/LogoMarquee';
import {
  WebDesignFastTrackIcon, PenToProfitIcon, DigitalLaunchpadIcon,
  AgencyNavigatorIcon, PersonalBrandBlueprintIcon, WinningStoreIcon, Detox101Icon
} from '@/components/LogoIcons';

/* ─── Animated Counter ─── */
const AnimatedCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─── FAQ Item ─── */
const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-white/8 rounded-2xl overflow-hidden transition-all ${open ? 'border-l-2 border-l-[#5B4FE8]' : ''}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-semibold text-[#EFF0F4] pr-4">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-[#5B4FE8] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#6B7280] shrink-0" />}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-6 text-[#9EA4C0] leading-relaxed">{a}</p>
      </motion.div>
    </div>
  );
};

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
  const [isYearly, setIsYearly] = useState(false);

  const features = [
    { icon: Sparkles, title: 'AI Product Generator', desc: 'Generate ebooks, guides, and courses from a single idea in minutes.', color: 'from-orange-500 to-amber-500' },
    { icon: Layers, title: 'Monetization Engine', desc: 'Turn one product into 8+ revenue streams with modular monetization.', color: 'from-purple-500 to-violet-500' },
    { icon: RefreshCw, title: 'Self-Evolving Products', desc: 'Products learn from feedback and auto-improve across versions.', color: 'from-pink-500 to-rose-500' },
    { icon: BarChart3, title: 'Analytics Intelligence', desc: 'Real-time insights into performance, sales, and customer behavior.', color: 'from-teal-500 to-cyan-500' },
    { icon: Target, title: 'Sales Page Builder', desc: 'Create high-converting landing pages optimized for conversions.', color: 'from-red-500 to-orange-500' },
    { icon: Megaphone, title: 'Marketing Studio', desc: 'AI-generated copy, social posts, and email sequences on demand.', color: 'from-green-500 to-emerald-500' },
    { icon: GitBranch, title: 'Versioning System', desc: 'Track every iteration with full version history and rollback.', color: 'from-gray-500 to-slate-500' },
    { icon: Share2, title: 'Referral Growth', desc: 'Built-in referral system to amplify your reach organically.', color: 'from-blue-500 to-indigo-500' },
    { icon: LayoutDashboard, title: 'Smart Dashboard', desc: 'Command center for all your products, metrics, and workflows.', color: 'from-indigo-500 to-purple-500' },
    { icon: Download, title: 'Downloads & Exports', desc: 'Export your content as PDF, markdown, or any format you need.', color: 'from-cyan-500 to-blue-500' },
  ];

  const faqs = [
    { q: 'What is NexoraOS?', a: 'NexoraOS is an AI-powered operating system for digital entrepreneurs. It helps you create, monetize, and scale digital products from a single platform.' },
    { q: 'How does the AI Ebook Generator work?', a: 'Simply enter your topic, select a category and tone, and our AI generates a complete, professional ebook with cover art — ready to download in minutes.' },
    { q: 'Can I customize the generated content?', a: 'Yes! You can edit, refine, and iterate on all generated content. The AI provides a strong foundation that you can make uniquely yours.' },
    { q: 'Is my data secure?', a: 'Absolutely. We use enterprise-grade encryption and security practices. Your content and data are private and protected.' },
    { q: 'What file formats are supported?', a: 'Currently we support PDF export for ebooks. More formats including EPUB, DOCX, and HTML are coming soon.' },
    { q: 'How does the referral program work?', a: 'Share your unique referral link. When someone signs up and subscribes, both you and your referral get benefits.' },
    { q: 'What platforms can I sell on?', a: 'You can sell your products on platforms like Whop, Payhip, Gumroad, and more. We provide direct integration links.' },
    { q: 'How is NexoraOS different from other tools?', a: 'NexoraOS is a complete operating system — not just one tool. It handles creation, monetization, analytics, marketing, and scaling all in one place.' },
    { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. You\'ll retain access until the end of your billing period.' },
    { q: 'Do you offer a free plan?', a: 'Yes! Our free plan includes 1 AI generation per day, Marketing Studio access, Sales Page Builder, and analytics view — no credit card required.' },
  ];

  const pricingData = [
    {
      name: 'Free', price: '0', yearlyPrice: '0',
      desc: 'Explore the platform. Upgrade to export and monetize.',
      features: ['1 AI generation/day', '1 Marketing Studio/day', '1 Sales Page/day', 'Analytics Dashboard (view)', 'Short ebooks only'],
      cta: 'Get Started Free', popular: false, badge: null
    },
    {
      name: 'Creator', price: '19', yearlyPrice: '15',
      desc: 'Everything you need to create and sell digital products.',
      features: ['Full AI Product Generator', 'Marketing Studio (unlimited)', 'Sales Page Builder', 'Analytics Dashboard', 'Downloads & Exports', 'Medium & Long ebooks'],
      cta: 'Start Creator Plan', popular: true, badge: 'Most Popular'
    },
    {
      name: 'Pro', price: '39', yearlyPrice: '31',
      desc: 'Advanced tools for power users and scaling creators.',
      features: ['Everything in Creator', 'AI Business Assistant', 'Priority AI processing', 'Early feature access', 'Advanced automation tools'],
      cta: 'Upgrade to Pro', popular: false, badge: 'Best for Power Users'
    }
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-[#EFF0F4] selection:bg-[#5B4FE8] selection:text-white overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/8 bg-[#080810]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={nexoraLogo} alt="NexoraOS" className="w-8 h-8" />
            <span className="font-bold text-lg font-clash text-white">NexoraOS</span>
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#9EA4C0]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-[#9EA4C0] hover:text-white transition-colors">Sign In</Link>
            <Link to="/dashboard" className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#5B4FE8] text-white hover:bg-[#4F45CC] transition-all shadow-[0_0_20px_rgba(91,79,232,0.3)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-32 pb-24 relative">
        {/* Background orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#5B4FE8]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-[#00FFD1]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6">
          {/* Dashboard preview above headline */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto mb-16"
          >
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-[#5B4FE8]/5">
              <div className="h-8 border-b border-white/5 bg-white/[0.03] flex items-center px-4 gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                <span className="ml-3 text-[10px] text-[#6B7280] font-medium">NexoraOS Dashboard</span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {[{ label: 'Products', val: '24' }, { label: 'Revenue', val: '$4.2K' }, { label: 'Downloads', val: '1,847' }].map((s) => (
                    <div key={s.label} className="bg-white/[0.04] rounded-xl border border-white/5 p-4">
                      <p className="text-[10px] text-[#6B7280] mb-1">{s.label}</p>
                      <p className="text-lg font-bold text-white">{s.val}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white/[0.04] rounded-xl border border-white/5 p-4 h-32">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-[#6B7280]">Revenue Trend</span>
                    <span className="text-xs text-[#00FFD1]">+24%</span>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {[30, 45, 35, 55, 40, 65, 50, 75, 60, 85, 70, 90].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[#5B4FE8] to-[#5B4FE8]/40 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hero text centered */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5B4FE8]/30 bg-[#5B4FE8]/10 text-[#5B4FE8] text-xs font-semibold mb-8">
              <Zap className="w-3.5 h-3.5" />
              AI Product Business Operating System
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 font-clash">
              Your AI Operating System for{' '}
              <span className="text-[#5B4FE8]" style={{ textShadow: '0 0 40px rgba(91,79,232,0.4)' }}>
                Building Digital Businesses
              </span>
            </h1>
            <p className="text-lg text-[#9EA4C0] mb-10 max-w-2xl mx-auto leading-relaxed">
              From idea to income — automate, launch, and scale effortlessly. NexoraOS creates products, monetizes them, and auto-improves — all without manual work.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <Link to="/dashboard" className="px-8 py-3.5 font-semibold rounded-lg bg-[#5B4FE8] text-white hover:bg-[#4F45CC] transition-all shadow-[0_0_30px_rgba(91,79,232,0.4)] flex items-center gap-2 text-base">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works" className="px-8 py-3.5 font-semibold rounded-lg border border-white/10 text-white hover:bg-white/5 transition-all text-base">
                How It Works
              </a>
            </div>
            <p className="text-xs text-[#6B7280]">✓ Free forever · No credit card · Setup in 2 minutes</p>
          </motion.div>
        </div>
      </section>

      {/* ═══ LIVE STATS ═══ */}
      <Section className="py-16 border-y border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Creators', value: 12400, suffix: '+' },
              { label: 'Products Generated', value: 45000, suffix: '+' },
              { label: 'Satisfaction Rate', value: 98, suffix: '%' },
              { label: 'Creator Earnings', value: 2400000, suffix: '+', prefix: '$' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold font-clash text-[#00FFD1]">
                  {stat.prefix}<AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-[#6B7280] mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ TICKER ═══ */}
      <div className="py-6 border-b border-white/8 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap" style={{ animationDuration: '30s' }}>
          {['⚡ AI Product Generator', '📊 Analytics Hub', '🎯 Sales Page Builder', '📣 Marketing Studio', '📚 E-Book Generator', '💰 Monetization Engine', '🔄 Self-Evolving AI', '📥 Downloads & Exports',
            '⚡ AI Product Generator', '📊 Analytics Hub', '🎯 Sales Page Builder', '📣 Marketing Studio', '📚 E-Book Generator', '💰 Monetization Engine', '🔄 Self-Evolving AI', '📥 Downloads & Exports'
          ].map((item, i) => (
            <span key={i} className="mx-8 text-sm text-[#6B7280] font-medium">{item}</span>
          ))}
        </div>
      </div>

      {/* ═══ WHAT IS NEXORAOS ═══ */}
      <Section className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">
              What is <span className="text-[#5B4FE8]">NexoraOS?</span>
            </h2>
            <p className="text-[#9EA4C0] max-w-2xl mx-auto">
              The complete AI-powered operating system that turns a single idea into an entire digital business — from product creation to automated revenue.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'AI-Powered Creation', desc: 'Generate ebooks, courses, SaaS blueprints, and funnels from a single idea.', color: '#00FFD1' },
              { icon: LayoutDashboard, title: 'Full Business OS', desc: 'One platform to create, monetize, track, version, and scale every digital product.', color: '#5B4FE8' },
              { icon: Cpu, title: 'Self-Evolving Intelligence', desc: 'Products learn from feedback, auto-improve across versions, optimize for conversions.', color: '#F59E0B' },
            ].map((card) => (
              <motion.div
                key={card.title}
                whileHover={{ y: -4, borderColor: 'rgba(91,79,232,0.3)' }}
                className="bg-white/[0.04] border border-white/8 rounded-2xl p-8 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}>
                  <card.icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-[#9EA4C0] text-sm leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOUNDER ═══ */}
      <Section className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-[#5B4FE8] uppercase tracking-wider mb-4">Meet the Founder</p>
              <h2 className="text-3xl md:text-4xl font-bold font-clash mb-6">Built by a Creator, for Creators</h2>
              <p className="text-[#9EA4C0] leading-relaxed mb-8">
                NexoraOS was created to eliminate confusion in making money online by combining AI, automation, and monetization into one system. No more juggling 10 different tools — everything lives here.
              </p>
              <blockquote className="border-l-2 border-[#5B4FE8] pl-6 py-2">
                <p className="text-xl font-medium italic text-[#5B4FE8]">
                  "I built the tool I always needed — and now it's yours."
                </p>
              </blockquote>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-8 text-center max-w-sm w-full">
                <div className="w-20 h-20 rounded-2xl bg-[#5B4FE8] flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white font-clash">
                  YM
                </div>
                <h3 className="text-xl font-bold text-[#5B4FE8] mb-1">Yesh Malik</h3>
                <p className="text-[#6B7280] text-sm">Founder, NexoraOS</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ FEATURES GRID ═══ */}
      <Section id="features" className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">
              The Complete <span className="text-[#5B4FE8]">Creator OS</span>
            </h2>
            <p className="text-[#9EA4C0]">Everything you need to create, monetize, and scale AI-powered digital products.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.15)' }}
                className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 transition-all group cursor-default"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ LOGO MARQUEE ═══ */}
      <LogoMarquee
        logos={[
          { id: 'web-design', name: 'Web Design Fast Track', icon: <WebDesignFastTrackIcon /> },
          { id: 'pen-to-profit', name: 'Pen to Profit', icon: <PenToProfitIcon /> },
          { id: 'digital-launchpad', name: 'Digital Launchpad', icon: <DigitalLaunchpadIcon /> },
          { id: 'agency-navigator', name: 'Agency Navigator', icon: <AgencyNavigatorIcon /> },
          { id: 'personal-brand', name: 'Personal Brand Blueprint', icon: <PersonalBrandBlueprintIcon /> },
          { id: 'winning-store', name: 'The Winning Store', icon: <WinningStoreIcon /> },
          { id: 'detox-101', name: 'DETOX 101', icon: <Detox101Icon /> },
        ]}
        speed={40}
      />

      {/* ═══ HOW IT WORKS ═══ */}
      <Section id="how-it-works" className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">How NexoraOS Works</h2>
            <p className="text-[#9EA4C0]">From zero to revenue in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-[#5B4FE8]/0 via-[#5B4FE8] to-[#5B4FE8]/0" />
            {[
              { step: '01', icon: Lightbulb, title: 'Drop Your Idea', desc: 'Enter your topic, niche, or concept. That\'s all you need.' },
              { step: '02', icon: Cpu, title: 'NexoraOS Builds', desc: 'AI generates your product, marketing assets, and sales pages automatically.' },
              { step: '03', icon: TrendingUp, title: 'Revenue Flows In', desc: 'Launch, sell, and scale. Products self-improve based on feedback.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="text-center relative z-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#5B4FE8]/10 border border-[#5B4FE8]/20 flex items-center justify-center mx-auto mb-6">
                  <s.icon className="w-7 h-7 text-[#5B4FE8]" />
                </div>
                <span className="text-xs font-bold text-[#5B4FE8] uppercase tracking-wider">Step {s.step}</span>
                <h3 className="text-xl font-bold mt-2 mb-2">{s.title}</h3>
                <p className="text-[#9EA4C0] text-sm max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ INFRASTRUCTURE ═══ */}
      <Section className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">Built on Powerful Infrastructure</h2>
            <p className="text-[#9EA4C0]">Enterprise-grade systems powering your digital business.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Cpu, title: 'AI Engine', desc: 'Advanced language models for content generation' },
              { icon: Zap, title: 'Automation Core', desc: 'Workflow automation for hands-free operation' },
              { icon: DollarSign, title: 'Monetization System', desc: 'Multi-stream revenue architecture' },
              { icon: Globe, title: 'Cloud Infrastructure', desc: 'Global delivery with 99.9% uptime' },
            ].map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ y: -2 }}
                className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#5B4FE8]/10 border border-[#5B4FE8]/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#5B4FE8]" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-[#6B7280]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PRICING ═══ */}
      <Section id="pricing" className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">
              Simple, Transparent <span className="text-[#5B4FE8]">Pricing</span>
            </h2>
            <p className="text-[#9EA4C0] mb-8">Start free. Upgrade when you're ready to export and grow.</p>
            <div className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/8 rounded-full p-1">
              <button onClick={() => setIsYearly(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-[#5B4FE8] text-white' : 'text-[#6B7280]'}`}>Monthly</button>
              <button onClick={() => setIsYearly(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${isYearly ? 'bg-[#5B4FE8] text-white' : 'text-[#6B7280]'}`}>
                Yearly <span className="text-[#00FFD1] text-xs ml-1">-20%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingData.map((plan) => (
              <motion.div
                key={plan.name}
                whileHover={{ y: -4 }}
                className={`relative bg-white/[0.04] border rounded-2xl p-8 flex flex-col ${plan.popular ? 'border-[#5B4FE8] shadow-[0_0_40px_rgba(91,79,232,0.2)] scale-[1.02]' : 'border-white/8'}`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${plan.popular ? 'bg-[#5B4FE8] text-white' : 'bg-white/10 text-[#9EA4C0]'}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-4xl font-bold">${isYearly ? plan.yearlyPrice : plan.price}</span>
                    <span className="text-[#6B7280] text-sm">/mo</span>
                  </div>
                  <p className="text-sm text-[#6B7280]">{plan.desc}</p>
                </div>
                <div className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2.5 text-sm text-[#9EA4C0]">
                      <Check className="w-4 h-4 text-[#00FFD1] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/dashboard"
                  className={`w-full py-3 rounded-xl font-semibold text-center transition-all block ${plan.popular ? 'bg-[#5B4FE8] text-white hover:bg-[#4F45CC] shadow-[0_0_20px_rgba(91,79,232,0.3)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ TESTIMONIALS ═══ */}
      <Section className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold font-clash text-center mb-12">What Creators Are Saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Alex R.', role: 'Digital Creator', quote: 'Generated my first ebook in under 5 minutes. The quality blew me away — it actually reads like a professionally written book.', stars: 5 },
              { name: 'Sarah K.', role: 'Course Creator', quote: 'Made my first sale within 24 hours of signing up. The marketing studio saved me hours of copywriting work.', stars: 5 },
              { name: 'James M.', role: 'Entrepreneur', quote: 'NexoraOS replaced 4 different tools I was paying for. It\'s genuinely the only platform I need to run my digital business.', stars: 5 },
            ].map((t) => (
              <div key={t.name} className="bg-white/[0.04] border border-white/8 border-t-2 border-t-[#5B4FE8] rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-[#9EA4C0] text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#5B4FE8]/20 flex items-center justify-center text-xs font-bold text-[#5B4FE8]">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-[#6B7280]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ CTA ═══ */}
      <Section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#5B4FE8]/5 via-[#080810] to-[#080810] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#5B4FE8]/10 border border-[#5B4FE8]/20 flex items-center justify-center mx-auto mb-8">
            <Rocket className="w-7 h-7 text-[#5B4FE8]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-clash mb-6">
            Start Building Your{' '}
            <span className="text-[#5B4FE8]">Digital Empire Today</span>
          </h2>
          <p className="text-lg text-[#9EA4C0] mb-10 max-w-2xl mx-auto">
            Create products, explore monetization, and see why NexoraOS is the only platform that turns one idea into an entire business system.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-10 py-4 font-semibold rounded-xl bg-[#5B4FE8] text-white hover:bg-[#4F45CC] transition-all shadow-[0_0_40px_rgba(91,79,232,0.4)] text-lg">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-[#6B7280] mt-6">✓ Free forever · No credit card · 2-minute setup</p>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" className="py-24 border-t border-white/8">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold font-clash text-center mb-12">
            Frequently Asked <span className="text-[#5B4FE8]">Questions</span>
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 border-t border-[#5B4FE8]/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <img src={nexoraLogo} alt="NexoraOS" className="w-7 h-7" />
                <span className="font-bold text-lg font-clash">NexoraOS</span>
              </div>
              <p className="text-xs text-[#6B7280]">The OS the internet runs on.</p>
            </div>
            <div className="flex gap-8 text-sm text-[#6B7280]">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            </div>
            <p className="text-xs text-[#6B7280]">© 2026 NexoraOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
