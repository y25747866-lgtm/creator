import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-6xl mx-auto rounded-2xl px-6 py-3" style={{
        backdropFilter: 'blur(20px)',
        background: 'rgba(8, 8, 16, 0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00FFD1]/20 flex items-center justify-center">
              <span className="text-[#00FFD1] font-bold text-sm landing-heading">N</span>
            </div>
            <span className="font-bold text-lg text-white landing-heading">NexoraOS</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors landing-section">
              Features
            </a>
            <a href="#pricing" className="text-sm text-white/50 hover:text-white transition-colors landing-section">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-white/50 hover:text-white transition-colors landing-section">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <button className="px-5 py-2 rounded-xl text-sm font-semibold text-white landing-section indigo-glow-sm transition-all hover:scale-105" style={{
                background: 'linear-gradient(135deg, #5B4FE8, #7C3AED)',
              }}>
                Dashboard
                <ArrowRight className="inline ml-1.5 w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
