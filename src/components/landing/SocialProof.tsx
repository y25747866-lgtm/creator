import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 2400, suffix: "+", label: "Creators Using NexoraOS" },
  { value: 1.2, suffix: "M+", label: "Revenue Generated", prefix: "$" },
  { value: 18000, suffix: "+", label: "Products Created" },
  { value: 4.9, suffix: "★", label: "Average Rating" },
];

const AnimatedNumber = ({ target, prefix, suffix, isDecimal }: { target: number; prefix?: string; suffix: string; isDecimal?: boolean }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  const display = isDecimal ? count.toFixed(1) : Math.floor(count).toLocaleString();

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold landing-heading" style={{ color: '#00FFD1' }}>
        {prefix}{display}{suffix}
      </div>
      <div className="text-sm text-white/40 mt-1 landing-section">{stats.find(s => s.value === target)?.label}</div>
    </div>
  );
};

const SocialProof = () => {
  return (
    <section className="py-16 px-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <AnimatedNumber
            key={stat.label}
            target={stat.value}
            suffix={stat.suffix}
            prefix={stat.prefix}
            isDecimal={stat.value < 10}
          />
        ))}
      </div>
    </section>
  );
};

export default SocialProof;
