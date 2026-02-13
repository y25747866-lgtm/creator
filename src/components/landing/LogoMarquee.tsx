import { motion } from "framer-motion";

const LogoWhop = () => (
  <svg viewBox="0 0 120 32" className="h-8 w-auto" fill="currentColor">
    <path d="M8.5 4h5.2l-3.8 24H4.7L0 10.5 4.2 4h5l-4.5 11.5L8.5 4zm14 0h5.2l-3.8 24h-5.2L15 10.5 19.2 4h5l-4.5 11.5L23.5 4v0zm18.5 0l-3.8 24h-5.2l3.8-24h5.2zm10.5 0c5.5 0 8.5 3.5 7.5 10l-2.2 14h-5.2l2.1-13.5c.5-3.2-.8-5-3.5-5s-4.5 1.8-5 5L44 28h-5.2l3.8-24h5.2l-.5 3c1.8-2.2 4.2-3.5 7-3.5v.5zm20 0c5.5 0 8.8 3.5 7.8 10-.2 1.2-.5 2.5-1 3.8H78c-.2 3 1.5 5 4.5 5 2 0 3.8-.8 5.2-2.2l3 3.5c-2.2 2.2-5.2 3.5-8.8 3.5-6 0-9.8-4-8.8-11.5 1-7.5 6.5-12.1 12.5-12.1h.9zm2 5.5c-2.5 0-4.8 1.8-5.5 5h9.5c.3-3.2-1.2-5-4-5z" />
  </svg>
);

const LogoGumroad = () => (
  <svg viewBox="0 0 36 36" className="h-9 w-auto" fill="currentColor">
    <rect width="36" height="36" rx="7" fill="currentColor" opacity="0.15" />
    <path d="M18 8c-5.5 0-10 4.5-10 10s4.5 10 10 10c3.5 0 6.5-1.8 8.2-4.5l-4-2.3c-1 1.5-2.5 2.3-4.2 2.3-3 0-5.5-2.5-5.5-5.5S15 12.5 18 12.5c1.7 0 3.2.8 4.2 2.3l4-2.3C24.5 9.8 21.5 8 18 8z" />
  </svg>
);

const LogoShopify = () => (
  <svg viewBox="0 0 110 40" className="h-9 w-auto" fill="currentColor">
    <path d="M29.7 8.3c0-.2-.2-.3-.3-.3s-2.1-.1-2.1-.1-1.6-1.5-1.8-1.7c-.2-.2-.5-.1-.6-.1l-.9.3c-.5-1.5-1.4-2.9-3-2.9h-.1c-.5-.6-1-.8-1.5-.8C16.3 2.7 15 6.2 14.5 8l-3 .9c-.9.3-1 .3-1.1 1.1l-2.3 17.5L22.4 30l7.5-1.6S29.7 8.5 29.7 8.3zM22 6.9l-1.4.4V6.8c0-.8-.1-1.4-.3-1.9.7.1 1.2.9 1.7 2zm-2.8-1.6c.2.5.3 1.2.3 2.2v.2l-3 .9c.6-2.2 1.6-3.2 2.7-3.3zm-1.2-1c.1 0 .3.1.5.2-1.3.6-2.7 2.2-3.3 5.4l-2.4.7C13.5 8.2 15.2 4.3 18 4.3z" />
    <text x="36" y="28" fontSize="18" fontWeight="600" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">shopify</text>
  </svg>
);

const LogoStripe = () => (
  <svg viewBox="0 0 60 25" className="h-8 w-auto" fill="currentColor">
    <path d="M5 11.2C5 7.4 7.2 5 10.6 5c1.8 0 3.1.5 4.2 1.3l-1.5 2.3c-.7-.5-1.5-.8-2.5-.8-2.2 0-3.5 1.7-3.5 3.4s1.3 3.4 3.5 3.4c1 0 1.8-.3 2.5-.8l1.5 2.3c-1.1.8-2.4 1.3-4.2 1.3C7.2 17.4 5 15 5 11.2zM16 2h2.5v3.4h2.8v2.4h-2.8v4.5c0 1.5.5 2 1.5 2 .5 0 .8-.1 1.2-.2v2.3c-.5.2-1.2.3-2 .3-2.3 0-3.2-1.3-3.2-3.8V7.8h-1.5V5.4H16V2zm8.5 5.4h2.3l.2 1.6c.7-1.1 1.8-1.9 3.2-1.9.3 0 .5 0 .8.1v2.6c-.3-.1-.7-.1-1-.1-1.5 0-2.6.9-3 2.2v5.3h-2.5V7.4zm7 0H34l.2 1.3c.8-1 2-1.6 3.3-1.6 2.5 0 3.8 1.5 3.8 4.2v5.9h-2.5v-5.5c0-1.5-.7-2.4-2-2.4s-2.3.8-2.8 1.8v6.1h-2.5V7.4zm12 0h2.5v9.8h-2.5V7.4zm1.2-4.8c.9 0 1.6.6 1.6 1.4 0 .8-.7 1.4-1.6 1.4-.9 0-1.6-.6-1.6-1.4 0-.8.7-1.4 1.6-1.4zM48 7.1c2.7 0 5 2 5 5.3 0 3.3-2.3 5.3-5 5.3-1.3 0-2.4-.5-3.1-1.3l-.1 4.8h-2.5V7.4h2.3l.2 1.2c.7-.9 1.9-1.5 3.2-1.5zm-.6 8.3c1.5 0 2.8-1.2 2.8-3s-1.3-3-2.8-3c-1 0-1.9.5-2.5 1.3v3.4c.6.8 1.5 1.3 2.5 1.3zM55 14.5c.8.6 1.8 1 3 1 1.2 0 1.8-.5 1.8-1.1 0-.7-.8-1-1.8-1.3-1.5-.4-3.5-.9-3.5-3.1 0-1.8 1.5-3.2 4-3.2 1.5 0 2.8.5 3.7 1.2l-1.2 2c-.7-.5-1.6-.8-2.5-.8s-1.5.4-1.5 1c0 .6.7.9 1.7 1.2 1.5.4 3.6 1 3.6 3.2 0 2-1.5 3.3-4.2 3.3-1.7 0-3.2-.5-4.2-1.4l1.1-2z" />
  </svg>
);

