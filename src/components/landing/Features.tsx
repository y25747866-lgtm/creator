import { motion } from "framer-motion";
import {
  BookOpen,
  Download,
  LayoutDashboard,
  Settings,
  Users,
  Package,
  RefreshCw,
  BarChart3,
  Wand2,
  GitCompare,
  MessageSquare,
  Rocket,
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: BookOpen,
      title: "AI Product Generator",
      description: "Generate ebooks, courses, SaaS blueprints, funnels, and more from a single idea.",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Package,
      title: "Modular Monetization Engine",
      description: "Convert any product into 8 revenue assets: Course, Lead Magnet, Prompt Pack, Landing Page, Email Sequence, Affiliate Funnel, Upsell/Downsell, Micro SaaS Blueprint.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: RefreshCw,
      title: "Self-Evolving Product Engine",
      description: "Products learn from user feedback and auto-improve across versions for higher conversions.",
      color: "from-blue-500 to-indigo-500",
    },
    {
      icon: BarChart3,
      title: "Product Analytics Intelligence",
      description: "Track downloads, engagement, conversions, and revenue performance in real time.",
      color: "from-violet-500 to-purple-500",
    },
    {
      icon: Wand2,
      title: "Monetization Wizard",
      description: "Step-by-step guided funnel & product builder that turns one idea into an entire business system.",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: GitCompare,
      title: "Versioning System",
      description: "Compare versions side-by-side, regenerate with improvements, and roll back anytime.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Users,
      title: "Referral Growth System",
      description: "Built-in viral user acquisition engine to grow your audience organically.",
      color: "from-orange-500 to-amber-500",
    },
    {
      icon: LayoutDashboard,
      title: "Smart Creator Dashboard",
      description: "Full control over products, monetization, analytics, versions, and feedback from one place.",
      color: "from-cyan-500 to-blue-500",
    },
    {
      icon: Download,
      title: "Download & Export System",
      description: "Export production-ready assets as PDF, text, or structured files — ready to sell.",
      color: "from-rose-500 to-pink-500",
    },
    {
      icon: MessageSquare,
      title: "Feedback Intelligence",
      description: "Collect ratings, comments, and sentiment data to fuel AI-driven product improvements.",
      color: "from-teal-500 to-emerald-500",
    },
    {
      icon: Settings,
      title: "Custom Configuration",
      description: "Personalize your workspace with flexible settings and preferences.",
      color: "from-slate-500 to-gray-500",
    },
    {
      icon: Rocket,
      title: "Priority AI Queue",
      description: "Pro users get dedicated compute for faster generation and priority access to new features.",
      color: "from-amber-500 to-orange-500",
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
            The Complete <span className="gradient-text">Creator OS</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create, monetize, and scale AI-powered digital products.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
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
