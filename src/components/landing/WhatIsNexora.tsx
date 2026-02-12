import { motion } from "framer-motion";
import { Zap, Layers, Shield } from "lucide-react";

const WhatIsNexora = () => {
  const points = [
    {
      icon: Zap,
      title: "AI-Powered Product Creation",
      description: "Generate ebooks, courses, SaaS blueprints, funnels, and more from a single idea using advanced AI.",
    },
    {
      icon: Layers,
      title: "Full Business OS",
      description: "One platform to create, monetize, track, version, and scale every digital product you build.",
    },
    {
      icon: Shield,
      title: "Self-Evolving Intelligence",
      description: "Products learn from feedback, auto-improve across versions, and optimize for conversions over time.",
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
            NexoraOS is an AI-powered Operating System that turns ideas into scalable digital businesses. 
            Create products, monetize instantly, and let the system self-improve — all from one dashboard.
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
