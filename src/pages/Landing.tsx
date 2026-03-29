import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Check, 
  Zap, 
  Globe, 
  Shield, 
  BarChart3, 
  Cpu, 
  CreditCard,
  Layers,
  Sparkles,
  MousePointer2,
  Rocket
} from 'lucide-react';
import LogoMarquee from '@/components/LogoMarquee';
import {
  PersonalBrandBlueprintIcon,
  WinningStoreIcon,
  DetoxIcon,
  SixFigureIcon,
  CreatorHubIcon,
  ScaleUpIcon,
  LaunchPadIcon,
  GrowthLabIcon
} from '@/components/LogoIcons';

const Landing = () => {
  const [isYearly, setIsYearly] = useState(false);

  const pricingData = [
    {
      name: "Free",
      price: "0",
      description: "Perfect for exploring the platform.",
      features: [
        "1 AI generation/day",
        "1 Marketing Studio/day",
        "1 Sales Page/day",
        "Analytics view",
        "No exports",
        "No AI Assistant"
      ],
      buttonText: "Get Started",
      popular: false
    },
    {
      name: "Creator",
      price: "19",
      description: "The most popular choice for serious creators.",
      features: [
        "Full AI Product Generator",
        "Marketing Studio",
        "Sales Page Builder",
        "Analytics",
        "Downloads & Exports"
      ],
      buttonText: "Start Creator Plan",
      popular: true
    },
    {
      name: "Pro",
      price: "39",
      description: "Best for power users and scaling teams.",
      features: [
        "Everything in Creator",
        "AI Business Assistant",
        "Priority AI processing",
        "Early feature access",
        "Advanced automation"
      ],
      buttonText: "Upgrade to Pro",
      popular: false
    }
  ];

  const features = [
    {
      title: "AI Product Generator",
      description: "Transform your ideas into full-scale digital products including ebooks, guides, and courses in minutes.",
      icon: <Sparkles className="w-5 h-5" />
    },
    {
      title: "Marketing Studio",
      description: "Automate your entire marketing workflow with AI-generated copy, social posts, and email sequences.",
      icon: <Globe className="w-5 h-5" />
    },
    {
      title: "Sales Page Builder",
      description: "Create high-converting landing pages that are optimized for conversions without touching a single line of code.",
      icon: <Layers className="w-5 h-5" />
    },
    {
      title: "Analytics Dashboard",
      description: "Get real-time insights into your product performance, sales trends, and customer behavior.",
      icon: <BarChart3 className="w-5 h-5" />
    }
  ];

  const steps = [
    { id: "01", title: "Idea", description: "Define your niche and product concept." },
    { id: "02", title: "Build", description: "AI generates your content and assets." },
    { id: "03", title: "Automate", description: "Set up your marketing and sales funnel." },
    { id: "04", title: "Earn", description: "Launch and start scaling your revenue." }
  ];

  return (
    <div className="min-h-screen bg-[#05050D] text-[#EFF0F4] selection:bg-[#0A26E6] selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#05050D]/80 backdrop-blur-md">
        <div className="container-wide h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl font-clash">
            <div className="w-8 h-8 bg-[#0A26E6] rounded flex items-center justify-center">
              <span className="text-white text-xs">N</span>
            </div>
            <span>NexoraOS</span>
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#9EA4C0]">
            <a href="#product" className="hover:text-white transition-colors">Product</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm font-medium text-[#9EA4C0] hover:text-white">Login</Link>
            <Link to="/dashboard" className="btn-primary py-2 px-5 text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 border-b border-white/10">
        <div className="container-wide px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[#6B7280] text-xs font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-[#0A26E6] animate-pulse"></span>
                Now available for all creators
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 font-clash">
                Your AI Operating System for Building Digital Businesses
              </h1>
              <p className="text-xl text-[#9EA4C0] mb-10 max-w-xl">
                NexoraOS helps you create, automate, and scale digital products from one platform.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/dashboard" className="btn-primary px-8 py-4 text-lg">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#product" className="btn-outline px-8 py-4 text-lg">
                  How it works
                </a>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="h-8 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="h-20 bg-white/5 rounded-lg border border-white/5 p-3">
                      <div className="w-8 h-2 bg-white/10 rounded mb-2"></div>
                      <div className="w-12 h-4 bg-white/20 rounded"></div>
                    </div>
                    <div className="h-20 bg-white/5 rounded-lg border border-white/5 p-3">
                      <div className="w-8 h-2 bg-white/10 rounded mb-2"></div>
                      <div className="w-12 h-4 bg-white/20 rounded"></div>
                    </div>
                    <div className="h-20 bg-white/5 rounded-lg border border-white/5 p-3">
                      <div className="w-8 h-2 bg-white/10 rounded mb-2"></div>
                      <div className="w-12 h-4 bg-white/20 rounded"></div>
                    </div>
                  </div>
                  <div className="h-48 bg-white/5 rounded-lg border border-white/5 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="w-24 h-3 bg-white/10 rounded"></div>
                      <div className="w-12 h-3 bg-white/10 rounded"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 bg-white/5 rounded w-full"></div>
                      <div className="h-2 bg-white/5 rounded w-4/5"></div>
                      <div className="h-2 bg-white/5 rounded w-5/6"></div>
                      <div className="h-2 bg-white/5 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section id="product" className="py-24 border-b border-white/10">
        <div className="container-wide px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[#0A26E6]/20 border border-[#0A26E6]/30 flex items-center justify-center text-[#0A26E6]">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">AI Processing</h3>
                    <p className="text-sm text-[#9EA4C0]">Real-time generation active</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[#6B7280]">Ebook Content</span>
                      <span className="text-[#0A26E6]">85%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0A26E6] w-[85%]"></div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[#6B7280]">Marketing Copy</span>
                      <span className="text-[#0A26E6]">60%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0A26E6] w-[60%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-bold mb-6 font-clash">Built for the next generation of digital entrepreneurs</h2>
              <p className="text-lg text-[#9EA4C0] mb-8">
                NexoraOS isn't just a tool; it's a complete ecosystem. We've removed the technical barriers so you can focus on what matters most: your vision and your customers.
              </p>
              <ul className="space-y-4">
                {[
                  "Automated product creation from single prompts",
                  "Integrated payment and monetization tools",
                  "Data-driven insights to optimize your growth",
                  "Enterprise-grade security for your digital assets"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#9EA4C0]">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0A26E6]/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#0A26E6]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 border-b border-white/10">
        <div className="container-wide px-6">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4 font-clash">Platform Features</h2>
            <p className="text-[#9EA4C0]">Everything you need to build a digital empire.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1px bg-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {features.map((feature, i) => (
              <div key={i} className="bg-[#0F172A] p-10 hover:bg-[#141d33] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#0A26E6]/10 border border-[#0A26E6]/20 flex items-center justify-center text-[#0A26E6] mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[#9EA4C0] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 border-b border-white/10">
        <div className="container-wide px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 font-clash">Simple Workflow</h2>
            <p className="text-[#9EA4C0]">From zero to revenue in four simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-bold text-white/5 mb-4 font-clash">{step.id}</div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-[#9EA4C0] text-sm">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 -right-4 text-white/10">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logo Marquee Section */}
      <LogoMarquee
        logos={[
          { id: 'personal-brand', name: 'Personal Brand Blueprint', icon: <PersonalBrandBlueprintIcon className="w-8 h-8" /> },
          { id: 'winning-store', name: 'The Winning Store', icon: <WinningStoreIcon className="w-8 h-8" /> },
          { id: 'detox', name: 'DETOX1/1', icon: <DetoxIcon className="w-8 h-8" /> },
          { id: 'six-figure', name: 'Six Figure Sales Rep', icon: <SixFigureIcon className="w-8 h-8" /> },
          { id: 'creator-hub', name: 'Creator Hub', icon: <CreatorHubIcon className="w-8 h-8" /> },
          { id: 'scale-up', name: 'Scale Up Academy', icon: <ScaleUpIcon className="w-8 h-8" /> },
          { id: 'launch-pad', name: 'Launch Pad Pro', icon: <LaunchPadIcon className="w-8 h-8" /> },
          { id: 'growth-lab', name: 'Growth Lab', icon: <GrowthLabIcon className="w-8 h-8" /> },
        ]}
        speed={40}
      />

      {/* Pricing Section */}
      <section id="pricing" className="py-24 border-b border-white/10">
        <div className="container-wide px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 font-clash">Simple, Transparent Pricing</h2>
            <p className="text-[#9EA4C0]">Choose the plan that fits your stage of growth.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingData.map((plan, i) => (
              <div 
                key={i} 
                className={`relative bg-[#0F172A] border ${plan.popular ? 'border-[#0A26E6] scale-105 z-10' : 'border-white/10'} rounded-2xl p-8 flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A26E6] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-[#6B7280]">/mo</span>
                  </div>
                  <p className="text-sm text-[#9EA4C0]">{plan.description}</p>
                </div>
                <div className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3 text-sm text-[#9EA4C0]">
                      <Check className="w-4 h-4 text-[#0A26E6] mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Link 
                  to="/dashboard" 
                  className={`w-full py-3 rounded-lg font-bold text-center transition-all ${plan.popular ? 'bg-[#0A26E6] text-white hover:bg-[#081eb8]' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32">
        <div className="container-wide px-6 text-center">
          <h2 className="text-5xl font-bold mb-8 font-clash">Start Building with NexoraOS</h2>
          <p className="text-xl text-[#9EA4C0] mb-12 max-w-2xl mx-auto">
            Join thousands of creators who are building the future of digital business. No credit card required to start.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/dashboard" className="btn-primary px-10 py-4 text-lg">
              Get Started for Free
            </Link>
            <Link to="/auth" className="btn-outline px-10 py-4 text-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="container-wide px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-lg font-clash">
            <div className="w-6 h-6 bg-[#0A26E6] rounded flex items-center justify-center">
              <span className="text-white text-[10px]">N</span>
            </div>
            <span>NexoraOS</span>
          </div>
          <div className="flex gap-8 text-sm text-[#6B7280]">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
          <div className="text-sm text-[#6B7280]">
            © 2026 NexoraOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
