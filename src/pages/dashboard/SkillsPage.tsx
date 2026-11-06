import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Github,
  Loader2,
  MoreHorizontal,
  Plus,
  Puzzle,
  Search,
  ShieldCheck,
  Upload,
  WandSparkles,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { INVALID_SKILL_MANIFEST_MESSAGE, parseGithubSkillSource, validateSkillManifest, type SkillManifest } from "@/lib/skills/manifest";

type SkillPack = {
  id: string;
  name: string;
  description: string;
  tools: unknown[];
  agent: string;
  version: string | null;
  is_official: boolean;
  github_url: string | null;
};

type UserSkill = {
  user_id: string;
  skill_id: string;
  is_active: boolean;
};

type SkillTab = "All" | "Official" | "Community" | "Mine";
type SkillsDatabase = { from: (table: "skill_packs" | "user_skills") => any };
const skillsDatabase = supabase as unknown as SkillsDatabase;
const tabs: SkillTab[] = ["All", "Official", "Community", "Mine"];
const uploadLimit = 1024 * 1024;

function friendlySkillError(error: unknown): string {
  const candidate = error as { code?: string; message?: string } | null;
  const message = candidate?.message ?? "";
  if (
    candidate?.code === "42P01"
    || candidate?.code === "PGRST205"
    || /skill_packs|user_skills/i.test(message)
  ) {
    return "Skills storage is not set up yet. Apply the skill_packs and user_skills migration, then refresh this page.";
  }
  return message || "The Skills service could not complete that request. Please try again.";
}

function normalizeVersion(version: string | null | undefined): string {
  const value = version?.trim();
  if (!value) return "v1.0.0";
  return value.startsWith("v") ? value : `v${value}`;
}

