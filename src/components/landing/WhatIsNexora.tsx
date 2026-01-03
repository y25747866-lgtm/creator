import { motion } from "framer-motion";
import { Zap, Layers, Shield } from "lucide-react";

const WhatIsNexora = () => {
  const points = [
    {
      icon: Zap,
      title: "AI-Powered Creation",
      description: "Generate professional ebooks, guides, and digital products in minutes using advanced AI.",
    },
    {
      icon: Layers,
      title: "Unified Platform",
      description: "One dashboard to create, manage, and distribute all your digital products seamlessly.",
    },
    {
      icon: Shield,
      title: "Enterprise Ready",
      description: "Built for scale with secure infrastructure and professional-grade features.",
    },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            What is <span className="gradient-text">NexoraOS</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            NexoraOS is a complete digital product operating system designed for the modern creator economy. 
            Build, launch, and scale your digital empire from a single, powerful platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {points.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-panel rounded-2xl p-8 hover-lift"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                <point.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{point.title}</h3>
              <p className="text-muted-foreground">{point.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatIsNexora;
