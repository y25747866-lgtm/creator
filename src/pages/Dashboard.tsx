import { motion } from "framer-motion";
import { BookOpen, Download, TrendingUp, Zap } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  const stats = [
    {
      icon: BookOpen,
      label: "Ebooks Created",
      value: "0",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Download,
      label: "Total Downloads",
      value: "0",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: TrendingUp,
      label: "This Month",
      value: "0",
      color: "from-blue-500 to-indigo-500",
    },
    {
      icon: Zap,
      label: "AI Credits",
      value: "∞",
      color: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">Welcome to NexoraOS</h1>
          <p className="text-muted-foreground">
            Your digital product command center. Start creating today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="glass-panel p-6 hover-lift">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-panel p-6 hover-lift cursor-pointer group" onClick={() => window.location.href = '/dashboard/ebook-generator'}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Create New Ebook</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate a professional ebook with AI
                  </p>
                </div>
              </div>
            </Card>

            <Card className="glass-panel p-6 hover-lift cursor-pointer group" onClick={() => window.location.href = '/dashboard/downloads'}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">View Downloads</h3>
                  <p className="text-sm text-muted-foreground">
                    Access your generated content
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Recent Activity Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <Card className="glass-panel p-8 text-center">
            <p className="text-muted-foreground">
              No recent activity. Create your first ebook to get started!
            </p>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
