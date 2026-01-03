import { motion } from "framer-motion";

const Background3D = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary gradient mesh */}
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-30 dark:opacity-20 blur-[100px] animate-float-slow"
        style={{
          background: "radial-gradient(circle, hsl(243 75% 59% / 0.4) 0%, transparent 70%)",
        }}
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Secondary gradient mesh */}
      <motion.div
        className="absolute top-[30%] right-[-20%] w-[50vw] h-[50vw] rounded-full opacity-25 dark:opacity-15 blur-[80px] animate-float"
        style={{
          background: "radial-gradient(circle, hsl(262 83% 58% / 0.5) 0%, transparent 70%)",
        }}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 0.9, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Tertiary accent */}
      <motion.div
        className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full opacity-20 dark:opacity-10 blur-[100px] animate-float-slower"
        style={{
          background: "radial-gradient(circle, hsl(220 80% 50% / 0.4) 0%, transparent 70%)",
        }}
        initial={{ scale: 0.9 }}
        animate={{ scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default Background3D;
