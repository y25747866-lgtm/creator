import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUp, BarChart3, BookOpen, Compass, Layers3, Megaphone, Sparkles } from "lucide-react";
import nexoraLogo from "@/assets/nexora-logo.webp";

const capabilities = [
  { label: "Digital products", icon: Layers3, to: "/dashboard/ebook-generator" },
  { label: "Marketing", icon: Megaphone, to: "/dashboard/marketing-studio" },
  { label: "Sales pages", icon: Sparkles, to: "/dashboard/sales-page-builder" },
  { label: "Analytics", icon: BarChart3, to: "/dashboard/analytics" },
];

const Landing = () => {
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<"starter" | "pro" | "hybrid">("starter");
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (idea.trim()) query.set("idea", idea.trim());
    query.set("mode", mode);
    navigate(`/auth?${query.toString()}`);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0A0A] text-[#F5F5F5] selection:bg-[#00E68E]/30 selection:text-white">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="NexoraOS home">
            <img src={nexoraLogo} alt="" width="30" height="30" className="h-[30px] w-[30px] object-contain" />
            <span className="text-[17px] font-semibold tracking-[-0.04em]">Nexora<span className="text-[#00E68E]">OS</span></span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/pricing" className="text-sm text-[#8A8A8A] transition-colors hover:text-white">Pricing</Link>
            <Link to="/auth" className="rounded-full border border-[#2A2A2A] px-4 py-2 text-sm font-medium transition-colors hover:border-[#00E68E]/60 hover:text-[#00E68E]">
              Sign in <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[min(850px,100svh)] flex-col items-center justify-center px-4 pb-12 pt-28 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[36%] h-[360px] w-[min(700px,100vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00E68E]/[0.035] blur-[100px]" />
        <div className="relative z-[1] mx-auto flex w-full max-w-[780px] flex-col items-center text-center">
          <div className="mb-8 flex items-center gap-2 rounded-full border border-[#202520] bg-[#0D100E] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] text-[#9AADA1]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E68E] shadow-[0_0_10px_#00E68E66]" />
            YOUR AI BUSINESS WORKSPACE
          </div>

          <h1 className="max-w-[720px] text-balance text-[clamp(2.5rem,7vw,4.7rem)] font-semibold leading-[1.04] tracking-[-0.065em]">
            What do you want to
            <span className="mt-1 block text-[#00E68E]">build today?</span>
          </h1>
          <p className="mt-5 max-w-[480px] text-[14px] leading-7 text-[#777D79] sm:text-base">
            Turn your idea into a digital product, then bring it to market — all in one workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 w-full rounded-[22px] border border-[#303530] bg-[#101210] p-2 shadow-[0_20px_80px_rgba(0,0,0,0.28)] transition-colors focus-within:border-[#00E68E]/55 sm:p-3">
            <label htmlFor="nexora-idea" className="sr-only">Describe what you want to build</label>
            <textarea
              id="nexora-idea"
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Describe your idea, product, or business..."
              rows={2}
              className="block max-h-36 min-h-[76px] w-full resize-y bg-transparent px-3 py-3 text-left text-[15px] leading-6 text-white outline-none placeholder:text-[#656B66] sm:px-4"
            />
            <div className="flex items-center justify-between gap-3 border-t border-[#252925] px-1 pt-2.5 sm:px-2">
              <span className="hidden pl-1 text-xs text-[#656B66] sm:inline">Start with an idea. Refine as you go.</span>
              <span className="pl-1 text-[11px] text-[#656B66] sm:hidden">Your next idea starts here</span>
              <button type="submit" aria-label="Continue with your idea" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#00E68E] px-4 text-sm font-semibold text-[#06130C] transition-all hover:bg-[#38F5AA] focus:outline-none focus:ring-2 focus:ring-[#00E68E]/60 focus:ring-offset-2 focus:ring-offset-[#101210]">
                Get started <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {capabilities.map(({ label, icon: Icon, to }) => (
              <Link key={label} to={to} className="group inline-flex items-center gap-2 rounded-full border border-[#242724] bg-[#0C0D0C] px-3.5 py-2.5 text-[12px] text-[#A1A6A2] transition-all hover:border-[#00E68E]/45 hover:bg-[#101612] hover:text-white sm:text-[13px]">
                <Icon className="h-3.5 w-3.5 text-[#00A968] transition-colors group-hover:text-[#00E68E]" />
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#5F655F]">Choose your workspace</span>
            <div className="inline-flex rounded-full border border-[#242724] bg-[#0D0E0D] p-1">
              {([
                { id: "starter", label: "Starter" },
                { id: "pro", label: "Pro" },
                { id: "hybrid", label: "Hybrid AI OS" },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  aria-pressed={mode === item.id}
                  className={`rounded-full px-3.5 py-2 text-[11px] transition-all sm:px-4 sm:text-xs ${mode === item.id ? "bg-[#17231B] text-[#00E68E] shadow-[inset_0_0_0_1px_#254632]" : "text-[#747A75] hover:text-white"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-0 right-0 hidden items-center justify-center gap-3 text-[10px] tracking-[0.12em] text-[#4E544F] sm:flex">
          <span>IDEA</span><span className="h-px w-8 bg-[#252925]" /><span>BUILD</span><span className="h-px w-8 bg-[#252925]" /><span>LAUNCH</span><span className="h-px w-8 bg-[#252925]" /><span>GROW</span>
        </div>
      </section>

      <section className="border-t border-[#1B1E1B] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-medium text-[#B9BEB9]">One idea. One workspace.</p>
            <p className="mt-1 text-xs text-[#626862]">Research, create, launch, and improve at your own pace.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#727872]">
            <Link to="/dashboard/ebook-generator" className="transition-colors hover:text-[#00E68E]">Build</Link>
            <Link to="/dashboard/marketing-studio" className="transition-colors hover:text-[#00E68E]">Market</Link>
            <Link to="/dashboard/sales-page-builder" className="transition-colors hover:text-[#00E68E]">Launch</Link>
            <Link to="/dashboard/analytics" className="transition-colors hover:text-[#00E68E]">Measure</Link>
            <Link to="/contact" className="transition-colors hover:text-[#00E68E]">Contact</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Landing;
