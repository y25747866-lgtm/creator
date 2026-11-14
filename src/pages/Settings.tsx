import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Bell, CreditCard, FileText, Globe2, HelpCircle, LockKeyhole, LogOut, Moon, Shield, Sun, Trash2, UserRound, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useEbookStore } from "@/hooks/useEbookStore";
import { getPlanDisplayName, getPlanPrice } from "@/lib/subscription";

type SettingRowProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  to?: string;
};

function SettingRow({ icon: Icon, label, description, onClick, to }: SettingRowProps) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111318] text-[#A6ADB8]">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-[#F0F2F5]">{label}</span>
        {description && <span className="mt-0.5 block truncate text-xs text-[#6B7280]">{description}</span>}
      </span>
      <ArrowRight size={16} className="shrink-0 text-[#6B7280] transition group-hover:translate-x-0.5 group-hover:text-[#B7BEC8]" aria-hidden="true" />
    </>
  );

  if (to) return <Link to={to} className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-left transition last:border-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8C96A3]">{content}</Link>;
  return <button type="button" onClick={onClick} className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-left transition last:border-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8C96A3]">{content}</button>;
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${label.toLowerCase()}-settings-heading`}>
      <h2 id={`${label.toLowerCase()}-settings-heading`} className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">{label}</h2>
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111318]">{children}</div>
    </section>
  );
}

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { subscription, planType, hasPaidSubscription, expirationDate, loading: subLoading } = useSubscription();
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (!user) navigate("/auth/signin?redirect=/dashboard/settings", { replace: true });
  }, [navigate, user]);

  const displayPlan = hasPaidSubscription ? getPlanDisplayName(planType) : "Free";
  const displayPrice = hasPaidSubscription ? getPlanPrice(planType) : getPlanPrice("free");
  const currentTheme = resolvedTheme === "light" ? "light" : "dark";
  const accountName = String(user?.user_metadata?.full_name || user?.email || "Account");
  const initials = useMemo(() => accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A", [accountName]);

  const handleSignOut = async () => {
    useEbookStore.getState().clearAllEbooks();
    await signOut();
    toast({ title: "Signed out" });
    navigate("/");
  };

  const handlePlaceholder = (label: string) => toast({ title: `${label} settings`, description: "This settings panel is ready for the next account integration." });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#080A0C] px-4 py-8 text-[#F0F2F5] sm:px-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#F0F2F5]">Settings</h1>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">Manage your account, preferences, and plan.</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#111318] text-xs font-semibold">{initials}</div>
          </header>

          <div className="space-y-7">
            <SettingsGroup label="Account">
              <SettingRow icon={UserRound} label="Profile" description={accountName} onClick={() => handlePlaceholder("Profile")} />
              <SettingRow icon={Globe2} label="Email" description={user?.email || "Not connected"} onClick={() => handlePlaceholder("Email")} />
              <SettingRow icon={LockKeyhole} label="Password" description="Update your sign-in method" onClick={() => handlePlaceholder("Password")} />
            </SettingsGroup>

            <SettingsGroup label="Preferences">
              <button type="button" onClick={() => setNotifications((value) => !value)} className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-left transition hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8C96A3]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111318] text-[#A6ADB8]"><Bell size={16} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#F0F2F5]">Notifications</span><span className="mt-0.5 block text-xs text-[#6B7280]">Email and product updates</span></span>
                <Switch checked={notifications} onCheckedChange={setNotifications} aria-label="Toggle notifications" />
              </button>
              <SettingRow icon={Globe2} label="Language" description="English" onClick={() => handlePlaceholder("Language")} />
              <div className="flex min-h-16 items-center gap-3 px-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111318] text-[#A6ADB8]">{currentTheme === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#F0F2F5]">Appearance</span><span className="mt-0.5 block text-xs text-[#6B7280]">{currentTheme === "dark" ? "Dark mode" : "Light mode"}</span></span>
                <Switch checked={currentTheme === "dark"} onCheckedChange={(checked) => { const next = checked ? "dark" : "light"; document.documentElement.setAttribute("data-theme", next); setTheme(next); }} aria-label="Toggle dark mode" />
              </div>
            </SettingsGroup>

            <SettingsGroup label="Billing">
              <SettingRow icon={CreditCard} label="Current plan" description={subLoading ? "Loading plan" : `${displayPlan} · ${displayPrice}${subscription?.end_date || expirationDate ? ` · Renews ${expirationDate || subscription?.end_date}` : ""}`} onClick={() => handlePlaceholder("Current plan")} />
              <SettingRow icon={ArrowRight} label="Upgrade" description={hasPaidSubscription ? "Change your plan" : "Choose a paid plan"} to="/pricing" />
            </SettingsGroup>

            <SettingsGroup label="Support">
              <SettingRow icon={HelpCircle} label="Help center" description="Get answers and contact support" onClick={() => handlePlaceholder("Help center")} />
              <SettingRow icon={Shield} label="Privacy policy" description="How NexoraOS handles your data" onClick={() => handlePlaceholder("Privacy policy")} />
              <SettingRow icon={FileText} label="Terms of service" description="The rules for using NexoraOS" onClick={() => handlePlaceholder("Terms of service")} />
            </SettingsGroup>

            <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-7 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => toast({ title: "Delete account", description: "Account deletion requests are handled by support." })} className="inline-flex items-center gap-2 text-sm font-medium text-[#EF6B73] transition hover:text-[#FF9A9F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF6B73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0C]"><Trash2 size={15} aria-hidden="true" />Delete account</button>
              <button type="button" onClick={handleSignOut} className="inline-flex items-center gap-2 text-sm text-[#8B929E] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C96A3]"><LogOut size={15} aria-hidden="true" />Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
