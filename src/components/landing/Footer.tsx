import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="py-[60px] px-6 pb-[40px] border-t border-[var(--border)]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          {/* Left: Logo + Tagline */}
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/src/assets/nexora-logo.png" alt="NexoraOS Logo" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-lg text-[var(--text-primary)] landing-heading">NexoraOS</span>
            </Link>
            <p className="text-[var(--text-muted)] text-sm landing-section">
              "The OS the internet runs on."
            </p>
          </div>

          {/* Center: Links */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-8">
              <a href="#features" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">Features</a>
              <a href="#pricing" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">Pricing</a>
              <a href="#faq" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">FAQ</a>
              <Link to="/dashboard" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">Dashboard</Link>
            </div>
            <div className="flex flex-wrap gap-8">
              <Link to="/privacy" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">Terms of Service</Link>
              <Link to="/contact" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">Contact</Link>
            </div>
          </div>

          {/* Right: Socials */}
          <div className="flex gap-4">
            <a href="#" className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all hover:shadow-[0_0_20px_rgba(91,79,232,0.2)]">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all hover:shadow-[0_0_20px_rgba(91,79,232,0.2)]">
              <XLogo className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--border)] text-center">
          <p className="text-[var(--text-muted)] text-xs landing-section">
            © {new Date().getFullYear()} NexoraOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
