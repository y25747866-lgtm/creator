import { Link } from "react-router-dom";

const Blog = () => (
  <main className="min-h-screen bg-[#0A0A0A] px-6 py-20 text-white">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-[#00E68E]">NexoraOS</Link>
      <p className="mt-16 text-xs font-semibold uppercase tracking-[0.2em] text-[#00E68E]">NexoraOS Blog</p>
      <h1 className="mt-4 text-5xl font-bold leading-tight">AI digital product generator resources</h1>
      <p className="mt-6 text-lg leading-8 text-[#A1A1A1]">
        Practical guides for creators using an AI digital product generator to turn ideas into digital products, launch sales pages, and build sustainable online income.
      </p>
      <section className="mt-10 rounded-2xl border border-white/10 p-6" aria-labelledby="coming-soon">
        <h2 id="coming-soon" className="text-2xl font-semibold">Coming soon</h2>
        <p className="mt-3 leading-7 text-[#A1A1A1]">
          We are preparing guides on product ideation, AI-assisted creation, digital product packaging, and selling on platforms you already use.
        </p>
      </section>
    </div>
  </main>
);

export default Blog;
