import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Palette, Bell, Shield, CreditCard, LogOut } from "lucide-react";
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

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, hasActiveSubscription } = useSubscription();
  
  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    updates: true,
  });

  useEffect(() => {
    if (user?.email) {
      setProfile(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully.",
    });
  };

  const handleSignOut = async () => {
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences.
          </p>
        </motion.div>

        {/* Subscription Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Card className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Subscription</h2>
            </div>

            {hasActiveSubscription && subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div>
                    <p className="font-semibold text-lg capitalize">
                      {subscription.plan_type} Plan
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Active since {formatDate(subscription.started_at)}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Active
                  </span>
                </div>
                {subscription.expires_at && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {formatDate(subscription.expires_at)}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No active subscription</p>
                <Button onClick={() => navigate("/pricing")}>
                  View Plans
                </Button>
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
          <Card className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Profile Information</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={profile.email}
                  disabled
                  className="mt-2"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="mt-6">
              Save Changes
            </Button>
          </Card>
        </motion.div>

        {/* Theme Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </Card>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive emails about your activity
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Product Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new features
                  </p>
                </div>
                <Switch
                  checked={notifications.updates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, updates: checked })
                  }
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Account Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Account Security</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  className="mt-2"
                />
              </div>
              <Button variant="outline" className="mt-2">
                Update Password
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Sign Out Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="glass-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account on this device
                </p>
              </div>
              <Button variant="destructive" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
