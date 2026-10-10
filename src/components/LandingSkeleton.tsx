import React from 'react';

/**
 * LandingSkeleton - A ghost/skeleton loading screen that matches the NexoraOS landing page layout
 * Shows placeholder elements while the actual landing page content loads
 */
const LandingSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ═══ NAVBAR SKELETON ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-md animate-pulse" />
            <div className="w-32 h-6 bg-[#1A1A1A] rounded-md animate-pulse" />
          </div>
          
          {/* Nav links (hidden on mobile) */}
          <div className="hidden md:flex gap-8 absolute left-1/2 -translate-x-1/2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-16 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
            ))}
          </div>
          
          {/* Get Started button */}
          <div className="w-24 h-10 bg-[#1A1A1A] rounded-lg animate-pulse" />
        </div>
      </nav>

      {/* ═══ HERO SECTION SKELETON ═══ */}
      <section className="pt-48 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Badge */}
          <div className="flex justify-start mb-8">
            <div className="w-48 h-6 bg-[#1A1A1A] rounded-full animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text content */}
            <div className="text-left">
              {/* Heading lines */}
              <div className="space-y-4 mb-8">
                <div className="w-full h-16 bg-[#1A1A1A] rounded-lg animate-pulse" />
                <div className="w-5/6 h-16 bg-[#1A1A1A] rounded-lg animate-pulse" />
                <div className="w-4/5 h-16 bg-[#1A1A1A] rounded-lg animate-pulse" />
              </div>

              {/* Description paragraph */}
              <div className="space-y-3 mb-10">
                <div className="w-full h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                <div className="w-full h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                <div className="w-3/4 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
              </div>

              {/* CTA Button */}
              <div className="mb-4">
                <div className="w-40 h-12 bg-[#1A1A1A] rounded-lg animate-pulse" />
              </div>

              {/* Subtext */}
              <div className="w-32 h-3 bg-[#1A1A1A] rounded-md animate-pulse" />
            </div>

            {/* Right: Terminal window skeleton */}
            <div className="hidden lg:block">
              <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl max-w-md ml-auto">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1A1A1A]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] animate-pulse" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] animate-pulse" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] animate-pulse" />
                </div>
                
                {/* Terminal content */}
                <div className="p-8 space-y-5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-[#1A1A1A] rounded animate-pulse" />
                      <div className="flex-1 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION SKELETON ═══ */}
      <section className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section label */}
          <div className="mb-4">
            <div className="w-32 h-5 bg-[#1A1A1A] rounded-full animate-pulse" />
          </div>

          {/* Section heading */}
          <div className="mb-16">
            <div className="w-64 h-12 bg-[#1A1A1A] rounded-lg animate-pulse" />
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
            {/* Large card (60%) */}
            <div className="md:col-span-6 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8">
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl mb-6 animate-pulse" />
              <div className="w-32 h-6 bg-[#1A1A1A] rounded-md mb-4 animate-pulse" />
              <div className="space-y-3">
                <div className="w-full h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                <div className="w-full h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                <div className="w-3/4 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
              </div>
            </div>

            {/* Small card (40%) */}
            <div className="md:col-span-4 bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8">
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl mb-6 animate-pulse" />
              <div className="w-24 h-6 bg-[#1A1A1A] rounded-md mb-4 animate-pulse" />
              <div className="space-y-3">
                <div className="w-full h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                <div className="w-5/6 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
              </div>
            </div>
          </div>

          {/* Additional feature cards row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8">
                <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl mb-6 animate-pulse" />
                <div className="w-24 h-6 bg-[#1A1A1A] rounded-md mb-4 animate-pulse" />
                <div className="space-y-3">
                  <div className="w-full h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                  <div className="w-4/5 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING SECTION SKELETON ═══ */}
      <section className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section label */}
          <div className="mb-4">
            <div className="w-24 h-5 bg-[#1A1A1A] rounded-full animate-pulse" />
          </div>

          {/* Section heading */}
          <div className="mb-16">
            <div className="w-56 h-12 bg-[#1A1A1A] rounded-lg animate-pulse" />
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-8">
                <div className="w-20 h-6 bg-[#1A1A1A] rounded-md mb-6 animate-pulse" />
                <div className="w-32 h-10 bg-[#1A1A1A] rounded-lg mb-6 animate-pulse" />
                <div className="space-y-4 mb-8">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-[#1A1A1A] rounded animate-pulse" />
                      <div className="flex-1 h-3 bg-[#1A1A1A] rounded-md animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="w-full h-10 bg-[#1A1A1A] rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ SECTION SKELETON ═══ */}
      <section className="py-32 border-t border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6">
          {/* Section label */}
          <div className="mb-4">
            <div className="w-20 h-5 bg-[#1A1A1A] rounded-full animate-pulse" />
          </div>

          {/* Section heading */}
          <div className="mb-16">
            <div className="w-48 h-12 bg-[#1A1A1A] rounded-lg animate-pulse" />
          </div>

          {/* FAQ items */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-6">
                <div className="w-3/4 h-5 bg-[#1A1A1A] rounded-md mb-4 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-full h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                  <div className="w-5/6 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER SKELETON ═══ */}
      <section className="py-16 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <div className="w-24 h-5 bg-[#1A1A1A] rounded-md animate-pulse" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-20 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-[#1A1A1A]">
            <div className="w-48 h-4 bg-[#1A1A1A] rounded-md animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingSkeleton;
