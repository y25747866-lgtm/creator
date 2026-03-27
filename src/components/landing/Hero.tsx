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
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 shimmer"
          style={{ background: 'rgba(91, 79, 232, 0.15)', border: '1px solid rgba(91, 79, 232, 0.3)' }}
        >
          <Sparkles className="w-4 h-4 text-[#5B4FE8]" />
          <span className="text-sm font-medium text-white/80 landing-section">
            AI Product Business Operating System
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 landing-heading"
        >
          <span className="text-white">Turn Ideas Into</span>
          <br />
          <span className="indigo-text-glow" style={{ color: '#5B4FE8' }}>Scalable Digital Businesses</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-8 landing-section"
        >
          NexoraOS is the AI-powered OS that creates products, 
          monetizes them into 8+ revenue streams, and auto-improves — all without manual work.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex items-center justify-center gap-6 mb-10 flex-wrap"
        >
          {pillars.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-white/60 landing-section">
              <p.icon className="w-4 h-4 text-[#00FFD1]" />
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
            <button className="text-base px-8 py-4 rounded-xl font-semibold text-white indigo-glow transition-all hover:scale-105 landing-section" style={{
              background: 'linear-gradient(135deg, #5B4FE8, #7C3AED)',
            }}>
              Start Building Free
              <ArrowRight className="inline ml-2 w-5 h-5" />
            </button>
          </Link>
          <a href="#features">
            <button className="text-base px-8 py-4 rounded-xl font-semibold text-white/80 transition-all hover:text-white landing-section" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              Explore the OS
            </button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-6 text-xs text-white/30 landing-section"
        >
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#00FFD1]" /> Free forever</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#00FFD1]" /> No credit card</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#00FFD1]" /> Setup in 2 minutes</span>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
