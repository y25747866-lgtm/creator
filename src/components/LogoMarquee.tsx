import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Logo {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface LogoMarqueeProps {
  logos: Logo[];
  speed?: number; // seconds for full loop
}

const LogoMarquee: React.FC<LogoMarqueeProps> = ({ logos, speed = 40 }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Duplicate logos for seamless loop
  const duplicatedLogos = [...logos, ...logos];

  const marqueeVariants = {
    animate: {
      x: [0, -1000],
      transition: {
        duration: speed,
        repeat: Infinity,
        ease: 'linear',
        paused: isPaused,
      },
    },
  };

  const logoVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.05,
        duration: 0.6,
        ease: 'easeOut',
      },
    }),
    hover: {
      scale: 1.08,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  if (isMobile) {
    return (
      <section className="py-16 border-b border-white/10">
        <div className="container-wide px-6">
          <h2 className="text-3xl font-bold text-center mb-12 font-clash">
            Hundreds of class-leading digital products created with NexoraOS
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {logos.map((logo, i) => (
              <motion.div
                key={logo.id}
                custom={i}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, amount: 0.5 }}
                variants={logoVariants}
                className="flex items-center justify-center p-4 bg-[#0F172A] border border-white/10 rounded-xl hover:border-[#0A26E6]/50 transition-all"
              >
                <div className="text-white/60 hover:text-white transition-colors">
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
    <section className="py-20 border-b border-white/10 overflow-hidden">
      <div className="container-wide px-6 mb-12">
        <h2 className="text-4xl font-bold text-center font-clash">
          Hundreds of class-leading digital products created with NexoraOS
        </h2>
      </div>

      {/* Gradient fade effect container */}
      <div className="relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#05050D] via-[#05050D]/50 to-transparent z-20 pointer-events-none" />
        
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#05050D] via-[#05050D]/50 to-transparent z-20 pointer-events-none" />

        {/* Marquee container */}
        <div
          ref={containerRef}
          className="overflow-hidden py-8"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          role="region"
          aria-label="Partner logos carousel"
        >
          <motion.div
            className="flex gap-12 w-max"
            animate={isPaused ? 'paused' : 'animate'}
            variants={marqueeVariants}
            initial={{ x: 0 }}
          >
            {duplicatedLogos.map((logo, i) => (
              <motion.div
                key={`${logo.id}-${i}`}
                className="flex-shrink-0 flex items-center justify-center"
                onMouseEnter={() => setHoveredId(logo.id)}
                onMouseLeave={() => setHoveredId(null)}
                variants={logoVariants}
                whileHover="hover"
              >
                <div
                  className={`
                    flex items-center justify-center p-6 rounded-xl
                    transition-all duration-300 cursor-pointer
                    ${hoveredId === logo.id
                      ? 'bg-[#0A26E6]/15 border-[#0A26E6]/60 shadow-lg shadow-[#0A26E6]/20'
                      : 'bg-transparent border border-white/10'
                    }
                  `}
                  style={{
                    opacity: hoveredId && hoveredId !== logo.id ? 0.5 : 0.75,
                  }}
                  role="img"
                  aria-label={logo.name}
                >
                  <div className={`
                    text-white transition-all duration-300
                    ${hoveredId === logo.id ? 'text-[#0A26E6] drop-shadow-lg' : 'text-white/60'}
                  `}>
                    {logo.icon}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <p className="text-center text-sm text-[#6B7280] mt-8">
        Join thousands of creators building digital empires with NexoraOS
      </p>
    </section>
  );
};

export default LogoMarquee;
