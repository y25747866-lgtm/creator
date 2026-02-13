import { motion } from "framer-motion";

const logos = [
  { name: "Whop", svg: "M3 12l4-8 4 8 4-8 4 8" },
  { name: "Gumroad", svg: null },
  { name: "Shopify", svg: null },
  { name: "Stripe", svg: null },
  { name: "PayPal", svg: null },
  { name: "Payhip", svg: null },
  { name: "Etsy", svg: null },
];

const LogoItem = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center px-10 opacity-40 hover:opacity-70 transition-opacity duration-300 shrink-0">
    <span className="text-xl md:text-2xl font-bold tracking-wider text-foreground/60 select-none whitespace-nowrap">
      {name}
    </span>
  </div>
);

const LogoMarquee = () => {
  const duration = 30;

  return (
    <section className="relative py-12 overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8 font-medium">
        Trusted by creators selling on
      </p>

      <div className="flex">
        <motion.div
          className="flex shrink-0"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
          {/* Duplicate logos for seamless loop */}
          {[...logos, ...logos].map((logo, i) => (
            <LogoItem key={i} name={logo.name} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LogoMarquee;
