import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const faqs = [
    { question: "What is NexoraOS?", answer: "NexoraOS is an all-in-one digital product operating system designed for creators, founders, and online entrepreneurs. It provides AI-powered tools to create, manage, and scale digital products like ebooks, guides, and more." },
    { question: "How does the AI Ebook Generator work?", answer: "Simply enter a topic, and our AI automatically generates a professional title, creates comprehensive content, and designs a stunning cover. The entire ebook is then compiled into a downloadable PDF with table of contents, page numbers, and professional formatting." },
    { question: "Can I customize the generated content?", answer: "Yes! While our AI creates a solid foundation, you maintain full control over the final product. You can review, edit, and enhance any generated content before downloading." },
    { question: "Is my data secure?", answer: "Absolutely. We use enterprise-grade security measures to protect your data and content. All generated products are stored securely and accessible only to you." },
    { question: "What file formats are supported?", answer: "Currently, we support PDF format for ebooks, which is the industry standard for digital publications. Cover images can be downloaded separately as high-resolution images." },
    { question: "How does the referral program work?", answer: "Share your unique referral links with your network. When someone signs up through your link, you earn rewards. Check the referral links in your dashboard sidebar to get started." },
    { question: "What platforms can I sell on?", answer: "You can sell your products on any platform — Whop, Gumroad, Payhip, Shopify, your own website, and more. NexoraOS generates export-ready assets compatible with all major marketplaces." },
    { question: "How is NexoraOS different from other tools?", answer: "NexoraOS is a complete operating system, not just a single tool. It combines AI product generation, monetization, analytics, versioning, and feedback intelligence into one unified platform that self-improves over time." },
    { question: "Can I cancel anytime?", answer: "Yes, you can cancel your subscription at any time. You'll retain access to your current plan features until the end of your billing period." },
    { question: "Do you offer a free trial?", answer: "NexoraOS offers a free plan that lets you generate 1 product per day, use the marketing studio, and build sales pages. It's free forever — no trial, no credit card required." },
  ];

  return (
    <section id="faq" ref={ref} className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 landing-heading">
            <span className="text-white">Frequently Asked </span>
            <span style={{ color: '#5B4FE8' }}>Questions</span>
          </h2>
          <p className="text-lg text-white/50 landing-section">
            Everything you need to know about NexoraOS.
          </p>
        </div>

        <div className={`transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="rounded-xl px-6 border-0 data-[state=open]:border-l-2 data-[state=open]:border-l-[#5B4FE8] transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <AccordionTrigger className="text-left hover:no-underline py-5 text-white/90 landing-section">
                  <span className="font-medium text-sm">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-white/40 pb-5 text-sm landing-section">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
