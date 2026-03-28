import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="py-[80px] px-6 border-t border-white/10 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-16">
          {/* Left: Logo + Tagline */}
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <img src="/src/assets/nexora-logo.png" alt="NexoraOS Logo" className="w-10 h-10 rounded-xl" />
              <span className="font-[900] text-xl text-white landing-heading">NexoraOS</span>
            </Link>
            <p className="text-white/60 text-base landing-section leading-relaxed">
              The operating system for building billion-dollar digital businesses. From idea to revenue in minutes.
            </p>
          </div>

          {/* Center: Links */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap gap-12">
              <a href="#features" className="text-base text-white/70 hover:text-white transition-colors landing-section font-medium">Features</a>
              <a href="#pricing" className="text-base text-white/70 hover:text-white transition-colors landing-section font-medium">Pricing</a>
              <a href="#faq" className="text-base text-white/70 hover:text-white transition-colors landing-section font-medium">FAQ</a>
              <Link to="/dashboard" className="text-base text-white/70 hover:text-white transition-colors landing-section font-medium">Dashboard</Link>
            </div>
            <div className="flex flex-wrap gap-12">
              <Link to="/privacy" className="text-base text-white/70 hover:text-white transition-colors landing-section font-medium">Privacy Policy</Link>
              <Link to="/terms" className="text-base text-white/70 hover:text-white transition-colors landing-section font-medium">Terms of Service</Link>
              <Link to="/contact" className="text-base text-white/70 hover:text-white transition-colors landing-section font-medium">Contact</Link>
            </div>
          </div>

          {/* Right: Socials */}
          <div className="flex gap-6">
            <a href="#" className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
              <Instagram className="w-6 h-6" />
            </a>
            <a href="#" className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
              <XLogo className="w-6 h-6" />
            </a>
          </div>
        </div>

        <div className="pt-12 border-t border-white/10 text-center">
          <p className="text-white/50 text-sm landing-section">
            © {new Date().getFullYear()} NexoraOS. All rights reserved. Built for creators, by creators.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
