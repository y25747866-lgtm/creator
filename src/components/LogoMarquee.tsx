import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Logo {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface LogoMarqueeProps {
  logos: Logo[];
  speed?: number;
}

const LogoMarquee: React.FC<LogoMarqueeProps> = ({ logos, speed = 40 }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Duplicate logos for seamless infinite loop
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  if (isMobile) {
    return (
      <section className="py-16 border-b border-white/10 bg-[#05050D]">
        <div className="container-wide px-6">
          <h2 className="text-xl md:text-2xl font-medium text-center mb-12 font-clash text-[#EFF0F4] opacity-90">
            Hundreds of class-leading digital products created with NexoraOS
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {logos.map((logo, i) => (
              <motion.div
                key={logo.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-center justify-center p-6 bg-[#0F172A]/40 border border-white/5 rounded-xl"
              >
                <div className="text-white/60">
                  {logo.icon}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 border-b border-white/10 bg-[#05050D] overflow-hidden">
      <div className="container-wide px-6 mb-16">
        <h2 className="text-2xl md:text-3xl font-medium text-center font-clash text-[#EFF0F4] opacity-80 tracking-tight">
          Hundreds of class-leading digital products created with NexoraOS
        </h2>
      </div>

      {/* Premium gradient fade container */}
      <div 
        className="relative w-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-[#05050D] via-[#05050D]/80 to-transparent z-20 pointer-events-none" />

        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#05050D] via-[#05050D]/80 to-transparent z-20 pointer-events-none" />

        {/* Marquee container */}
        <div className="flex overflow-hidden group">
          <div 
            className={`flex gap-12 py-4 animate-marquee ${isPaused ? 'pause-animation' : ''}`}
            style={{ animationDuration: `${speed}s` }}
          >
            {duplicatedLogos.map((logo, i) => (
              <div
                key={`${logo.id}-${i}`}
                className="flex-shrink-0 flex items-center justify-center"
              >
                <motion.div
                  whileHover={{ 
                    scale: 1.08,
                    filter: 'drop-shadow(0 0 15px rgba(10, 38, 230, 0.4))'
                  }}
                  className="flex items-center justify-center p-8 rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-500 cursor-pointer group/logo"
                >
                  <div className="text-white/75 group-hover/logo:text-[#0A26E6] transition-colors duration-300">
                    {logo.icon}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle footer text */}
      <div className="mt-16 flex justify-center">
        <div className="px-4 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-[11px] uppercase tracking-[0.2em] text-[#6B7280] font-medium">
          Trusted by 2,500+ Digital Entrepreneurs
        </div>
      </div>
    </section>
  );
};

export default LogoMarquee;
