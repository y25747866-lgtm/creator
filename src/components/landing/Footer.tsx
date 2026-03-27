import { Instagram } from "lucide-react";

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="py-12 px-4" style={{ borderTop: '1px solid rgba(91, 79, 232, 0.15)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#00FFD1]/20 flex items-center justify-center">
                <span className="text-[#00FFD1] font-bold text-sm landing-heading">N</span>
              </div>
              <span className="font-bold text-lg text-white landing-heading">NexoraOS</span>
            </div>
            <p className="text-xs text-white/30 landing-section">The OS the internet runs on.</p>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/40 landing-section">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="#" className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }} aria-label="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }} aria-label="X">
              <XLogo className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-xs text-white/20 landing-section">
            © {new Date().getFullYear()} NexoraOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
