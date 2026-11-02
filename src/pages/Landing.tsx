import React from "react";

const LandingPage: React.FC = () => {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#0a0a0a", fontFamily: "Inter, sans-serif" }}
    >
      <div
        className="flex flex-col items-center w-full px-6"
        style={{ paddingTop: "40vh" }}
      >
        <div className="flex items-center gap-3 select-none">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M9 5L18 18L9 31" stroke="#00e68e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 5L31 18L22 31" stroke="#00e68e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: "#e8e8e8", fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif" }}>
            NexoraOS
          </span>
        </div>

        <form className="w-full" style={{ maxWidth: "600px", marginTop: "32px" }} onSubmit={(e) => e.preventDefault()}>
          <div className="flex items-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "14px 16px" }}>
            <input
              type="text"
              placeholder="What do you want to build today..."
              className="flex-1 bg-transparent outline-none border-none"
              style={{ color: "#e8e8e8", fontFamily: "Inter, sans-serif", fontSize: "15px", caretColor: "#00e68e" }}
            />
            <button type="submit" aria-label="Send" className="flex items-center justify-center cursor-pointer border-none" style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#00e68e", flexShrink: 0, marginLeft: "12px" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8 12.5V3.5M8 3.5L3.5 8M8 3.5L12.5 8" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>

        <nav className="flex items-center gap-2" style={{ marginTop: "16px", fontFamily: "Inter, sans-serif" }}>
          <a href="/pricing" style={{ color: "#888888", fontSize: "13px", textDecoration: "none" }}>Starter</a>
          <span style={{ color: "#444444", fontSize: "13px" }}>·</span>
          <a href="/pricing" style={{ color: "#888888", fontSize: "13px", textDecoration: "none" }}>Pro</a>
          <span style={{ color: "#444444", fontSize: "13px" }}>·</span>
          <a href="/pricing" style={{ color: "#7928ca", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Hybrid AI OS</a>
        </nav>
      </div>

      <style>{`
        ::selection { background: #00e68e; color: #000000; }
        input::placeholder { color: #444444; font-family: Inter, sans-serif; }
        a:hover { color: #00e68e !important; }
      `}</style>
    </div>
  );
};

export default LandingPage;
