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
    <section className="relative min-h-screen flex items-center justify-center px-6 py-[140px] pb-[100px] overflow-hidden">
      {/* Gradient Orbs Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-10 border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm"
        >
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-semibold text-white/90 landing-section">
            The Operating System for Digital Creators
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-[clamp(48px,10vw,96px)] font-[900] tracking-tighter mb-8 landing-heading leading-[1.05]"
        >
          <span className="text-gradient">Turn Ideas Into</span>
          <br />
          <span className="accent-gradient">Billion-Dollar Businesses</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-[clamp(18px,2.5vw,24px)] text-white/70 max-w-3xl mx-auto mb-12 landing-section leading-relaxed"
        >
          The world's most powerful AI-driven platform for creating, monetizing, and scaling digital products. From idea to revenue in minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex items-center justify-center gap-8 mb-14 flex-wrap max-w-[90vw] mx-auto"
        >
          {pillars.map((p, i) => (
            <div key={i} className="flex items-center gap-3 text-base text-white/60 landing-section font-medium">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <p.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <span>{p.text}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12"
        >
          <Link to="/dashboard">
            <button className="glass-button text-lg px-10 py-5 landing-section">
              Start Building Free
              <ArrowRight className="inline ml-3 w-6 h-6" />
            </button>
          </Link>
          <a href="#features">
            <button className="px-10 py-5 rounded-2xl text-lg font-bold text-white/90 transition-all hover:text-white landing-section border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-indigo-500/5" style={{
              backdropFilter: 'blur(12px)',
            }}>
              Explore the Platform
            </button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex items-center justify-center gap-8 text-sm font-semibold text-white/60 landing-section flex-wrap"
        >
          <span className="flex items-center gap-2"><Check className="w-5 h-5 text-cyan-400" /> Free forever</span>
          <span className="flex items-center gap-2"><Check className="w-5 h-5 text-cyan-400" /> No credit card</span>
          <span className="flex items-center gap-2"><Check className="w-5 h-5 text-cyan-400" /> 2-minute setup</span>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
