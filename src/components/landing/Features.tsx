import { motion } from "framer-motion";
import { BookOpen, Download, LayoutDashboard, Settings, Users } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: BookOpen,
      title: "AI Ebook Generator",
      description: "Create professional ebooks with AI-generated content and stunning covers in minutes.",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Download,
      title: "Download History",
      description: "Access all your generated content anytime with organized download management.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: LayoutDashboard,
      title: "Smart Dashboard",
      description: "Get a complete overview of your digital products and performance metrics.",
      color: "from-blue-500 to-indigo-500",
    },
    {
      icon: Settings,
      title: "Custom Settings",
      description: "Personalize your experience with flexible configuration options.",
      color: "from-violet-500 to-purple-500",
    },
    {
      icon: Users,
      title: "Referral System",
      description: "Grow your network and earn rewards through our integrated referral program.",
      color: "from-pink-500 to-rose-500",
    },
  ];

  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Powerful <span className="gradient-text">Features</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create, manage, and scale your digital products.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-panel rounded-2xl p-6 hover-lift group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
