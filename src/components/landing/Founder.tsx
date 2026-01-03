import { motion } from "framer-motion";

const Founder = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-panel rounded-3xl p-8 md:p-12"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center text-4xl md:text-5xl font-bold text-white shrink-0">
              YM
            </div>
            
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Meet the Founder
              </h2>
              <h3 className="text-xl text-primary font-semibold mb-4">
                Yesh Malik
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                As a passionate entrepreneur and digital product creator, I built NexoraOS 
                to solve the challenges I faced every day. After years of juggling multiple tools, 
                managing scattered workflows, and spending countless hours on repetitive tasks, 
                I envisioned a unified platform that puts creators first. NexoraOS is the result 
                of that vision — a powerful, intuitive operating system designed to help you 
                focus on what matters most: creating and growing your digital business.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Founder;
