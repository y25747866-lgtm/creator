import { motion } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GetStarted = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-16 text-center"
          style={{
            background: "linear-gradient(135deg, hsl(243 75% 59% / 0.15) 0%, hsl(262 83% 58% / 0.15) 100%)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, type: "spring" }}
              className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            >
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Build Your
              <br />
              <span className="gradient-text">AI-Powered Business?</span>
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Start with a 10-minute free trial. Create products, explore monetization, 
              and see why NexoraOS is the only platform that turns one idea into an entire business system.
            </p>

            <Link to="/dashboard">
              <Button size="lg" className="text-base px-10 py-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GetStarted;
