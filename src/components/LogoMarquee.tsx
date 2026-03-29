import React, { useState, useRef, useEffect } from 'react';
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Duplicate logos for seamless infinite loop
  const duplicatedLogos = [...logos, ...logos, ...logos];

  if (isMobile) {
    return (
      <section className="py-16 border-b border-white/10 bg-[#05050D]">
        <div className="container-wide px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-clash text-[#EFF0F4]">
            Hundreds of class-leading digital products created with NexoraOS
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {logos.map((logo, i) => (
              <motion.div
                key={logo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="flex items-center justify-center p-4 bg-[#0F172A]/50 border border-white/8 rounded-lg hover:border-[#0A26E6]/50 hover:bg-[#0A26E6]/10 transition-all"
              >
                <div className="text-white/70 hover:text-white transition-colors">
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
    <section className="py-20 border-b border-white/10 bg-[#05050D] overflow-hidden">
      <div className="container-wide px-6 mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center font-clash text-[#EFF0F4]">
          Hundreds of class-leading digital products created with NexoraOS
        </h2>
      </div>

      {/* Premium gradient fade container */}
      <div className="relative w-full">
        {/* Left fade gradient - premium cinematic effect */}
        <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-[#05050D] via-[#05050D]/80 to-transparent z-30 pointer-events-none" />

        {/* Right fade gradient - premium cinematic effect */}
        <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#05050D] via-[#05050D]/80 to-transparent z-30 pointer-events-none" />

        {/* Marquee container */}
        <div
          ref={containerRef}
          className="overflow-hidden py-8"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setHoveredId(null) || setIsPaused(false)}
          role="region"
          aria-label="Partner logos carousel"
        >
          <motion.div
            className="flex gap-16 w-max"
            animate={isPaused ? { x: 0 } : { x: -1000 }}
            transition={{
              duration: speed,
              repeat: Infinity,
              ease: 'linear',
            }}
            onMouseLeave={() => setIsPaused(false)}
          >
            {duplicatedLogos.map((logo, i) => (
              <motion.div
                key={`${logo.id}-${i}`}
                className="flex-shrink-0 flex items-center justify-center"
                onMouseEnter={() => {
                  setIsPaused(true);
                  setHoveredId(logo.id);
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  setIsPaused(false);
                }}
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`
                    flex items-center justify-center p-6 rounded-xl
                    transition-all duration-300 cursor-pointer
                    ${
                      hoveredId === logo.id
                        ? 'bg-[#0A26E6]/20 border-[#0A26E6]/60 shadow-lg shadow-[#0A26E6]/30'
                        : 'bg-transparent border border-white/12'
                    }
                  `}
                  style={{
                    opacity: hoveredId && hoveredId !== logo.id ? 0.4 : 0.75,
                  }}
                  role="img"
                  aria-label={logo.name}
                >
                  <div
                    className={`
                      text-white transition-all duration-300
                      ${hoveredId === logo.id ? 'text-[#0A26E6] drop-shadow-lg' : 'text-white/70'}
                    `}
                  >
                    {logo.icon}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Subtle footer text */}
      <p className="text-center text-xs md:text-sm text-[#6B7280] mt-10">
        Join thousands of creators building digital empires with NexoraOS
      </p>
    </section>
  );
};

export default LogoMarquee;
