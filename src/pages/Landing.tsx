import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { 
  ArrowRight, Check, Sparkles, Globe, Layers, BarChart3, 
  Cpu, Zap, TrendingUp, Users, Star, DollarSign,
  Lightbulb, Rocket, ChevronDown, ChevronUp,
  BookOpen, Megaphone, Target, Download, RefreshCw,
  GitBranch, Share2, LayoutDashboard, MessageSquare,
  Quote, MousePointer2, CreditCard, Layout
} from 'lucide-react';
import nexoraLogo from '@/assets/nexora-logo.png';
import { PlasmaWeb } from '@/components/PlasmaWeb';

/* ─── FAQ Item ─── */
const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-white/8 rounded-2xl overflow-hidden transition-all ${open ? 'border-l-2 border-l-[#7C3AED]' : ''}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-semibold text-[#EFF0F4] pr-4">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-[#7C3AED] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#6B7280] shrink-0" />}
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
  const outcomes = [
    { icon: Sparkles, title: 'Create a digital product in minutes', desc: 'Go from a blank page to a professional ebook, course, or guide using our streamlined AI workflow.' },
    { icon: Globe, title: 'Launch a website instantly', desc: 'Get a high-converting landing page for your product without touching a single line of code.' },
    { icon: DollarSign, title: 'Start earning with built-in monetization', desc: 'Connect your payment provider and start selling your digital assets to a global audience immediately.' },
  ];

  const systemItems = [
    { icon: Lightbulb, title: 'Creation', benefit: 'Turn any idea into a structured digital product.' },
    { icon: Zap, title: 'Automation', benefit: 'Automate your marketing and sales assets.' },
    { icon: CreditCard, title: 'Monetization', benefit: 'Built-in checkout and revenue tracking.' },
    { icon: Layout, title: 'Management', benefit: 'Control all your products from one dashboard.' },
    { icon: TrendingUp, title: 'Scaling', benefit: 'Optimize conversions with real-time data.' },
    { icon: Share2, title: 'Distribution', benefit: 'Export and sell on any platform you choose.' },
  ];

  const pricingData = [
    {
      name: 'Free', price: '0',
      desc: 'Perfect for exploring the workflow.',
      features: ['1 AI generation/day', 'Basic Sales Page Builder', 'Standard Analytics', 'Short-form exports'],
      cta: 'Get Started Free', popular: false, badge: null
    },
    {
      name: 'Creator', price: '19',
      desc: 'Launch your first income system.',
      features: ['Unlimited AI Generations', 'Premium Sales Page Builder', 'Advanced Analytics', 'Full-length exports', 'Built-in Monetization'],
      cta: 'Start Creator Plan', popular: true, badge: 'Most Popular'
    },
    {
      name: 'Pro', price: '39',
      desc: 'Scale without extra tools.',
      features: ['Everything in Creator', 'AI Business Assistant', 'Priority Processing', 'Custom Domain Support', 'Advanced Automation'],
      cta: 'Upgrade to Pro', popular: false, badge: 'Best for Scaling'
    }
  ];

  const faqs = [
    { q: 'What is NexoraOS?', a: 'NexoraOS is an all-in-one platform for digital entrepreneurs. It automates the process of creating, launching, and monetizing digital products.' },
    { q: 'How does the product creation work?', a: 'You provide the topic or idea, and our system generates the content, structure, and marketing assets for you to review and launch.' },
    { q: 'Can I sell on other platforms?', a: 'Yes! While we have built-in monetization, you can export your products in multiple formats to sell on Whop, Gumroad, or your own site.' },
    { q: 'Is there a limit to what I can build?', a: 'The Free plan has daily limits, but our Creator and Pro plans offer unlimited generations to help you scale your business.' },
  ];

  return (
    <div className="min-h-screen bg-[#04030E] text-[#EFF0F4] selection:bg-[#7C3AED] selection:text-white overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/8 bg-[#04030E]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={nexoraLogo} alt="NexoraOS" className="w-8 h-8" />
            <span className="font-bold text-lg font-clash text-white">NexoraOS</span>
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#9EA4C0]">
            <a href="#outcomes" className="hover:text-white transition-colors">Outcomes</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-40 pb-24 relative overflow-hidden bg-gradient-to-br from-[#0a0520] via-[#04030E] to-[#1a0a3e]">
        <div className="absolute inset-0 -z-10">
          <PlasmaWeb
            hueShift={270}
            density={0.6}
            glowIntensity={0.8}
            saturation={0.5}
            brightness={0.4}
            energyFlow={0.6}
            pulseIntensity={0.1}
            attractionStrength={1.2}
            mouseAttraction={true}
            transparent={false}
            speed={0.3}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0520]/50 via-transparent to-[#1a0a3e] -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >

            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-8 font-clash max-w-5xl mx-auto">
              Turn your idea into a product, website, and income system — <span className="text-[#7C3AED]">automatically.</span>
            </h1>
            <p className="text-xl text-[#9EA4C0] mb-12 max-w-2xl mx-auto leading-relaxed">
              NexoraOS builds, launches, and monetizes your digital business in one place. No more juggling tools. Just results.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-20">
              <Link to="/dashboard" className="px-10 py-4 font-semibold rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-all shadow-[0_0_30px_rgba(124,58,237,0.4)] flex items-center gap-2 text-lg">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          {/* Real Product UI Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="max-w-5xl mx-auto relative"
          >
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-4 backdrop-blur-sm shadow-2xl">
              <div className="bg-[#04030E] rounded-2xl border border-white/5 overflow-hidden aspect-[16/9] flex flex-col">
                <div className="h-10 border-b border-white/5 bg-white/[0.03] flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                  <div className="mx-auto bg-white/5 px-3 py-1 rounded text-[10px] text-[#6B7280]">nexoraos.com/dashboard</div>
                </div>
                <div className="flex-1 p-8 flex gap-8">
                  <div className="w-48 space-y-4">
                    <div className="h-8 bg-white/5 rounded-lg w-full" />
                    <div className="h-8 bg-[#7C3AED]/20 rounded-lg w-full border border-[#7C3AED]/30" />
                    <div className="h-8 bg-white/5 rounded-lg w-full" />
                    <div className="h-8 bg-white/5 rounded-lg w-full" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="h-6 bg-white/10 rounded w-32" />
                      <div className="h-10 bg-[#7C3AED] rounded-lg w-32" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
                      <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
                      <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
                    </div>
                    <div className="h-48 bg-white/5 rounded-xl border border-white/5 w-full" />
                  </div>
                </div>
              </div>
            </div>
            {/* Floating elements for depth */}
            <div className="absolute -top-6 -right-6 bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xl animate-bounce">
              Product Generated! ⚡
            </div>
            <div className="absolute -bottom-6 -left-6 bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xl">
              Sale: $49.00 💰
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ OUTCOMES SECTION ═══ */}
      <Section id="outcomes" className="py-32 border-y border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-clash mb-6">What You Can Do With NexoraOS</h2>
            <p className="text-[#9EA4C0] max-w-2xl mx-auto text-lg">Focus on your vision while we handle the technical execution.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {outcomes.map((item, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/8 rounded-3xl p-10 hover:border-[#7C3AED]/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <item.icon className="w-7 h-7 text-[#7C3AED]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-[#9EA4C0] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ SIMPLIFIED SYSTEM ═══ */}
      <Section className="py-32 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-clash mb-6">A Simplified System</h2>
            <p className="text-[#9EA4C0] max-w-2xl mx-auto text-lg">Everything you need, nothing you don't.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemItems.map((item, i) => (
              <div key={i} className="flex items-start gap-6 p-8 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-[#7C3AED]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">{item.title}</h4>
                  <p className="text-sm text-[#6B7280]">{item.benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FOUNDER STORY ═══ */}
      <Section className="py-32 border-b border-white/8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#7C3AED] to-[#C084FC] flex items-center justify-center text-6xl font-bold text-white font-clash shadow-2xl">
                YM
              </div>
              <div className="absolute -bottom-6 -right-6 bg-[#04030E] border border-white/10 p-6 rounded-2xl shadow-xl">
                <p className="text-sm font-bold">Yesh Malik</p>
                <p className="text-xs text-[#6B7280]">Founder, NexoraOS</p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold font-clash mb-8">Why I Built NexoraOS</h2>
              <div className="space-y-6 text-[#9EA4C0] text-lg leading-relaxed">
                <p>
                  I spent years trying to launch digital products, but I always got stuck. I was juggling 10 different tools just to sell a single ebook. It was slow, confusing, and expensive.
                </p>
                <p>
                  I realized that most creators aren't held back by their ideas—they're held back by the technical friction of building.
                </p>
                <p>
                  I built NexoraOS to automate that friction away. My mission is to give every creator a powerful, all-in-one system that turns an idea into income in minutes, not months.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ PRICING ═══ */}
      <Section id="pricing" className="py-32 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-clash mb-6">Simple Pricing</h2>
            <p className="text-[#9EA4C0] max-w-2xl mx-auto text-lg">Focus on your growth, not your subscription costs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingData.map((plan, i) => (
              <div
                key={i}
                className={`relative bg-white/[0.03] border rounded-3xl p-10 flex flex-col ${plan.popular ? 'border-[#7C3AED] shadow-[0_0_40px_rgba(124,58,237,0.15)] scale-[1.05] z-10' : 'border-white/8'}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#7C3AED] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    <span className="text-[#6B7280] text-lg">/mo</span>
                  </div>
                  <p className="text-[#9EA4C0]">{plan.desc}</p>
                </div>
                <div className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-3 text-[#9EA4C0]">
                      <Check className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/dashboard"
                  className={`w-full py-4 rounded-xl font-bold text-center transition-all block ${plan.popular ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ FINAL CTA ═══ */}
      <Section className="py-40 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#7C3AED]/5 via-[#04030E] to-[#04030E] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold font-clash mb-8">
            Build your first income system today.
          </h2>
          <p className="text-xl text-[#9EA4C0] mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the creators who are building real businesses with NexoraOS. No credit card required to start.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-3 px-12 py-5 font-bold rounded-2xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-all shadow-[0_0_50px_rgba(124,58,237,0.5)] text-xl">
            Get Started with NexoraOS <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </Section>

      {/* ═══ FAQ ═══ */}
      <Section id="faq" className="py-32 border-t border-white/8">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold font-clash text-center mb-16">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <img src={nexoraLogo} alt="NexoraOS" className="w-8 h-8" />
                <span className="font-bold text-xl font-clash">NexoraOS</span>
              </div>
              <p className="text-sm text-[#6B7280]">The operating system for digital entrepreneurs.</p>
            </div>
            <div className="flex gap-10 text-sm text-[#6B7280]">
              <a href="#outcomes" className="hover:text-white transition-colors">Outcomes</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            </div>
            <p className="text-sm text-[#6B7280]">© 2026 NexoraOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
