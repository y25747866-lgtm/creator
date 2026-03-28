import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Menu } from "lucide-react";
import { useEffect, useState } from "react";

const Navbar = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-6xl mx-auto rounded-2xl px-6 py-3" style={{
        backdropFilter: 'blur(20px)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}>
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/src/assets/nexora-logo.png" alt="NexoraOS Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-[var(--text-primary)] landing-heading">NexoraOS</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">
              Features
            </a>
            <a href="#pricing" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">
              FAQ
            </a>
            <Link to="/dashboard" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors landing-section">
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
            >
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <div className="hidden md:block">
              <Link to="/dashboard">
                <button className="px-5 py-2 rounded-xl text-sm font-semibold text-white landing-section transition-all hover:scale-105" style={{
                  background: 'var(--accent)',
                  boxShadow: '0 0 20px var(--accent-glow)',
                }}>
                  Get Started
                  <ArrowRight className="inline ml-1.5 w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            <button 
              className="md:hidden p-2 text-[var(--text-muted)]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-[var(--border)] flex flex-col gap-4">
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-sm text-[var(--text-muted)]">Features</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-sm text-[var(--text-muted)]">Pricing</a>
            <a href="#faq" onClick={() => setIsMenuOpen(false)} className="text-sm text-[var(--text-muted)]">FAQ</a>
            <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-sm text-[var(--text-muted)]">Dashboard</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
