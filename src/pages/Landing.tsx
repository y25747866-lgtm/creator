import Background3D from "@/components/Background3D";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import LogoMarquee from "@/components/landing/LogoMarquee";
import WhatIsNexora from "@/components/landing/WhatIsNexora";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import PricingSection from "@/components/landing/PricingSection";
import Founder from "@/components/landing/Founder";
import Testimonials from "@/components/landing/Testimonials";
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
        <LogoMarquee />
        <WhatIsNexora />
        <SocialProof />
        <Features />
        <HowItWorks />
        <PricingSection />
        <Founder />
        <Testimonials />
        <GetStarted />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
