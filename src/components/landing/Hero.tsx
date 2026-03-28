import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, TrendingUp, RefreshCw, Check } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  const pillars = [
    { icon: Zap, text: "Create Products" },
    { icon: TrendingUp, text: "Monetize Instantly" },
    { icon: RefreshCw, text: "Self-Improve & Scale" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-[120px] pb-[80px]">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8"
          style={{ background: 'rgba(91, 79, 232, 0.15)', border: '1px solid rgba(91, 79, 232, 0.3)' }}
        >
          <Sparkles className="w-4 h-4 text-[#5B4FE8]" />
          <span className="text-sm font-medium text-[var(--text-primary)]/80 landing-section">
            AI Product Business Operating System
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[clamp(42px,8vw,80px)] font-[800] tracking-tight mb-6 landing-heading leading-[1.1]"
        >
          <span className="text-[var(--text-primary)]">Turn Ideas Into</span>
          <br />
          <span className="indigo-text-glow" style={{ color: 'var(--accent)' }}>Scalable Digital Businesses</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[clamp(16px,2vw,20px)] text-[var(--text-muted)] max-w-2xl mx-auto mb-8 landing-section"
        >
          NexoraOS is the AI-powered OS that creates products, 
          monetizes them into 8+ revenue streams, and auto-improves — all without manual work.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex items-center justify-center gap-6 mb-10 flex-wrap max-w-[90vw] mx-auto"
        >
          {pillars.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)] landing-section">
              <p.icon className="w-4 h-4 text-[var(--cyan)]" />
              <span>{p.text}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
        >
          <Link to="/dashboard">
            <button className="text-base px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105 landing-section" style={{
              background: 'var(--accent)',
              boxShadow: '0 0 40px rgba(91, 79, 232, 0.5)',
            }}>
              Start Your Free Trial →
              <ArrowRight className="inline ml-2 w-5 h-5" />
            </button>
          </Link>
          <a href="#features">
            <button className="text-base px-8 py-4 rounded-xl font-semibold text-[var(--text-primary)]/80 transition-all hover:text-[var(--text-primary)] landing-section" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}>
              Explore the OS
            </button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-6 text-xs text-[var(--cyan)] landing-section flex-wrap"
        >
          <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Free forever</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3" /> No credit card</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3" /> 2-minute setup</span>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
