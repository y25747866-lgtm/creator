import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Bell, CreditCard, FileText, Globe2, HelpCircle, LockKeyhole, LogOut, Moon, Save, Shield, Sun, Trash2, UserRound, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useEbookStore } from "@/hooks/useEbookStore";
import { supabase } from "@/integrations/supabase/client";
import { getPlanDisplayName, getPlanPrice } from "@/lib/subscription";

type SettingRowProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  to?: string;
  href?: string;
};

function SettingRow({ icon: Icon, label, description, onClick, to, href }: SettingRowProps) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[hsl(var(--nx-surface-2))] text-[#A6ADB8]"><Icon size={16} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1 text-left"><span className="block text-sm font-medium text-[hsl(var(--nx-ink))]">{label}</span>{description && <span className="mt-0.5 block truncate text-xs text-[hsl(var(--nx-ink-subtle))]">{description}</span>}</span>
      <ArrowRight size={16} className="shrink-0 text-[hsl(var(--nx-ink-subtle))] transition group-hover:translate-x-0.5 group-hover:text-[hsl(var(--nx-ink-muted))]" aria-hidden="true" />
    </>
  );
  if (href) return <a href={href} className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-left transition last:border-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--nx-amber))]">{content}</a>;
  if (to) return <Link to={to} className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-left transition last:border-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--nx-amber))]">{content}</Link>;
  return <button type="button" onClick={onClick} className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-left transition last:border-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--nx-amber))]">{content}</button>;
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-labelledby={`${label.toLowerCase()}-settings-heading`}><h2 id={`${label.toLowerCase()}-settings-heading`} className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--nx-ink-subtle))]">{label}</h2><div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[hsl(var(--nx-surface-2))]">{children}</div></section>;
}

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { subscription, planType, hasPaidSubscription, expirationDate, loading: subLoading } = useSubscription();
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState("English");
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth/signin?redirect=/dashboard/settings", { replace: true }); return; }
    let cancelled = false;
    void supabase.from("profiles").select("display_name, language, notifications_enabled, appearance").eq("user_id", user.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) { toast({ title: "Could not load settings", description: error.message, variant: "destructive" }); return; }
      setDisplayName(data?.display_name || String(user.user_metadata?.full_name || ""));
      setLanguage(data?.language || "English");
      setNotifications(data?.notifications_enabled ?? true);
      if (data?.appearance === "light" || data?.appearance === "dark") setTheme(data.appearance);
      setProfileLoaded(true);
    });
    return () => { cancelled = true; };
  }, [navigate, setTheme, toast, user]);

  const displayPlan = hasPaidSubscription ? getPlanDisplayName(planType) : "Free";
  const displayPrice = hasPaidSubscription ? getPlanPrice(planType) : getPlanPrice("free");
  const currentTheme = resolvedTheme === "light" ? "light" : "dark";
  const accountName = displayName || String(user?.user_metadata?.full_name || user?.email || "Account");
  const initials = useMemo(() => accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A", [accountName]);

  const saveProfile = async (patch: { display_name?: string | null; language?: string; notifications_enabled?: boolean; appearance?: "light" | "dark" }, label: string) => {
    if (!user) return;
    setSaving(label);
    const { error } = await supabase.from("profiles").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    setSaving(null);
    if (error) { toast({ title: `${label} not saved`, description: error.message, variant: "destructive" }); return; }
    toast({ title: `${label} saved`, description: "Your preference is now synced to your account." });
  };

  const handleSignOut = async () => { useEbookStore.getState().clearAllEbooks(); await signOut(); toast({ title: "Signed out" }); navigate("/"); };
  const handleThemeChange = (checked: boolean) => { const next = checked ? "dark" : "light"; setTheme(next); void saveProfile({ appearance: next }, "Appearance"); };

  return <DashboardLayout><div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12"><div className="mx-auto max-w-2xl">
    <header className="mb-8 flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--nx-ink-subtle))]">Workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[hsl(var(--nx-ink))]">Settings</h1><p className="mt-2 text-sm leading-6 text-[hsl(var(--nx-ink-subtle))]">Manage your account, preferences, and plan.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[hsl(var(--nx-surface-2))] text-xs font-semibold">{initials}</div></header>
    <div className="space-y-7">
      <SettingsGroup label="Account">
        <div className="flex items-end gap-3 border-b border-white/[0.06] px-4 py-4"><label className="min-w-0 flex-1"><span className="mb-2 block text-sm font-medium text-[hsl(var(--nx-ink))]">Profile name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={user?.email || "Your name"} className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-ring" /></label><button type="button" onClick={() => void saveProfile({ display_name: displayName.trim() || null }, "Profile")} disabled={saving === "Profile" || !profileLoaded} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Save size={15} />{saving === "Profile" ? "Saving" : "Save"}</button></div>
        <SettingRow icon={Globe2} label="Email" description={user?.email || "Not connected"} />
        <SettingRow icon={LockKeyhole} label="Password" description="Update your sign-in method" onClick={() => toast({ title: "Password", description: "Use the password reset link from the sign-in page." })} />
      </SettingsGroup>
      <SettingsGroup label="Preferences">
        <div className="group flex min-h-16 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-left transition hover:bg-white/[0.025]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[hsl(var(--nx-surface-2))] text-[#A6ADB8]"><Bell size={16} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[hsl(var(--nx-ink))]">Notifications</span><span className="mt-0.5 block text-xs text-[hsl(var(--nx-ink-subtle))]">Email and product updates</span></span><Switch checked={notifications} onCheckedChange={(checked) => { setNotifications(checked); void saveProfile({ notifications_enabled: checked }, "Notifications"); }} aria-label="Toggle notifications" /></div>
        <div className="flex min-h-16 items-center gap-3 border-b border-white/[0.06] px-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[hsl(var(--nx-surface-2))] text-[#A6ADB8]"><Globe2 size={16} /></span><label className="min-w-0 flex-1"><span className="block text-sm font-medium text-[hsl(var(--nx-ink))]">Language</span><span className="mt-0.5 block text-xs text-[hsl(var(--nx-ink-subtle))]">Choose your workspace language</span></label><select value={language} onChange={(event) => { setLanguage(event.target.value); void saveProfile({ language: event.target.value }, "Language"); }} className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-ring"><option>English</option><option>Spanish</option><option>French</option><option>German</option><option>Japanese</option></select></div>
        <div className="flex min-h-16 items-center gap-3 px-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[hsl(var(--nx-surface-2))] text-[#A6ADB8]">{currentTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[hsl(var(--nx-ink))]">Appearance</span><span className="mt-0.5 block text-xs text-[hsl(var(--nx-ink-subtle))]">{currentTheme === "dark" ? "Dark mode" : "Light mode"}</span></span><Switch checked={currentTheme === "dark"} onCheckedChange={handleThemeChange} aria-label="Toggle dark mode" /></div>
      </SettingsGroup>
      <SettingsGroup label="Billing"><SettingRow icon={CreditCard} label="Current plan" description={subLoading ? "Loading plan" : `${displayPlan} · ${displayPrice}${subscription?.end_date || expirationDate ? ` · Renews ${expirationDate || subscription?.end_date}` : ""}`} /><SettingRow icon={ArrowRight} label="Upgrade" description={hasPaidSubscription ? "Change your plan" : "Choose a paid plan"} to="/pricing" /></SettingsGroup>
      <SettingsGroup label="Support"><SettingRow icon={HelpCircle} label="Help center" description="Get answers and contact support" href="mailto:support@nexoraos.digital" /><SettingRow icon={Shield} label="Privacy policy" description="How NexoraOS handles your data" to="/privacy" /><SettingRow icon={FileText} label="Terms of service" description="The rules for using NexoraOS" to="/terms" /><SettingRow icon={CreditCard} label="Refund policy" description="How billing issues and cancellations work" to="/refund" /></SettingsGroup>
      <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-7 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => toast({ title: "Delete account", description: "Account deletion requests are handled by support." })} className="inline-flex items-center gap-2 text-sm font-medium text-[#EF6B73] transition hover:text-[#FF9A9F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF6B73]"><Trash2 size={15} />Delete account</button><button type="button" onClick={handleSignOut} className="inline-flex items-center gap-2 text-sm text-[hsl(var(--nx-ink-muted))] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--nx-amber))]"><LogOut size={15} />Sign out</button></div>
    </div>
  </div></div></DashboardLayout>;
};

export default Settings;
