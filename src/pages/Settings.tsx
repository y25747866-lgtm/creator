import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Palette, Bell, Shield, CreditCard, LogOut, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useEbookStore } from "@/hooks/useEbookStore";
import { getPlanDisplayName, getPlanPrice } from "@/lib/subscription";

const SectionIcon = ({ icon: Icon }: { icon: any }) => (
  <div style={{
    width: '32px', height: '32px', background: '#1A1A1A',
    border: '1px solid #222222', borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Icon className="w-[14px] h-[14px] text-white" />
  </div>
);

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    subscription, planType, hasPaidSubscription, expirationDate, loading: subLoading,
  } = useSubscription();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [notifications, setNotifications] = useState({ email: true, updates: true });

  useEffect(() => {
    if (user?.email) {
      setProfile((prev) => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  const handleSaveProfile = () => {
    toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
  };

  const handleSignOut = async () => {
    useEbookStore.getState().clearAllEbooks();
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    navigate("/");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const displayPlanName = getPlanDisplayName(planType);
  const displayPlanPrice = getPlanPrice(planType);

  const labelStyle = { fontFamily: "'DM Sans', sans-serif", fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#555555', marginBottom: '8px', display: 'block' };
  const inputStyle = { background: '#161616', border: '1px solid #1A1A1A', borderRadius: '6px', color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '12px 14px', width: '100%' };
  const cardStyle = { background: '#111111', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '32px' };

  return (
    <DashboardLayout>
      <div style={{ background: '#0A0A0A', padding: '40px', paddingBottom: '120px' }}>
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>Settings</h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#555555' }}>Manage your account and preferences.</p>
          </motion.div>

          {/* Subscription */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
            <div style={cardStyle}>
              <div className="flex items-center gap-3 mb-6">
                <SectionIcon icon={CreditCard} />
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Subscription</h2>
              </div>
              {subLoading ? (
                <p style={{ color: '#555555', fontSize: '13px' }}>Loading subscription...</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg gap-3" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
                    <div>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF', textTransform: 'capitalize' }}>{displayPlanName} Plan</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#555555', marginTop: '4px' }}>
                        {hasPaidSubscription && subscription ? `Active since ${formatDate(subscription.start_date || subscription.started_at)} · ${displayPlanPrice}` : displayPlanPrice}
                      </p>
                    </div>
                    <span style={{
                      background: '#1A1A1A', border: '1px solid #2A2A2A', color: 'rgba(255,255,255,0.6)',
                      fontSize: '10px', fontWeight: 700, padding: '4px 12px', borderRadius: '4px',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {subscription?.status === "expired" ? "Expired" : hasPaidSubscription ? "Active" : "Free"}
                    </span>
                  </div>

                  {hasPaidSubscription && subscription && (
                    <div className="p-3 rounded-lg" style={{ background: '#161616', border: '1px solid #1A1A1A' }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#666666' }}>Expires on {expirationDate}</p>
                    </div>
                  )}

                  {subscription?.status === "expired" && (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p style={{ fontSize: '13px', color: '#EF4444' }}>Your subscription has expired. Please upgrade to continue using premium features.</p>
                    </div>
                  )}

                  {!hasPaidSubscription && (
                    <button onClick={() => navigate("/pricing")} style={{
                      width: '100%', background: '#FFFFFF', color: '#0A0A0A',
                      fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px',
                      padding: '14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      Upgrade Plan
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Profile */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div style={cardStyle}>
              <div className="flex items-center gap-3 mb-6">
                <SectionIcon icon={User} />
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Profile Information</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <Input placeholder="Enter your name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} style={inputStyle} className="placeholder:text-[#333333] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <Input type="email" value={profile.email} disabled style={{ ...inputStyle, color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }} />
                </div>
              </div>
              <button onClick={handleSaveProfile} style={{
                marginTop: '20px', background: 'transparent', border: '1px solid #1A1A1A',
                color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif", fontSize: '13px',
                fontWeight: 600, padding: '10px 20px', borderRadius: '6px', cursor: 'pointer',
                transition: 'border-color 150ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
              >
                Save Changes
              </button>
            </div>
          </motion.div>

          {/* Appearance & Notifications */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <div style={{ ...cardStyle, height: '100%' }}>
                <div className="flex items-center gap-3 mb-6">
                  <SectionIcon icon={Palette} />
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Appearance</h2>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Dark Mode</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#555555', marginTop: '2px' }}>Always dark for professional focus</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Active</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <div style={{ ...cardStyle, height: '100%' }}>
                <div className="flex items-center gap-3 mb-6">
                  <SectionIcon icon={Bell} />
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Notifications</h2>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'email' as const, label: 'Email Alerts', desc: 'Activity updates' },
                    { key: 'updates' as const, label: 'Product Updates', desc: 'New features' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>{item.label}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#555555' }}>{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key]}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                        className="data-[state=checked]:bg-white data-[state=unchecked]:bg-[#2A2A2A]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Account Security */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div style={cardStyle}>
              <div className="flex items-center gap-3 mb-6">
                <SectionIcon icon={Shield} />
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Account Security</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {['Current Password', 'New Password', 'Confirm Password'].map((label) => (
                  <div key={label}>
                    <label style={labelStyle}>{label}</label>
                    <Input type="password" placeholder="••••••••" style={inputStyle} className="placeholder:text-[#333333] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                ))}
              </div>
              <button style={{
                marginTop: '20px', background: 'transparent', border: '1px solid #1A1A1A',
                color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif", fontSize: '13px',
                fontWeight: 600, padding: '10px 20px', borderRadius: '6px', cursor: 'pointer',
                transition: 'border-color 150ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
              >
                Update Password
              </button>
            </div>
          </motion.div>

          {/* Sign Out */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '10px', padding: '32px' }}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Sign Out</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#555555', marginTop: '4px' }}>Sign out of your account on this device</p>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    background: 'transparent', border: '1px solid #EF4444', color: '#EF4444',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px',
                    padding: '10px 24px', borderRadius: '6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#EF4444'; }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
