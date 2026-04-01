import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Globe, Layers, BarChart3, 
  Cpu, Zap, TrendingUp, Users, Star, DollarSign,
  Lightbulb, Rocket, ChevronDown, ChevronUp,
  BookOpen, Megaphone, Target, Download, RefreshCw,
  GitBranch, Share2, LayoutDashboard, MessageSquare,
  Quote
} from 'lucide-react';
import nexoraLogo from '@/assets/nexora-logo.png';

/* ─── FAQ Item ─── */
const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-white/8 rounded-2xl overflow-hidden transition-all ${open ? 'border-l-2 border-l-[#5B27BB]' : ''}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-semibold text-[#EFF0F4] pr-4">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-[#5B27BB] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#6B7280] shrink-0" />}
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
      name: 'Free', price: '0',
      desc: 'Explore the platform. Upgrade to export and monetize.',
      features: ['1 AI generation/day', '1 Marketing Studio/day', '1 Sales Page/day', 'Analytics Dashboard (view)', 'Short ebooks only'],
      cta: 'Get Started Free', popular: false, badge: null
    },
    {
      name: 'Creator', price: '19',
      desc: 'Launch your first income system in 7 days.',
      features: ['Full AI Product Generator', 'Marketing Studio (unlimited)', 'Sales Page Builder', 'Analytics Dashboard', 'Downloads & Exports', 'Medium & Long ebooks'],
      cta: 'Start Creator Plan', popular: true, badge: 'Most Popular'
    },
    {
      name: 'Pro', price: '39',
      desc: 'Scale your digital empire with advanced automation.',
      features: ['Everything in Creator', 'AI Business Assistant', 'Priority AI processing', 'Early feature access', 'Advanced automation tools'],
      cta: 'Upgrade to Pro', popular: false, badge: 'Best for Power Users'
    }
  ];

  return (
    <div className="min-h-screen bg-[#04030E] text-[#EFF0F4] selection:bg-[#5B27BB] selection:text-white overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/8 bg-[#04030E]/80 backdrop-blur-xl">
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
            <Link to="/dashboard" className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#5B27BB] text-white hover:bg-[#4F21A1] transition-all shadow-[0_0_20px_rgba(91,39,187,0.3)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-32 pb-24 relative">
        {/* Background orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#5B27BB]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-[#A855E8]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6">
          {/* Dashboard preview above headline */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-[#5B27BB]/5">
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
                <div className="bg-white/[0.04] rounded-xl border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] text-[#6B7280]">Performance Timeline</p>
                    <span className="text-xs text-[#00FFD1]">+24%</span>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {[30, 45, 35, 55, 40, 65, 50, 75, 60, 85, 70, 90].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[#5B27BB] to-[#5B27BB]/40 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero text centered */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5B27BB]/30 bg-[#5B27BB]/10 text-[#5B27BB] text-xs font-semibold mb-8">
              <Zap className="w-3.5 h-3.5" />
              AI Product Business Operating System
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 font-clash">
              Your AI Operating System for{' '}
              <span className="text-[#5B27BB]" style={{ textShadow: '0 0 40px rgba(91,39,187,0.4)' }}>
                Building Digital Businesses
              </span>
            </h1>
            <p className="text-lg text-[#9EA4C0] mb-4 max-w-2xl mx-auto leading-relaxed">
              From idea to income — automate, launch, and scale effortlessly. NexoraOS creates products, monetizes them, and auto-improves — all without manual work.
            </p>
            <p className="text-sm font-medium text-[#5B27BB] mb-10">
              Built by a solo creator. Trusted by early adopters across 30+ countries.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <Link to="/dashboard" className="px-8 py-3.5 font-semibold rounded-lg bg-[#5B27BB] text-white hover:bg-[#4F21A1] transition-all shadow-[0_0_30px_rgba(91,39,187,0.4)] flex items-center gap-2 text-base">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works" className="px-8 py-3.5 font-semibold rounded-lg border border-white/10 text-white hover:bg-white/5 transition-all text-base">
                How It Works
              </a>
            </div>
            <p className="text-xs text-[#6B7280]">✓ Free forever · No credit card · Setup in 2 minutes</p>
          </div>
        </div>
      </section>

      {/* ═══ WHAT IS NEXORAOS ═══ */}
      <Section className="py-24 border-y border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">
              What is <span className="text-[#5B27BB]">NexoraOS?</span>
            </h2>
            <p className="text-[#9EA4C0] max-w-2xl mx-auto">
              The complete AI-powered operating system that turns a single idea into an entire digital business — from product creation to automated revenue.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'AI-Powered Creation', desc: 'Generate ebooks, courses, SaaS blueprints, and funnels from a single idea.', color: '#00FFD1' },
              { icon: LayoutDashboard, title: 'Full Business OS', desc: 'One platform to create, monetize, track, version, and scale every digital product.', color: '#5B27BB' },
              { icon: Cpu, title: 'Self-Evolving Intelligence', desc: 'Products learn from feedback, auto-improve across versions, optimize for conversions.', color: '#F59E0B' },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white/[0.04] border border-white/8 rounded-2xl p-8 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}>
                  <card.icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-[#9EA4C0] text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOUNDER ═══ */}
      <Section className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-[#5B27BB] uppercase tracking-wider mb-4">Meet the Founder</p>
              <h2 className="text-3xl md:text-4xl font-bold font-clash mb-6">Built by Yesh Malik</h2>
              <div className="space-y-4 text-[#9EA4C0] leading-relaxed mb-8">
                <p>
                  NexoraOS was born out of a simple frustration: the digital product landscape is too fragmented. I spent years juggling 10 different tools just to launch a single ebook.
                </p>
                <p>
                  My mission is to empower creators to build real, sustainable income without the technical overwhelm. NexoraOS isn't just a tool; it's a category-defining platform designed to handle the heavy lifting so you can focus on your vision.
                </p>
                <p>
                  We're building a future where anyone with an idea can turn it into a powerful, self-improving business system in minutes.
                </p>
              </div>
              <blockquote className="border-l-2 border-[#5B27BB] pl-6 py-2">
                <p className="text-xl font-medium italic text-[#5B27BB]">
                  "I built the tool I always needed — and now it's yours."
                </p>
              </blockquote>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-8 text-center max-w-sm w-full">
                <div className="w-20 h-20 rounded-2xl bg-[#5B27BB] flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white font-clash">
                  YM
                </div>
                <h3 className="text-xl font-bold text-[#5B27BB] mb-1">Yesh Malik</h3>
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
              The Complete <span className="text-[#5B27BB]">Creator OS</span>
            </h2>
            <p className="text-[#9EA4C0]">Everything you need to create, monetize, and scale AI-powered digital products.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 transition-all group cursor-default"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ HOW IT WORKS ═══ */}
      <Section id="how-it-works" className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">How NexoraOS Works</h2>
            <p className="text-[#9EA4C0]">From zero to revenue in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-[#5B27BB]/0 via-[#5B27BB] to-[#5B27BB]/0" />
            {[
              { step: '01', icon: Lightbulb, title: 'Drop Your Idea', desc: 'Enter your topic, niche, or concept. That\'s all you need.' },
              { step: '02', icon: Cpu, title: 'NexoraOS Builds', desc: 'AI generates your product, marketing assets, and sales pages automatically.' },
              { step: '03', icon: TrendingUp, title: 'Revenue Flows In', desc: 'Launch, sell, and scale. Products self-improve based on feedback.' },
            ].map((s, i) => (
              <div
                key={s.step}
                className="text-center relative z-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#5B27BB]/10 border border-[#5B27BB]/20 flex items-center justify-center mx-auto mb-6">
                  <s.icon className="w-7 h-7 text-[#5B27BB]" />
                </div>
                <span className="text-xs font-bold text-[#5B27BB] uppercase tracking-wider">Step {s.step}</span>
                <h3 className="text-xl font-bold mt-2 mb-2">{s.title}</h3>
                <p className="text-[#9EA4C0] text-sm max-w-xs mx-auto">{s.desc}</p>
              </div>
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
              <div
                key={item.title}
                className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#5B27BB]/10 border border-[#5B27BB]/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#5B27BB]" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-[#6B7280]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PRICING ═══ */}
      <Section id="pricing" className="py-24 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-clash mb-4">
              Simple, Transparent <span className="text-[#5B27BB]">Pricing</span>
            </h2>
            <p className="text-[#9EA4C0] mb-8">Start free. Upgrade when you're ready to export and grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingData.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white/[0.04] border rounded-2xl p-8 flex flex-col ${plan.popular ? 'border-[#5B27BB] shadow-[0_0_40px_rgba(91,39,187,0.2)] scale-[1.02]' : 'border-white/8'}`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${plan.popular ? 'bg-[#5B27BB] text-white' : 'bg-white/10 text-[#9EA4C0]'}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-4xl font-bold">${plan.price}</span>
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
                  className={`w-full py-3 rounded-xl font-semibold text-center transition-all block ${plan.popular ? 'bg-[#5B27BB] text-white hover:bg-[#4F21A1] shadow-[0_0_20px_rgba(91,39,187,0.3)]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ TESTIMONIALS (EDITORIAL QUOTE) ═══ */}
      <Section className="py-24 border-b border-white/8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Quote className="w-12 h-12 text-[#5B27BB]/20 mx-auto mb-8" />
          <h2 className="text-3xl md:text-5xl font-bold font-clash leading-tight mb-8">
            "I went from idea to live product in under 48 hours."
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5B27BB]/20 flex items-center justify-center text-xs font-bold text-[#5B27BB]">
              EB
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Early Beta User</p>
              <p className="text-xs text-[#6B7280]">NexoraOS</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ CTA ═══ */}
      <Section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#5B27BB]/5 via-[#04030E] to-[#04030E] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#5B27BB]/10 border border-[#5B27BB]/20 flex items-center justify-center mx-auto mb-8">
            <Rocket className="w-7 h-7 text-[#5B27BB]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-clash mb-6">
            Stop overthinking. <span className="text-[#5B27BB]">Start building.</span>
          </h2>
          <p className="text-lg text-[#9EA4C0] mb-10 max-w-2xl mx-auto leading-relaxed">
            Create products, explore monetization, and see why NexoraOS is the only platform that turns one idea into an entire business system.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-10 py-4 font-semibold rounded-xl bg-[#5B27BB] text-white hover:bg-[#4F21A1] transition-all shadow-[0_0_40px_rgba(91,39,187,0.4)] text-lg">
            Get Started with NexoraOS <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-[#6B7280] mt-6">✓ Free forever · No credit card · 2-minute setup</p>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" className="py-24 border-t border-white/8">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold font-clash text-center mb-12">
            Frequently Asked <span className="text-[#5B27BB]">Questions</span>
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 border-t border-[#5B27BB]/20">
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
