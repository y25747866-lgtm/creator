import { motion } from "framer-motion";
import { BookOpen, Zap, BarChart3, Rocket, Mail, Target, TrendingUp, Brain, type LucideIcon } from "lucide-react";

const features = [
  { name: "E-Book Generator", Icon: BookOpen },
  { name: "Monetization Engine", Icon: Zap },
  { name: "Performance Analytics", Icon: BarChart3 },
  { name: "Course Builder", Icon: Rocket },
  { name: "Email Sequences", Icon: Mail },
  { name: "Lead Magnets", Icon: Target },
  { name: "Growth Tracking", Icon: TrendingUp },
  { name: "AI Brain", Icon: Brain },
];

const FeatureItem = ({ Icon, name }: { Icon: LucideIcon; name: string }) => (
  <div className="flex items-center gap-3 px-8 shrink-0 cursor-default group">
    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 border border-primary/20 group-hover:border-primary/40 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300">
      <Icon size={24} className="text-primary group-hover:text-accent transition-colors duration-300" />
    </div>
    <span className="text-sm font-semibold tracking-wide text-muted-foreground group-hover:text-foreground transition-colors duration-300 whitespace-nowrap">
      {name}
    </span>
  </div>
);

const LogoMarquee = () => {
  const duration = 25;

  return (
    <section className="relative py-14 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-10 font-medium">
        Everything you need to build, launch & scale
      </p>

      <div className="flex">
        <motion.div
          className="flex shrink-0"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
          {[...features, ...features].map((f, i) => (
            <FeatureItem key={i} name={f.name} Icon={f.Icon} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LogoMarquee;