const LogoPayPal = () => (
  <svg viewBox="0 0 100 26" className="h-8 w-auto" fill="currentColor">
    <path d="M12.5 3h7.8c3.5 0 6 2.3 5.5 5.8-.7 4.8-4 7.5-8.2 7.5H15l-1.2 7.7H9.5L12.5 3zm5.5 9.5c2 0 3.5-1.2 3.8-3.3.2-1.5-.7-2.7-2.5-2.7h-2.5l-1.2 6h2.4z" />
    <path d="M31 10.2c2.3 0 4.2 1.5 3.8 4.5-.5 3.5-3 5.5-5.8 5.5-1.2 0-2-.5-2.3-1.2l-.7 4.5h-3.5L24.8 10h3.2l-.2 1.2c.8-.9 1.8-1.4 3.2-1zm-1 7c1.3 0 2.5-1 2.8-2.8.2-1.3-.5-2.2-1.7-2.2-1.3 0-2.5 1-2.8 2.8-.2 1.3.5 2.2 1.7 2.2z" />
    <path d="M39 23.5l1.5-4.2-.2.1-3.8-9.2h3.8l2 5.8 3-5.8H49l-6.5 13.3H39z" />
    <path d="M55.5 3h7.8c3.5 0 6 2.3 5.5 5.8-.7 4.8-4 7.5-8.2 7.5H58l-1.2 7.7h-4.3l3-21zm5.5 9.5c2 0 3.5-1.2 3.8-3.3.2-1.5-.7-2.7-2.5-2.7h-2.5l-1.2 6h2.4z" />
    <path d="M74 10.2c2.3 0 4.2 1.5 3.8 4.5-.5 3.5-3 5.5-5.8 5.5-1.2 0-2-.5-2.3-1.2l-.7 4.5h-3.5L67.8 10H71l-.2 1.2c.8-.9 1.8-1.4 3.2-1zm-1 7c1.3 0 2.5-1 2.8-2.8.2-1.3-.5-2.2-1.7-2.2-1.3 0-2.5 1-2.8 2.8-.2 1.3.5 2.2 1.7 2.2z" />
    <path d="M79 24l2.3-14h3.5l-2.3 14H79zm3-16.5c-.9 0-1.5-.7-1.3-1.5.2-.8 1-1.5 1.9-1.5.9 0 1.5.7 1.3 1.5-.2.8-1 1.5-1.9 1.5z" />
  </svg>
);

const LogoPayhip = () => (
  <svg viewBox="0 0 32 32" className="h-9 w-auto" fill="currentColor">
    <rect width="32" height="32" rx="6" fill="currentColor" opacity="0.15" />
    <path d="M10 8h6c3.3 0 5.5 2.2 5.5 5s-2.2 5-5.5 5h-3v6h-3V8zm3 2.5v5h3c1.5 0 2.5-1 2.5-2.5S17.5 10.5 16 10.5h-3z" />
  </svg>
);

const LogoEtsy = () => (
  <svg viewBox="0 0 80 32" className="h-8 w-auto" fill="currentColor">
    <path d="M15.6 5.8c-.3 0-.5.1-.6.4L12.8 12H6.5V5.8c0-.3.1-.5.3-.5h5.8c1.5 0 2 1.2 2.3 2.5h1V4H6c-.5 0-1 .3-1 .8v22.4c0 .5.5.8 1 .8h9.8v-4h-1c-.3 1.3-.8 2.5-2.3 2.5H7.2c-.3 0-.5-.2-.5-.5V14h6l2.5 6.2c.1.3.3.4.6.4h.7l-4-14.8h2.8V5.8h-.7z" />
    <path d="M25 10.5v1h.5c.2-.6.5-.8.8-.8.2 0 .3 0 .5.2l-.3 1.2c-.1-.1-.3-.1-.4-.1-.5 0-.8.4-1.1 1.2v5.3h-1.2v-7h1.2zm5.5-.3c-2 0-3.2 1.5-3.2 3.8s1.2 3.8 3.2 3.8c1.2 0 2-.5 2.6-1.2l-.7-.8c-.5.5-1 .8-1.7.8-1.2 0-2-.8-2.1-2.3h5v-.5c0-2.2-1.2-3.6-3.1-3.6zm-1.8 3.2c.2-1.3.9-2.1 1.9-2.1s1.7.7 1.8 2.1h-3.7z" />
    <text x="36" y="21" fontSize="14" fontWeight="700" fontFamily="Georgia, serif" fontStyle="italic">sy</text>
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
    className="flex items-center justify-center px-12 shrink-0 cursor-pointer group"
    title={name}
  >
    <div className="text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-foreground group-hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.4)] transition-all duration-300 scale-110">
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
