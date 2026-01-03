import Background3D from "@/components/Background3D";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import WhatIsNexora from "@/components/landing/WhatIsNexora";
import Features from "@/components/landing/Features";
import PricingSection from "@/components/landing/PricingSection";
import Founder from "@/components/landing/Founder";
import GetStarted from "@/components/landing/GetStarted";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen">
      <Background3D />
      <Navbar />
      <main className="pt-24">
        <Hero />
        <WhatIsNexora />
        <Features />
        <PricingSection />
        <Founder />
        <GetStarted />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
