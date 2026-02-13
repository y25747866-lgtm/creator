import { motion } from "framer-motion";

const LogoWhop = () => (
  <svg viewBox="0 0 120 40" className="h-[50px] w-auto" fill="currentColor">
    <text x="10" y="30" fontSize="28" fontWeight="800" fontFamily="system-ui, sans-serif" letterSpacing="-1">whop</text>
  </svg>
);

const LogoGumroad = () => (
  <svg viewBox="0 0 140 40" className="h-[50px] w-auto" fill="currentColor">
    <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M20 10 C28 10 30 18 24 22 L28 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const LogoShopify = () => (
  <svg viewBox="0 0 40 46" className="h-[50px] w-auto" fill="currentColor">
    <path d="M33.5 8.5c-.1-.5-.5-.8-1-.8s-1.1-.1-1.1-.1-.8-.8-.9-.9c-.1-.1-.2-.1-.3-.1l-1.3 28.3 9.8-2.1S34.6 9 33.5 8.5zM23.4 14.7l-.5 1.6s-1.5-.7-3.3-.6c-2.7.2-2.7 1.9-2.7 2.3.1 2.5 6.7 3 7 8.8.3 4.5-2.4 7.6-6.2 7.8-4.6.3-7.1-2.4-7.1-2.4l1-4.2s2.6 1.9 4.6 1.8c1.3-.1 1.8-1.2 1.8-1.9-.2-3.3-5.5-3.1-5.8-8.3-.2-4.4 2.6-8.8 9-9.2 2.4-.2 3.7.4 3.7.4l-1.5 5.9zM24.2 3.5l-2.3.7V2.1c0-.7-.1-1.2-.3-1.6.7.1 1.3.6 1.7 1.2.2.3.5.9.9 1.8z" />
  </svg>
);

const LogoStripe = () => (
  <svg viewBox="0 0 120 40" className="h-[50px] w-auto" fill="currentColor">
    <path d="M13 20c0-3.2 1.5-5.8 4.4-5.8 1.5 0 2.6.6 3.5 1.5l2.4-3c-1.5-1.5-3.5-2.5-6-2.5-5.6 0-9.3 4.2-9.3 9.8s3.7 9.8 9.3 9.8c2.5 0 4.5-1 6-2.5l-2.4-3c-.9.9-2 1.5-3.5 1.5C14.5 25.8 13 23.2 13 20z" />
    <text x="35" y="28" fontSize="22" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">stripe</text>
  </svg>
);

const LogoPayPal = () => (
  <svg viewBox="0 0 48 48" className="h-[50px] w-auto" fill="currentColor">
    <path d="M37.4 13.8c.8-5.2-3.5-8.8-9.6-8.8H15.3c-.9 0-1.6.6-1.8 1.5L9 35.7c-.1.5.3 1 .8 1h6.5l1.6-10.5-.1.3c.2-.9.9-1.5 1.8-1.5h3.7c7.2 0 12.8-2.9 14.5-11.4.1-.3.1-.5.1-.8.5.3.5.3 0 0z" opacity="0.7" />
    <path d="M19.5 13.8c.1-.4.3-.7.6-.9.2-.1.4-.2.6-.2h8.8c1 0 2 .1 2.9.2.3.1.5.1.7.2.2.1.5.2.7.3.1 0 .2.1.3.1.8-5.2-3.5-8.5-9.6-8.5H12.1c-.9 0-1.6.6-1.8 1.5L5.8 35.7c-.1.5.3 1 .8 1h6.5l1.6-10.5 4.8-12.4z" />
  </svg>
);

const LogoPayhip = () => (
  <svg viewBox="0 0 40 40" className="h-[50px] w-auto" fill="currentColor">
    <rect x="4" y="4" width="32" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <text x="11" y="28" fontSize="22" fontWeight="800" fontFamily="system-ui, sans-serif">P</text>
  </svg>
);

const LogoEtsy = () => (
  <svg viewBox="0 0 100 40" className="h-[50px] w-auto" fill="currentColor">
    <text x="5" y="32" fontSize="32" fontWeight="800" fontFamily="Georgia, serif" fontStyle="italic" letterSpacing="-1">Etsy</text>
  </svg>
);

const logos = [
  { name: "Whop", Logo: LogoWhop },
  { name: "Gumroad", Logo: LogoGumroad },
  { name: "Shopify", Logo: LogoShopify },
  { name: "Stripe", Logo: LogoStripe },
  { name: "PayPal", Logo: LogoPayPal },
  { name: "Payhip", Logo: LogoPayhip },
  { name: "Etsy", Logo: LogoEtsy },
];

const LogoItem = ({ Logo, name }: { Logo: React.FC; name: string }) => (
  <div
    className="flex items-center justify-center px-10 opacity-30 hover:opacity-60 transition-all duration-300 shrink-0 cursor-pointer group"
    title={name}
  >
    <div className="text-foreground/50 group-hover:text-foreground/70 group-hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)] transition-all duration-300">
      <Logo />
    </div>
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
            <LogoItem key={i} name={logo.name} Logo={logo.Logo} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LogoMarquee;
