import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "What is NexoraOS?",
      answer: "NexoraOS is an all-in-one digital product operating system designed for creators, founders, and online entrepreneurs. It provides AI-powered tools to create, manage, and scale digital products like ebooks, guides, and more.",
    },
    {
      question: "How does the AI Ebook Generator work?",
      answer: "Simply enter a topic, and our AI automatically generates a professional title, creates comprehensive content, and designs a stunning cover. The entire ebook is then compiled into a downloadable PDF with table of contents, page numbers, and professional formatting.",
    },
    {
      question: "Can I customize the generated content?",
      answer: "Yes! While our AI creates a solid foundation, you maintain full control over the final product. You can review, edit, and enhance any generated content before downloading.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade security measures to protect your data and content. All generated products are stored securely and accessible only to you.",
    },
    {
      question: "What file formats are supported?",
      answer: "Currently, we support PDF format for ebooks, which is the industry standard for digital publications. Cover images can be downloaded separately as high-resolution images.",
    },
    {
      question: "How does the referral program work?",
      answer: "Share your unique referral links with your network. When someone signs up through your link, you earn rewards. Check the referral links in your dashboard sidebar to get started.",
    },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about NexoraOS.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-panel rounded-xl px-6 border-0"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
