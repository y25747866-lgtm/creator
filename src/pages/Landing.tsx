import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const [isYearly, setIsYearly] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Scroll Animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Particles
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: any[] = [];
    let mouse = { x: 0, y: 0 };
    let W: number, H: number;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 60 : 120;

    const getAccentColor = () => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--particle-color').trim() || '#5B4FE8';
    };

    const hexToRgb = (hex: string) => {
      hex = hex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `${r},${g},${b}`;
    };

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.6 + 0.2
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    document.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const color = hexToRgb(getAccentColor());

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        if (mouse.x) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            p.x += dx * 0.03;
            p.y += dy * 0.03;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${p.opacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${color},0.5)`;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${color},${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  // Stat Counter
  useEffect(() => {
    const animateCounter = (el: HTMLElement) => {
      const target = parseInt(el.dataset.target || '0');
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = Math.floor(current).toLocaleString() + suffix;
      }, 16);
    };

    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target as HTMLElement);
          statObserver.unobserve(entry.target);
        }
      });
    });

    document.querySelectorAll('.stat-number').forEach(el => statObserver.observe(el));
    return () => statObserver.disconnect();
  }, []);

  const faqs = [
    { q: "What is NexoraOS?", a: "NexoraOS is an all-in-one digital product operating system designed for creators, founders, and online entrepreneurs. It provides AI-powered tools to create, manage, and scale digital products like ebooks, guides, and more." },
    { q: "How does the AI Ebook Generator work?", a: "Simply enter a topic, and our AI automatically generates a professional title, creates comprehensive content, and designs a stunning cover. The entire ebook is then compiled into a downloadable PDF." },
    { q: "Can I customize the generated content?", a: "Yes! While our AI creates a solid foundation, you maintain full control over the final product. You can review, edit, and enhance any generated content before downloading." },
    { q: "Is my data secure?", a: "Absolutely. We use enterprise-grade security measures to protect your data and content. All generated products are stored securely and accessible only to you." },
    { q: "What platforms can I sell on?", a: "You can sell your products on any platform — Whop, Gumroad, Payhip, Shopify, your own website, and more. NexoraOS generates export-ready assets compatible with all major marketplaces." },
    { q: "How is NexoraOS different?", a: "NexoraOS is a complete operating system, not just a single tool. It combines AI product generation, monetization, analytics, and feedback intelligence into one unified platform." },
    { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time. You'll retain access to your current plan features until the end of your billing period." },
    { q: "Do you offer a free trial?", a: "NexoraOS offers a free plan that lets you generate 1 product per month. It's free forever — no trial, no credit card required." }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-4 md:px-6 flex items-center justify-between bg-[var(--bg-base)]/70 backdrop-blur-2xl border-b border-[var(--border)] z-[1000]">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl font-clash">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L29.8564 10V26L16 34L2.14359 26V10L16 2Z" stroke="var(--cyan)" strokeWidth="2" />
            <circle cx="16" cy="18" r="6" fill="var(--accent)" />
            <circle cx="16" cy="18" r="2" fill="var(--cyan)" />
          </svg>
          <span>NexoraOS</span>
        </Link>
        <div className="hidden md:flex gap-8 text-sm font-medium text-[var(--text-muted)]">
          <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
          <a href="#pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-[var(--text-primary)] transition-colors">FAQ</a>
          <Link to="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-lg"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <Link to="/dashboard" className="btn-primary">Get Started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] bg-[var(--bg-glow)] pointer-events-none z-1" />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-2 pointer-events-none" />
        <div className="relative z-10 text-center max-w-[900px] px-6">
          <div className="animate inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-accent)] bg-[var(--accent)]/10 text-[var(--text-muted)] text-xs font-medium mb-6">
            ⚡ The Operating System for Digital Creators
          </div>
          <h1 className="animate text-[clamp(44px,9vw,88px)] font-extrabold leading-[1.05] tracking-tight mb-6 font-clash">
            Turn Ideas Into<br />
            <span className="gradient-text">Scalable Digital Businesses</span>
          </h1>
          <p className="animate text-[clamp(18px,2.5vw,22px)] text-[var(--text-muted)] max-w-[700px] mx-auto mb-8">
            The world's most powerful AI-driven platform for creating,
            monetizing, and scaling digital products. From idea to revenue in minutes.
          </p>
          <div className="animate flex flex-wrap justify-center gap-3 mb-8">
            {['⚡ Create Products', '↗ Monetize Instantly', '↻ Self-Improve & Scale'].map(pill => (
              <span key={pill} className="px-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)]">
                {pill}
              </span>
            ))}
          </div>
          <div className="animate flex flex-wrap justify-center gap-3 mb-4">
            <Link to="/dashboard" className="btn-primary px-10 py-4 text-lg">Start Building Free →</Link>
            <a href="#features" className="btn-ghost px-10 py-4 text-lg">Explore the Platform</a>
          </div>
          <p className="animate text-xs text-[var(--cyan)] opacity-80 mt-4">✓ Free forever &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ 2-minute setup</p>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y border-[var(--border)] py-3.5 bg-[var(--bg-surface)] relative z-10">
        <div className="ticker-track">
          {[1, 2].map(i => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] shrink-0">
                <span className="text-[var(--accent)]">NEW:</span> AI Ebook Generator 2.0 is live
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] shrink-0">
                <span className="text-[var(--accent)]">JOIN:</span> 12,000+ creators building on Nexora
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] shrink-0">
                <span className="text-[var(--accent)]">EARN:</span> $2.4M+ paid out to creators this month
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] shrink-0">
                <span className="text-[var(--accent)]">SCALE:</span> Automate your entire marketing workflow
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 animate">
          <h2 className="text-[clamp(32px,5vw,56px)] font-extrabold mb-4 font-clash">The Complete <span className="gradient-text">Creator OS</span></h2>
          <p className="text-lg text-[var(--text-muted)] max-w-[600px] mx-auto">Everything you need to build a digital empire, powered by cutting-edge AI.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '📚', title: 'AI Ebook Generator', desc: 'Turn any topic into a 50-page professional ebook in minutes. Complete with titles, chapters, and cover art.' },
            { icon: '💰', title: 'Instant Monetization', desc: 'Connect to Whop, Gumroad, or Payhip instantly. Generate sales pages and marketing copy that converts.' },
            { icon: '📈', title: 'Advanced Analytics', desc: 'Track every sale, click, and conversion. Understand your audience with AI-powered behavioral insights.' },
            { icon: '🤖', title: 'Self-Improving Assets', desc: 'Our AI monitors feedback and automatically suggests updates to your products to keep them top-tier.' }
          ].map((f, i) => (
            <div key={i} className="animate p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2.5 font-clash">{f.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--border)] border-y border-[var(--border)] gap-px">
        {[
          { target: 12400, suffix: '+', label: 'Active Creators' },
          { target: 45000, suffix: '+', label: 'Products Generated' },
          { target: 98, suffix: '%', label: 'Satisfaction Rate' },
          { target: 2400000, suffix: '$', label: 'Creator Earnings' }
        ].map((s, i) => (
          <div key={i} className="bg-[var(--bg-base)] py-10 px-6 text-center">
            <div className="stat-number text-4xl font-extrabold text-[var(--cyan)] font-clash" data-target={s.target} data-suffix={s.suffix}>0</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12 animate">
          <h2 className="text-[clamp(32px,5vw,56px)] font-extrabold mb-4 font-clash">Ready to <span className="gradient-text">Scale?</span></h2>
          <p className="text-lg text-[var(--text-muted)]">Choose the plan that fits your ambition. Switch anytime.</p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-10 animate">
          <span className={`text-sm font-semibold ${!isYearly ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Monthly</span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            className="w-11 h-6 rounded-full bg-[var(--border)] relative transition-colors"
            style={{ backgroundColor: isYearly ? 'var(--accent)' : 'var(--border)' }}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isYearly ? 'translate-x-5' : ''}`} />
          </button>
          <span className={`text-sm font-semibold ${isYearly ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Yearly (Save 20%)</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {[
            { name: 'Free', price: 0, desc: 'Perfect for exploring the power of AI creation.', features: ['1 AI Product / Month', 'Standard Marketing Studio', 'Basic Analytics', 'Community Support'] },
            { name: 'Creator', price: isYearly ? 23 : 29, desc: 'For serious creators building a real business.', popular: true, features: ['10 AI Products / Month', 'Advanced Marketing Suite', 'Full Analytics Dashboard', 'Priority Email Support'] },
            { name: 'Pro', price: isYearly ? 63 : 79, desc: 'The ultimate OS for scaling digital empires.', features: ['Unlimited AI Products', 'Custom Branding & Assets', 'Team Collaboration', '1-on-1 Strategy Calls'] }
          ].map((p, i) => (
            <div key={i} className={`animate p-10 rounded-3xl border ${p.popular ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50 shadow-[0_0_60px_rgba(91,79,232,0.2)] lg:scale-105 z-10' : 'bg-[var(--bg-card)] border-[var(--border)]'} relative`}>
              {p.popular && <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-[var(--accent-glow)]">MOST POPULAR</div>}
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">{p.name}</div>
              <div className="text-5xl font-extrabold mb-2 font-clash flex items-baseline gap-1">
                ${p.price}<span className="text-base font-medium text-[var(--text-muted)]">/mo</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-8">{p.desc}</p>
              <ul className="space-y-3 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/dashboard" className={p.popular ? 'btn-primary w-full' : 'btn-ghost w-full'}>
                {p.name === 'Free' ? 'Get Started' : p.name === 'Creator' ? 'Go Creator →' : 'Go Pro'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="animate grid md:grid-cols-[auto_1fr] gap-12 items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-12">
          <div className="w-28 h-28 rounded-3xl bg-[var(--accent)] flex items-center justify-center text-4xl font-extrabold text-white shadow-[var(--accent-glow)] font-clash">YM</div>
          <div>
            <h3 className="text-2xl font-extrabold mb-1 font-clash">Yesh Malik</h3>
            <p className="text-sm font-semibold text-[var(--accent-light)] mb-4">Founder, NexoraOS</p>
            <p className="text-[var(--text-muted)] leading-relaxed mb-6">
              After years of juggling multiple tools and spending countless hours on repetitive tasks, 
              I built NexoraOS — the unified platform that puts creators first. One system to create, 
              monetize, and scale your entire digital business.
            </p>
            <p className="text-xl italic font-clash border-l-4 border-[var(--accent)] pl-5 leading-relaxed">
              "I built the tool I always needed — and now it's yours."
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 animate">
          <h2 className="text-[clamp(32px,5vw,56px)] font-extrabold mb-4 font-clash">Loved by <span className="gradient-text">Creators</span></h2>
          <p className="text-lg text-[var(--text-muted)]">Join thousands of creators scaling their businesses to 6 and 7 figures.</p>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { initials: 'AK', name: 'Amir Khalid', role: 'Digital Creator · Dubai', quote: "NexoraOS transformed my entire business. I went from struggling to make $500/month to generating $50k+ in just 3 months." },
            { initials: 'SR', name: 'Sofia Reyes', role: 'Online Entrepreneur · Mexico City', quote: "The monetization engine is pure genius. Every product I create automatically generates revenue from 8 different streams." },
            { initials: 'MJ', name: 'Marcus J.', role: 'Content Creator · Atlanta', quote: "I used to spend 100+ hours per product. Now NexoraOS does it in minutes. The ROI is absolutely insane." }
          ].map((t, i) => (
            <div key={i} className="animate p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] border-t-2 border-t-[var(--accent)]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold">{t.initials}</div>
                <div>
                  <h4 className="font-bold">{t.name}</h4>
                  <p className="text-xs text-[var(--text-muted)]">{t.role}</p>
                </div>
              </div>
              <div className="text-amber-500 text-sm mb-4">★★★★★</div>
              <p className="text-sm italic leading-relaxed text-[var(--text-primary)]">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="animate p-16 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-accent)] text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
          <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--accent)]/10 rounded-full blur-[100px] pointer-events-none" />
          <h2 className="text-[clamp(32px,6vw,56px)] font-extrabold mb-6 font-clash leading-tight">Ready to Build Your <span className="gradient-text">Empire?</span></h2>
          <p className="text-lg text-[var(--text-muted)] mb-10 max-w-2xl mx-auto">Join 12,000+ creators who have already made the switch to NexoraOS.</p>
          <Link to="/dashboard" className="btn-primary px-10 py-4 text-lg">Get Started for Free →</Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-16 animate">
          <h2 className="text-[clamp(32px,5vw,56px)] font-extrabold mb-4 font-clash">Common <span className="gradient-text">Questions</span></h2>
          <p className="text-lg text-[var(--text-muted)]">Everything you need to know about NexoraOS.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className={`animate rounded-xl border border-[var(--border)] overflow-hidden transition-all ${openFaq === i ? 'border-[var(--border-accent)] border-l-4 border-l-[var(--accent)] bg-[var(--accent)]/5' : ''}`}>
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 flex items-center justify-between font-semibold text-left"
              >
                {faq.q}
                <span className={`transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
              </button>
              <div className={`transition-all duration-300 overflow-hidden ${openFaq === i ? 'max-h-96 p-5 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-base)] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
            <div>
              <div className="flex items-center gap-2.5 font-bold text-xl mb-6 font-clash">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L29.8564 10V26L16 34L2.14359 26V10L16 2Z" stroke="var(--cyan)" strokeWidth="2" />
                  <circle cx="16" cy="18" r="6" fill="var(--accent)" />
                </svg>
                NexoraOS
              </div>
              <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                The world's most powerful AI-driven platform for creating, monetizing, and scaling digital products.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6">Platform</h4>
              <div className="flex flex-col gap-3 text-sm text-[var(--text-muted)]">
                <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
                <a href="#pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</a>
                <Link to="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                <Link to="/auth" className="hover:text-[var(--text-primary)] transition-colors">Login</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6">Resources</h4>
              <div className="flex flex-col gap-3 text-sm text-[var(--text-muted)]">
                <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Documentation</a>
                <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Creator Blog</a>
                <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Community</a>
                <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Affiliate</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6">Legal</h4>
              <div className="flex flex-col gap-3 text-sm text-[var(--text-muted)]">
                <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-[var(--text-muted)]">
            <p>&copy; 2026 NexoraOS. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Twitter</a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Instagram</a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
