import { Instagram } from "lucide-react";

// X (formerly Twitter) logo component
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="py-12 px-4 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="font-bold text-xl">NexoraOS</span>
          </div>

          {/* Start your digital business section */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Start your digital business today</p>
            <div className="flex items-center gap-4 justify-center">
              <a
                href="https://whop.com/?a=zm1a"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Whop →
              </a>
              <a
                href="https://payhip.com?fp_ref=yesh-malik48"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Payhip →
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-primary/10 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-primary/10 transition-colors"
              aria-label="X (formerly Twitter)"
            >
              <XLogo className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NexoraOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
