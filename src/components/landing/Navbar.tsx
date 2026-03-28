import { Link } from "react-router-dom";
import { ArrowRight, Moon, Sun, Menu, X } from "lucide-react";
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
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
      <div className="max-w-7xl mx-auto rounded-2xl px-8 py-4" style={{
        backdropFilter: 'blur(20px)',
        background: 'rgba(5, 5, 8, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}>
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/src/assets/nexora-logo.png" alt="NexoraOS Logo" className="w-10 h-10 rounded-xl" />
            <span className="font-[900] text-xl text-white landing-heading hidden sm:inline">NexoraOS</span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors landing-section font-medium">
              Features
            </a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors landing-section font-medium">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-white/60 hover:text-white transition-colors landing-section font-medium">
              FAQ
            </a>
            <Link to="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors landing-section font-medium">
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-white/60 hover:text-white transition-all bg-white/5 border border-white/10 hover:border-indigo-500/30"
            >
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <div className="hidden md:block">
              <Link to="/dashboard">
                <button className="glass-button text-sm px-6 py-2.5 landing-section">
                  Get Started
                  <ArrowRight className="inline ml-2 w-4 h-4" />
                </button>
              </Link>
            </div>

            <button 
              className="md:hidden p-2.5 text-white/60 hover:text-white transition-all"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-6 pt-6 border-t border-white/10 flex flex-col gap-4">
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-sm text-white/60 hover:text-white landing-section font-medium">Features</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-sm text-white/60 hover:text-white landing-section font-medium">Pricing</a>
            <a href="#faq" onClick={() => setIsMenuOpen(false)} className="text-sm text-white/60 hover:text-white landing-section font-medium">FAQ</a>
            <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-sm text-white/60 hover:text-white landing-section font-medium">Dashboard</Link>
            <Link to="/dashboard" className="mt-2">
              <button className="w-full glass-button text-sm py-2.5 landing-section">
                Get Started
              </button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