export default function SkillsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [skills, setSkills] = useState<SkillPack[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<SkillTab>("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSkillIds, setPendingSkillIds] = useState<Set<string>>(() => new Set());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionView, setActionView] = useState<"actions" | "github">("actions");
  const [githubUrl, setGithubUrl] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSkills = useCallback(async () => {
    if (!user?.id) {
      setSkills([]);
      setUserSkills([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const [packsResult, userSkillsResult] = await Promise.all([
        skillsDatabase.from("skill_packs")
          .select("id,name,description,tools,agent,version,is_official,github_url")
          .order("name", { ascending: true }),
        skillsDatabase.from("user_skills")
          .select("user_id,skill_id,is_active")
          .eq("user_id", user.id),
      ]);

      if (packsResult.error) throw packsResult.error;
      if (userSkillsResult.error) throw userSkillsResult.error;
      setSkills((packsResult.data ?? []) as SkillPack[]);
      setUserSkills((userSkillsResult.data ?? []) as UserSkill[]);
    } catch (error) {
      setSkills([]);
      setUserSkills([]);
      setLoadError(friendlySkillError(error));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const userSkillById = useMemo(() => new Map(userSkills.map((entry) => [entry.skill_id, entry])), [userSkills]);
  const visibleSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return skills.filter((skill) => {
      const inTab = selectedTab === "All"
        || (selectedTab === "Official" && skill.is_official)
        || (selectedTab === "Community" && !skill.is_official)
        || (selectedTab === "Mine" && userSkillById.has(skill.id));
      if (!inTab) return false;
      if (!query) return true;
      const searchable = [skill.name, skill.description, skill.agent, ...(skill.tools ?? []).map((tool) => typeof tool === "string" ? tool : JSON.stringify(tool))].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [searchQuery, selectedTab, skills, userSkillById]);

  const changeSkillActive = async (skill: SkillPack, isActive: boolean) => {
    if (!user?.id) {
      toast({ title: "Sign in required", description: "Sign in to add skills to your account.", variant: "destructive" });
      return;
    }

    setPendingSkillIds((current) => new Set(current).add(skill.id));
    try {
      if (isActive) {
        const { error } = await skillsDatabase.from("user_skills").upsert(
          { user_id: user.id, skill_id: skill.id, is_active: true },
          { onConflict: "user_id,skill_id" },
        );
        if (error) throw error;
        setUserSkills((current) => {
          const existing = current.some((entry) => entry.skill_id === skill.id);
          return existing
            ? current.map((entry) => entry.skill_id === skill.id ? { ...entry, is_active: true } : entry)
            : [...current, { user_id: user.id, skill_id: skill.id, is_active: true }];
        });
      } else {
        const { error } = await skillsDatabase.from("user_skills")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("skill_id", skill.id);
        if (error) throw error;
        setUserSkills((current) => current.map((entry) => entry.skill_id === skill.id ? { ...entry, is_active: false } : entry));
      }
    } catch (error) {
      toast({ title: "Could not update skill", description: friendlySkillError(error), variant: "destructive" });
    } finally {
      setPendingSkillIds((current) => {
        const next = new Set(current);
        next.delete(skill.id);
        return next;
      });
    }
  };

  const removeSkillFromMine = async (skill: SkillPack) => {
    if (!user?.id || !window.confirm(`Remove ${skill.name} from your skills? The skill pack remains in the catalog.`)) return;
    setPendingSkillIds((current) => new Set(current).add(skill.id));
    try {
      const { error } = await skillsDatabase.from("user_skills")
        .delete()
        .eq("user_id", user.id)
        .eq("skill_id", skill.id);
      if (error) throw error;
      setUserSkills((current) => current.filter((entry) => entry.skill_id !== skill.id));
      toast({ title: "Skill removed", description: `${skill.name} was removed from your skills.` });
    } catch (error) {
      toast({ title: "Could not remove skill", description: friendlySkillError(error), variant: "destructive" });
    } finally {
      setPendingSkillIds((current) => {
        const next = new Set(current);
        next.delete(skill.id);
        return next;
      });
    }
  };

  const saveImportedSkill = async (manifest: SkillManifest, githubRepositoryUrl: string | null) => {
    if (!user?.id) throw new Error("Sign in to add a skill to your account.");

    const packPayload = {
      name: manifest.name,
      description: manifest.description,
      tools: manifest.tools,
      agent: manifest.agent,
      version: manifest.version,
      is_official: false,
      github_url: githubRepositoryUrl,
    };
    const { data, error } = await skillsDatabase.from("skill_packs")
      .insert(packPayload)
      .select("id,name,description,tools,agent,version,is_official,github_url")
      .single();
    if (error) throw error;

    const pack = data as SkillPack;
    const { error: userSkillError } = await skillsDatabase.from("user_skills")
      .upsert({ user_id: user.id, skill_id: pack.id, is_active: true }, { onConflict: "user_id,skill_id" });
    if (userSkillError) {
      await loadSkills();
      throw new Error(`Skill imported, but it could not be added to your account: ${friendlySkillError(userSkillError)}`);
    }

    await loadSkills();
    setActionsOpen(false);
    setActionView("actions");
    setGithubUrl("");
    setImportError(null);
    toast({ title: "Skill imported", description: `${manifest.name} was added to your skills and enabled.` });
  };

  const handleGithubImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportError(null);
    const source = parseGithubSkillSource(githubUrl);
    if (!source) {
      setImportError("Enter a public GitHub repository URL.");
      return;
    }

    setIsImporting(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(source.manifestUrl, { signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error(INVALID_SKILL_MANIFEST_MESSAGE);
      const body = await response.text();
      if (body.length > uploadLimit) throw new Error("The skill manifest must be 1 MB or smaller.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error(INVALID_SKILL_MANIFEST_MESSAGE);
      }
      const validation = validateSkillManifest(parsed);
      if (!validation.ok) throw new Error(INVALID_SKILL_MANIFEST_MESSAGE);
      await saveImportedSkill(validation.manifest, source.repositoryUrl);
    } catch (error) {
      setImportError(friendlySkillError(error));
    } finally {
      window.clearTimeout(timeout);
      setIsImporting(false);
    }
  };

  const handleSkillFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast({ title: "Choose a JSON file", description: "Upload a .json skill manifest.", variant: "destructive" });
      return;
    }
    if (file.size > uploadLimit) {
      toast({ title: "Manifest is too large", description: "Skill manifests must be 1 MB or smaller.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error(INVALID_SKILL_MANIFEST_MESSAGE);
      }
      const validation = validateSkillManifest(parsed);
      if (!validation.ok) throw new Error(INVALID_SKILL_MANIFEST_MESSAGE);
      await saveImportedSkill(validation.manifest, null);
    } catch (error) {
      toast({ title: "Could not upload skill", description: friendlySkillError(error), variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const activeTabCount = (tab: SkillTab) => {
    if (tab === "All") return skills.length;
    if (tab === "Official") return skills.filter((skill) => skill.is_official).length;
    if (tab === "Community") return skills.filter((skill) => !skill.is_official).length;
    return userSkills.length;
  };

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[#121212] px-4 pb-28 pt-5 text-white sm:px-8 sm:pt-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-7 flex min-h-10 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/dashboard" aria-label="Back to Product Studio" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">
                <ArrowLeft size={18} aria-hidden="true" />
              </Link>
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Skills</h1>
            </div>
            {searchOpen ? (
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search skills"
                aria-label="Search skills"
                className="h-10 w-full max-w-xs rounded-lg border border-white/10 bg-[#1A1A1A] px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#195A9F]"
              />
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search skills" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">
                <Search size={18} aria-hidden="true" />
              </button>
            )}
          </header>

          <button type="button" onClick={() => setSelectedTab("All")} className="mb-6 flex min-h-[116px] w-full items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#1A1A1A] p-5 text-left transition hover:border-white/15 hover:bg-[#1D1D1D] sm:p-6">
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-medium text-white">Explore more skills <ChevronRight size={15} aria-hidden="true" /></span>
              <span className="mt-2 block max-w-xl text-sm leading-6 text-white/55">Ready-to-use skills that give your agents focused tools and knowledge.</span>
            </span>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#131E2A] text-[#80B6E9]">
              <Compass size={25} aria-hidden="true" />
            </span>
          </button>

          <div role="tablist" aria-label="Filter skills" className="mb-5 flex gap-2 overflow-x-auto border-b border-white/[0.08] pb-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selectedTab === tab}
                onClick={() => setSelectedTab(tab)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition ${selectedTab === tab ? "bg-[#131E2A] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white"}`}
              >
                {tab}
                <span className={`text-xs ${selectedTab === tab ? "text-[#9CC7F0]" : "text-white/35"}`}>{activeTabCount(tab)}</span>
              </button>
            ))}
          </div>

          {loadError && (
            <div role="alert" className="mb-5 rounded-xl border border-[#5A4726] bg-[#241E13] px-4 py-3 text-sm leading-6 text-[#E9D5AA]">
              {loadError}
            </div>
          )}

          {loading ? (
            <div role="status" className="flex min-h-36 items-center justify-center text-sm text-white/45"><Loader2 size={18} className="mr-2 animate-spin" />Loading skills…</div>
          ) : loadError ? null : visibleSkills.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-[#151515] px-5 py-14 text-center">
              <Puzzle size={22} className="mx-auto text-white/35" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-medium">{searchQuery ? "No matching skills" : selectedTab === "Mine" ? "Your skills will appear here" : "No skills in this view yet"}</h2>
              <p className="mt-1 text-sm text-white/45">{searchQuery ? "Try another name, agent, or tool." : "Explore the catalog or import a skill to get started."}</p>
            </section>
          ) : (
            <section aria-label={`${selectedTab} skills`} className="space-y-3">
              {visibleSkills.map((skill) => {
                const membership = userSkillById.get(skill.id);
                const active = Boolean(membership?.is_active);
                const pending = pendingSkillIds.has(skill.id);
                return (
                  <article key={skill.id} className="rounded-2xl border border-white/[0.09] bg-[#171717] px-4 py-4 transition hover:border-white/[0.16] sm:px-5">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[15px] font-medium text-white">{skill.name}</h2>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-white/55">{skill.description}</p>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) => void changeSkillActive(skill, checked)}
                        disabled={pending || Boolean(loadError)}
                        aria-label={`${active ? "Disable" : "Enable"} ${skill.name}`}
                        className="mt-0.5 data-[state=checked]:bg-[#195A9F] data-[state=unchecked]:bg-[#3A3A3A]"
                      />
                    </div>
                    <div className="my-3 border-t border-white/[0.08]" />
                    <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
                      <ShieldCheck size={14} className={skill.is_official ? "text-[#83B5E5]" : "text-white/40"} aria-hidden="true" />
                      <span className={skill.is_official ? "text-[#9FC7EB]" : "text-white/55"}>{skill.is_official ? "Official" : "Community"}</span>
                      <span aria-hidden="true">·</span>
                      <span>{skill.agent}</span>
                      <span aria-hidden="true">·</span>
                      <span>{normalizeVersion(skill.version)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label={`${skill.name} options`} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-white/10 bg-[#202020] text-white">
                          <DropdownMenuItem disabled={!skill.github_url} onSelect={() => {
                            if (skill.github_url?.startsWith("https://github.com/")) window.open(skill.github_url, "_blank", "noopener,noreferrer");
                          }}>
                            <ExternalLink size={14} className="mr-2" aria-hidden="true" />View on GitHub
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem disabled={pending} onSelect={() => void changeSkillActive(skill, !active)}>
                            {active ? "Disable" : "Enable"}
                          </DropdownMenuItem>
                          {membership && <DropdownMenuItem disabled={pending} className="text-red-300 focus:text-red-200" onSelect={() => void removeSkillFromMine(skill)}>Remove from Mine</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>

      <input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Upload a skill manifest" onChange={(event) => void handleSkillFile(event)} />
      <button type="button" onClick={() => { setActionView("actions"); setImportError(null); setActionsOpen(true); }} aria-label="Create or import a skill" className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#195A9F] text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition hover:bg-[#246BAF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <Plus size={24} aria-hidden="true" />
      </button>

      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-white/10 bg-[#171717] pb-[calc(env(safe-area-inset-bottom)+24px)] text-white">
          {actionView === "actions" ? (
            <>
              <SheetHeader className="mb-5 pr-8 text-left">
                <SheetTitle className="text-white">Add a skill</SheetTitle>
                <SheetDescription className="text-white/50">Create, upload, or bring in a skill for your workspace.</SheetDescription>
              </SheetHeader>
              <div className="mx-auto max-w-xl space-y-2">
                <button type="button" disabled className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left opacity-65">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/60"><WandSparkles size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Create with NexoraOS</span><span className="mt-0.5 block text-xs text-white/40">Coming soon</span></span>
                </button>
                <button type="button" onClick={() => { setActionsOpen(false); fileInputRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition hover:bg-white/[0.06]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/70"><Upload size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Upload a skill</span><span className="mt-0.5 block text-xs text-white/40">Choose a .json manifest</span></span>
                </button>
                <button type="button" onClick={() => { setActionView("github"); setImportError(null); }} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition hover:bg-white/[0.06]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/70"><Github size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Import from GitHub</span><span className="mt-0.5 block text-xs text-white/40">Fetch skill.json from a public repository</span></span>
                  <ChevronRight size={16} className="text-white/35" />
                </button>
                <button type="button" onClick={() => { setSelectedTab("All"); setActionsOpen(false); }} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition hover:bg-white/[0.06]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/70"><Compass size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Explore skills</span><span className="mt-0.5 block text-xs text-white/40">Browse the full catalog</span></span>
                </button>
              </div>
            </>
          ) : (
            <>
              <SheetHeader className="mb-5 pr-8 text-left">
                <button type="button" onClick={() => { setActionView("actions"); setImportError(null); }} className="mb-2 inline-flex w-fit items-center gap-1 text-xs text-white/45 hover:text-white"><ArrowLeft size={14} />Back</button>
                <SheetTitle className="text-white">Import from GitHub</SheetTitle>
                <SheetDescription className="text-white/50">We’ll look for skill.json at the repository root on the main branch.</SheetDescription>
              </SheetHeader>
              <form onSubmit={(event) => void handleGithubImport(event)} className="mx-auto max-w-xl space-y-3">
                <label htmlFor="github-skill-url" className="text-xs font-medium text-white/65">GitHub repository URL</label>
                <input id="github-skill-url" type="url" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="h-11 w-full rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#195A9F]" />
                {importError && <p role="alert" className="rounded-lg border border-[#6A3E3E] bg-[#241717] px-3 py-2 text-xs leading-5 text-[#EABABA]">{importError}</p>}
                <button type="submit" disabled={isImporting || !githubUrl.trim()} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#195A9F] px-4 text-sm font-medium text-white transition hover:bg-[#246BAF] disabled:cursor-not-allowed disabled:opacity-50">
                  {isImporting ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
                  {isImporting ? "Importing…" : "Fetch skill.json"}
                </button>
                <p className="text-xs leading-5 text-white/35">Only the manifest is fetched. Skill tools are metadata here and are not executed by this page.</p>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
