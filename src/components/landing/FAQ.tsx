import { useEffect, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

const FAQ = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    const animatedElements = sectionRef.current?.querySelectorAll('.animate-up');
    animatedElements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="faq" ref={sectionRef} className="py-[100px] px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16 animate-up">
          <h2 className="text-[clamp(32px,5vw,56px)] font-bold mb-4 landing-heading text-[var(--text-primary)]">
            Frequently Asked <span style={{ color: 'var(--accent)' }}>Questions</span>
          </h2>
          <p className="text-[clamp(16px,2vw,20px)] text-[var(--text-muted)] max-w-2xl mx-auto landing-section">
            Everything you need to know about NexoraOS.
          </p>
        </div>

        <div className="animate-up">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-[var(--border)] rounded-xl px-6 bg-[var(--bg-card)] transition-all data-[state=open]:border-[var(--accent)] data-[state=open]:border-l-[3px] data-[state=open]:bg-[rgba(91,79,232,0.06)]"
              >
                <AccordionTrigger className="text-[var(--text-primary)] font-semibold hover:no-underline py-6 text-left landing-heading">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[var(--text-muted)] pb-6 landing-section leading-relaxed">
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
