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
import { useEbookStore } from "@/hooks/useEbookStore";
import {
  getPlanDisplayName,
  getPlanPrice,
  formatExpirationDate,
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
  }, [user]);

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

            {subLoading ? (
              <div className="flex items-center justify-center p-4">
                <p className="text-muted-foreground">Loading subscription...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div>
                    <p className="font-semibold text-lg capitalize">
                      {displayPlanName} Plan
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasPaidSubscription && subscription
                        ? `Active since ${formatDate(
                            subscription.start_date || subscription.started_at
                          )} • ${displayPlanPrice}`
                        : displayPlanPrice}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      hasPaidSubscription
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {subscription?.status === "expired"
                      ? "Expired"
                      : hasPaidSubscription
                        ? "Active"
                        : "Free"}
                  </span>
                </div>

                {/* Display expiration info */}
                {hasPaidSubscription && subscription && (
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Expires on {expirationDate}
                    </p>
                  </div>
                )}

                {subscription?.status === "expired" && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Your subscription has expired. Please upgrade to continue
                      using premium features.
                    </p>
                  </div>
                )}

                {!hasPaidSubscription && (
                  <Button
                    onClick={() => navigate("/pricing")}
                    className="mt-2 w-full"
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
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
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

        {/* Appearance Section */}
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
                onCheckedChange={(checked) =>
                  setTheme(checked ? "dark" : "light")
                }
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

        {/* Account Security */}
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

        {/* Sign Out */}
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
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="gap-2"
              >
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
