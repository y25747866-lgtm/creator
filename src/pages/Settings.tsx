import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Palette, Bell, Shield, CreditCard, LogOut, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useEbookStore } from "@/hooks/useEbookStore";
import { PlasmaWeb } from "@/components/PlasmaWeb";
import {
  getPlanDisplayName,
  getPlanPrice,
} from "@/lib/subscription";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    subscription,
    planType,
    hasPaidSubscription,
    expirationDate,
    loading: subLoading,
  } = useSubscription();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [notifications, setNotifications] = useState({ email: true, updates: true });

  useEffect(() => {
    if (user?.email) {
      setProfile((prev) => ({ ...prev, email: user.email || "" }));
    }
    // Force dark theme for settings if not already set
    if (theme !== 'dark') {
        setTheme('dark');
    }
  }, [user, theme, setTheme]);

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully.",
    });
  };

  const handleSignOut = async () => {
    useEbookStore.getState().clearAllEbooks();
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const displayPlanName = getPlanDisplayName(planType);
  const displayPlanPrice = getPlanPrice(planType);

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Professional Background Gradient */}
        <div className="fixed inset-0 -z-10 bg-[#04030E]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0520] via-[#04030E] to-[#1a0a3e] opacity-50" />
            <PlasmaWeb
                hueShift={270}
                density={0.4}
                glowIntensity={0.6}
                saturation={0.4}
                brightness={0.3}
                energyFlow={0.4}
                pulseIntensity={0.1}
                attractionStrength={1.0}
                mouseAttraction={true}
                transparent={true}
                speed={0.2}
            />
        </div>

        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-2 text-white font-clash">Settings</h1>
            <p className="text-[#9EA4C0]">
              Manage your account and preferences.
            </p>
          </motion.div>

          {/* Subscription Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-white font-clash">Subscription</h2>
              </div>

              {subLoading ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-[#9EA4C0] animate-pulse">Loading subscription...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 gap-4">
                    <div>
                      <p className="font-bold text-xl text-white capitalize">
                        {displayPlanName} Plan
                      </p>
                      <p className="text-sm text-[#9EA4C0] mt-1">
                        {hasPaidSubscription && subscription
                          ? `Active since ${formatDate(
                              subscription.start_date || subscription.started_at
                            )} • ${displayPlanPrice}`
                          : displayPlanPrice}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-center ${
                        hasPaidSubscription
                          ? "bg-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                          : "bg-white/10 text-[#9EA4C0]"
                      }`}
                    >
                      {subscription?.status === "expired"
                        ? "Expired"
                        : hasPaidSubscription
                          ? "Active"
                          : "Free"}
                    </span>
                  </div>

                  {hasPaidSubscription && subscription && (
                    <div className="p-4 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20">
                      <p className="text-sm font-medium text-purple-300">
                        Expires on {expirationDate}
                      </p>
                    </div>
                  )}

                  {subscription?.status === "expired" && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-sm font-medium text-red-400">
                        Your subscription has expired. Please upgrade to continue
                        using premium features.
                      </p>
                    </div>
                  )}

                  {!hasPaidSubscription && (
                    <Button
                      onClick={() => navigate("/pricing")}
                      className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold h-12 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#6D28D9]/20 border border-[#7C3AED]/30 flex items-center justify-center">
                  <User className="w-6 h-6 text-[#A78BFA]" />
                </div>
                <h2 className="text-2xl font-bold text-white font-clash">Profile Information</h2>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-[#9EA4C0]">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-white/20 focus:ring-[#7C3AED]/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-[#9EA4C0]">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={profile.email}
                    disabled
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white/50 cursor-not-allowed"
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} className="mt-8 bg-white/10 hover:bg-white/20 text-white border border-white/10 h-12 px-8 rounded-xl transition-all">
                Save Changes
              </Button>
            </Card>
          </motion.div>

          {/* Appearance & Notifications */}
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl h-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Palette className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white font-clash">Appearance</h2>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="font-bold text-white">Dark Mode</p>
                    <p className="text-xs text-[#9EA4C0] mt-1">
                      Always dark for professional focus
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[#7C3AED]">
                    <Moon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase">Active</span>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl h-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white font-clash">Notifications</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">Email Alerts</p>
                      <p className="text-xs text-[#9EA4C0]">Activity updates</p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email: checked })
                      }
                      className="data-[state=checked]:bg-[#7C3AED]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">Product Updates</p>
                      <p className="text-xs text-[#9EA4C0]">New features</p>
                    </div>
                    <Switch
                      checked={notifications.updates}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, updates: checked })
                      }
                      className="data-[state=checked]:bg-[#7C3AED]"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Account Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white font-clash">Account Security</h2>
              </div>
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="current-password text-[#9EA4C0]">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-[#7C3AED]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password text-[#9EA4C0]">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-[#7C3AED]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password text-[#9EA4C0]">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-[#7C3AED]/50"
                    />
                  </div>
                </div>
                <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl h-12 px-8">
                  Update Password
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Sign Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="font-bold text-xl text-white">Sign Out</p>
                  <p className="text-sm text-[#9EA4C0] mt-1">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  className="gap-2 bg-red-500 hover:bg-red-600 text-white font-bold h-12 px-8 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
