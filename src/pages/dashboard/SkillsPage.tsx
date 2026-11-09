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
  Pencil,
  Plus,
  Puzzle,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

type SkillCategory = "Official" | "Personal" | "Third-party";
type SkillTab = "All" | SkillCategory;
type LocalSkill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  category: Exclude<SkillCategory, "Official">;
  active: boolean;
  updatedAt: string;
};
type SkillOverride = { name: string; description: string; instructions: string; updatedAt?: string; category?: Exclude<SkillCategory, "Official"> };
type LocalSkillsData = {
  customSkills: LocalSkill[];
  officialActive: Record<string, boolean>;
  hiddenIds: string[];
  overrides: Record<string, SkillOverride>;
};
type DisplaySkill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  category: SkillCategory;
  active: boolean;
  updatedAt: string;
  source: "official" | "catalog" | "local";
  pack?: SkillPack;
};
type SkillDatabaseError = { code?: string; message?: string };
type SkillsQuery<T> = PromiseLike<{ data: T[] | null; error: SkillDatabaseError | null }> & {
  select: (columns: string) => SkillsQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => SkillsQuery<T>;
  eq: (column: string, value: string) => SkillsQuery<T>;
  upsert: (value: Partial<UserSkill>, options?: { onConflict: string }) => PromiseLike<{ error: SkillDatabaseError | null }>;
  update: (value: Partial<UserSkill>) => SkillsQuery<T>;
  delete: () => SkillsQuery<T>;
  insert: (value: Record<string, unknown>) => { select: (columns: string) => { single: () => Promise<{ data: SkillPack | null; error: SkillDatabaseError | null }> } };
};
type SkillsDatabase = { from: (table: "skill_packs" | "user_skills") => SkillsQuery<SkillPack | UserSkill> };
const skillsDatabase = supabase as unknown as SkillsDatabase;
const tabs: SkillTab[] = ["All", "Official", "Personal", "Third-party"];
const uploadLimit = 1024 * 1024;
const BUILT_IN_SKILLS = [
  { id: "builtin-deep-research-engine", name: "Deep Research Engine", description: "Conduct thorough research with verified sources and citations.", instructions: "", updatedAt: "2026-11-09" },
  { id: "builtin-ebook-creation", name: "Ebook Creation", description: "Transform your expertise into a polished, structured ebook.", instructions: "", updatedAt: "2026-11-09" },
  { id: "builtin-marketing-strategy", name: "Marketing Strategy", description: "Create actionable marketing strategies for your digital products.", instructions: "", updatedAt: "2026-11-09" },
] as const;
const EMPTY_LOCAL_SKILLS: LocalSkillsData = { customSkills: [], officialActive: {}, hiddenIds: [], overrides: {} };

function readLocalSkills(key: string): LocalSkillsData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY_LOCAL_SKILLS;
    const parsed = JSON.parse(raw) as Partial<LocalSkillsData>;
    return {
      customSkills: Array.isArray(parsed.customSkills) ? parsed.customSkills : [],
      officialActive: parsed.officialActive && typeof parsed.officialActive === "object" ? parsed.officialActive : {},
      hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [],
      overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
    };
  } catch {
    return EMPTY_LOCAL_SKILLS;
  }
}

function formatUpdatedDate(value: string): string {
  if (!value) return "Updated in catalog";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Updated in catalog" : `Updated on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function friendlySkillError(error: unknown): string {
  const candidate = error as { code?: string; message?: string } | null;
  const message = candidate?.message ?? "";
  if (
    candidate?.code === "42P01"
    || candidate?.code === "PGRST205"
    || /skill_packs|user_skills/i.test(message)
  ) {
    return "The shared skills catalog is unavailable. Locally saved skills remain available.";
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
  const [actionView, setActionView] = useState<"create" | "actions" | "github">("create");
  const [githubUrl, setGithubUrl] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [editingSkill, setEditingSkill] = useState<DisplaySkill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<DisplaySkill | null>(null);
  const [skillDraft, setSkillDraft] = useState({ name: "", description: "", instructions: "", category: "Personal" as SkillCategory });
  const localStoreKey = `nexoraos.skills.${user?.id ?? "anonymous"}`;
  const [localStoreState, setLocalStoreState] = useState<{ key: string; data: LocalSkillsData } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalStoreState({ key: localStoreKey, data: readLocalSkills(localStoreKey) });
  }, [localStoreKey]);

  useEffect(() => {
    if (localStoreState?.key !== localStoreKey) return;
    try {
      localStorage.setItem(localStoreKey, JSON.stringify(localStoreState.data));
    } catch {
      // Keep the editor usable if this browser blocks local storage.
    }
  }, [localStoreKey, localStoreState]);

  const localData = localStoreState?.key === localStoreKey ? localStoreState.data : EMPTY_LOCAL_SKILLS;
  const updateLocalData = (update: (current: LocalSkillsData) => LocalSkillsData) => {
    setLocalStoreState((current) => current?.key === localStoreKey ? { key: localStoreKey, data: update(current.data) } : current);
  };

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
  const allSkills = useMemo(() => {
    const builtInNames = new Set(BUILT_IN_SKILLS.map((skill) => skill.name.toLowerCase()));
    const builtIns: DisplaySkill[] = BUILT_IN_SKILLS.map((skill) => ({
      ...skill,
      category: "Official",
      active: Boolean(localData.officialActive[skill.id]),
      source: "official",
    }));
    const catalog: DisplaySkill[] = skills
      .filter((skill) => !builtInNames.has(skill.name.trim().toLowerCase()))
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        instructions: "",
        category: skill.is_official ? "Official" : skill.github_url ? "Third-party" : "Personal",
        active: Boolean(userSkillById.get(skill.id)?.is_active),
        updatedAt: "",
        source: "catalog",
        pack: skill,
      }));
    const local: DisplaySkill[] = localData.customSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      category: skill.category,
      active: skill.active,
      updatedAt: skill.updatedAt,
      source: "local",
    }));
    return [...builtIns, ...catalog, ...local]
      .filter((skill) => !localData.hiddenIds.includes(skill.id))
      .map((skill) => ({ ...skill, ...localData.overrides[skill.id], category: localData.overrides[skill.id]?.category ?? skill.category }));
  }, [localData, skills, userSkillById]);

  const visibleSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allSkills.filter((skill) => {
      if (selectedTab !== "All" && skill.category !== selectedTab) return false;
      if (!query) return true;
      const searchable = [skill.name, skill.description, skill.instructions, skill.pack?.github_url ?? "", ...(skill.pack?.tools ?? []).map((tool) => typeof tool === "string" ? tool : JSON.stringify(tool))].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [allSkills, searchQuery, selectedTab]);

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

  const setDisplayedSkillActive = async (skill: DisplaySkill, isActive: boolean) => {
    if (skill.source === "catalog" && skill.pack) {
      await changeSkillActive(skill.pack, isActive);
      return;
    }
    if (skill.source === "official") {
      updateLocalData((current) => ({ ...current, officialActive: { ...current.officialActive, [skill.id]: isActive } }));
      return;
    }
    updateLocalData((current) => ({
      ...current,
      customSkills: current.customSkills.map((entry) => entry.id === skill.id ? { ...entry, active: isActive } : entry),
    }));
  };

  const openCreateSkill = () => {
    setEditingSkill(null);
    setSkillDraft({ name: "", description: "", instructions: "", category: "Personal" });
    setActionView("create");
    setActionsOpen(true);
  };

  const openEditSkill = (skill: DisplaySkill) => {
    setEditingSkill(skill);
    setSkillDraft({ name: skill.name, description: skill.description, instructions: skill.instructions, category: skill.category });
    setActionView("create");
    setActionsOpen(true);
  };

  const saveSkillDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = skillDraft.name.trim();
    const description = skillDraft.description.trim();
    const instructions = skillDraft.instructions.trim();
    if (!name || !description || !instructions) return;
    const updatedAt = new Date().toISOString();

    if (editingSkill) {
      if (editingSkill.source === "local") {
        updateLocalData((current) => ({
          ...current,
          customSkills: current.customSkills.map((entry) => entry.id === editingSkill.id
            ? { ...entry, name, description, instructions, category: skillDraft.category === "Third-party" ? "Third-party" : "Personal", updatedAt }
            : entry),
        }));
      } else {
        const override: SkillOverride = { name, description, instructions, updatedAt };
        if (editingSkill.category !== "Official") override.category = skillDraft.category === "Third-party" ? "Third-party" : "Personal";
        updateLocalData((current) => ({ ...current, overrides: { ...current.overrides, [editingSkill.id]: override } }));
      }
      toast({ title: "Skill updated", description: `${name} was updated in this browser.` });
    } else {
      const newSkill: LocalSkill = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        description,
        instructions,
        category: skillDraft.category === "Third-party" ? "Third-party" : "Personal",
        active: false,
        updatedAt,
      };
      updateLocalData((current) => ({ ...current, customSkills: [newSkill, ...current.customSkills] }));
      toast({ title: "Skill saved", description: `${name} was saved in this browser.` });
    }

    setActionsOpen(false);
    setEditingSkill(null);
    setSkillDraft({ name: "", description: "", instructions: "", category: "Personal" });
  };

  const confirmDeleteDisplayedSkill = () => {
    if (!deletingSkill) return;
    if (deletingSkill.source === "local") {
      updateLocalData((current) => ({ ...current, customSkills: current.customSkills.filter((entry) => entry.id !== deletingSkill.id) }));
    } else {
      updateLocalData((current) => ({ ...current, hiddenIds: current.hiddenIds.includes(deletingSkill.id) ? current.hiddenIds : [...current.hiddenIds, deletingSkill.id] }));
    }
    toast({ title: "Skill removed", description: `${deletingSkill.name} was removed from this browser.` });
    setDeletingSkill(null);
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
    if (tab === "All") return allSkills.length;
    return allSkills.filter((skill) => skill.category === tab).length;
  };

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[#080A0C] px-4 pb-28 pt-5 text-white sm:px-8 sm:pt-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-7 flex min-h-10 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/dashboard" aria-label="Back to Product Studio" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft size={18} aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Skills</h1>
                <p className="mt-1 text-xs leading-5 text-white/45">Organize reusable tools and instructions for your agent workflows.</p>
              </div>
            </div>
            {searchOpen ? (
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search skills"
                aria-label="Search skills"
                className="h-10 w-full max-w-xs rounded-lg border border-white/10 bg-[#1A1A1A] px-3 text-sm text-white caret-white outline-none placeholder:text-white/35 focus:border-[#8C96A3]"
              />
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search skills" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Search size={18} aria-hidden="true" />
              </button>
            )}
          </header>

          <section aria-label="Skill actions" className="mb-6 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
            <button type="button" onClick={() => setSelectedTab("All")} className="flex min-h-[88px] min-w-[210px] items-center gap-3 rounded-xl border border-white/10 bg-[#111318] p-4 text-left transition-colors hover:border-white/20 hover:bg-[#151820] sm:min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/65"><Compass size={17} aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-medium">Explore more skills</span><span className="mt-1 block text-xs leading-4 text-white/45">Browse the catalogue</span></span>
            </button>
            <button type="button" onClick={openCreateSkill} className="flex min-h-[88px] min-w-[210px] items-center gap-3 rounded-xl border border-white/10 bg-[#111318] p-4 text-left transition-colors hover:border-white/20 hover:bg-[#151820] sm:min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/65"><Plus size={17} aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-medium">Create your first skill</span><span className="mt-1 block text-xs leading-4 text-white/45">Save reusable instructions</span></span>
            </button>
            <button type="button" onClick={() => { setActionView("github"); setImportError(null); setActionsOpen(true); }} className="flex min-h-[88px] min-w-[210px] items-center gap-3 rounded-xl border border-white/10 bg-[#111318] p-4 text-left transition-colors hover:border-white/20 hover:bg-[#151820] sm:min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/65"><Github size={17} aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-medium">Import from GitHub</span><span className="mt-1 block text-xs leading-4 text-white/45">Fetch a public skill manifest</span></span>
            </button>
          </section>

          <div role="tablist" aria-label="Filter skills" className="mb-5 flex gap-2 overflow-x-auto border-b border-white/[0.08] pb-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selectedTab === tab}
                onClick={() => setSelectedTab(tab)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition ${selectedTab === tab ? "bg-[#F0F2F5] text-[#080A0C]" : "text-white/50 hover:bg-white/[0.06] hover:text-white"}`}
              >
                {tab}
                <span className={`text-xs ${selectedTab === tab ? "text-[#303640]" : "text-white/35"}`}>{activeTabCount(tab)}</span>
              </button>
            ))}
          </div>

          {loadError && (
            <div role="alert" className="mb-5 rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-sm leading-6 text-white/65">
              {loadError}
            </div>
          )}

          {loading ? (
            <div role="status" className="flex min-h-36 items-center justify-center text-sm text-white/45"><Loader2 size={18} className="mr-2 animate-spin" />Loading skills…</div>
          ) : visibleSkills.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-white/15 bg-[#111318] px-5 py-14 text-center">
              <Puzzle size={22} className="mx-auto text-white/35" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-medium">{searchQuery ? "No matching skills" : "No skills in this category"}</h2>
              <p className="mt-1 text-sm text-white/45">{searchQuery ? "Try a different name or description." : "Create a skill or choose another category."}</p>
            </section>
          ) : (
            <section aria-label={`${selectedTab} skills`} className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSkills.map((skill) => {
                const membership = userSkillById.get(skill.id);
                const active = skill.active;
                const pending = pendingSkillIds.has(skill.id);
                return (
                  <article key={skill.id} className="flex min-h-[210px] min-w-0 flex-col rounded-xl border border-white/10 bg-[#111318] p-3 transition-colors hover:border-white/20 sm:min-h-[220px] sm:rounded-2xl sm:p-4">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/65"><Puzzle size={16} aria-hidden="true" /></div>
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-sm font-medium leading-5 text-white">{skill.name}</h2>
                        <p className="mt-1 line-clamp-3 min-h-[52px] text-xs leading-[17px] text-white/50">{skill.description}</p>
                      </div>
                      <Switch
                        checked={active}
                        onCheckedChange={(checked) => void setDisplayedSkillActive(skill, checked)}
                        disabled={pending || (skill.source === "catalog" && Boolean(loadError)) || (skill.source !== "catalog" && localStoreState?.key !== localStoreKey)}
                        aria-label={`${active ? "Disable" : "Enable"} ${skill.name}`}
                        className="mt-0.5 shrink-0 data-[state=checked]:bg-[#F0F2F5] data-[state=unchecked]:bg-[#3A3A3A]"
                      />
                    </div>
                    <div className="mt-auto border-t border-white/[0.08] pt-3">
                      <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-white/45">
                        <ShieldCheck size={12} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{skill.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="min-w-0 truncate">{skill.source === "catalog" ? `Version ${normalizeVersion(skill.pack?.version)}` : formatUpdatedDate(skill.updatedAt)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`text-[10px] ${active ? "text-white/80" : "text-white/40"}`}>{active ? "Enabled" : "Disabled"}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label={`${skill.name} options`} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <MoreHorizontal size={17} aria-hidden="true" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-white/10 bg-[#111318] text-white">
                            {skill.pack?.github_url && <DropdownMenuItem onSelect={() => { if (skill.pack?.github_url?.startsWith("https://github.com/")) window.open(skill.pack.github_url, "_blank", "noopener,noreferrer"); }}><ExternalLink size={14} className="mr-2" aria-hidden="true" />View on GitHub</DropdownMenuItem>}
                            {skill.pack?.github_url && <DropdownMenuSeparator className="bg-white/10" />}
                            <DropdownMenuItem onSelect={() => openEditSkill(skill)}><Pencil size={14} className="mr-2" aria-hidden="true" />Edit</DropdownMenuItem>
                            <DropdownMenuItem disabled={pending} onSelect={() => void setDisplayedSkillActive(skill, !active)}>{active ? "Disable" : "Enable"}</DropdownMenuItem>
                            {membership && skill.pack && <DropdownMenuItem disabled={pending} onSelect={() => void removeSkillFromMine(skill.pack!)}>Remove from Mine</DropdownMenuItem>}
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onSelect={() => setDeletingSkill(skill)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>

      <input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Upload a skill manifest" onChange={(event) => void handleSkillFile(event)} />
      <button type="button" onClick={openCreateSkill} aria-label="New skill" title="New skill" className="fixed bottom-6 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#F0F2F5] text-[#080A0C] shadow-[0_6px_18px_rgba(0,0,0,0.28)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Plus size={24} aria-hidden="true" />
      </button>

      <Sheet open={actionsOpen} onOpenChange={(open) => { setActionsOpen(open); if (!open) setEditingSkill(null); }}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl border-white/10 bg-[#111318] pb-[calc(env(safe-area-inset-bottom)+24px)] text-white">
          {actionView === "create" ? (
            <>
              <SheetHeader className="mb-5 pr-8 text-left">
                <SheetTitle className="text-white">{editingSkill ? "Edit skill" : "Create a skill"}</SheetTitle>
                <SheetDescription className="text-white/50">Add reusable instructions for your workspace. Skills are saved in this browser.</SheetDescription>
              </SheetHeader>
              <form onSubmit={(event) => saveSkillDraft(event)} className="mx-auto max-w-xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs text-white/65">Name
                    <input required maxLength={80} value={skillDraft.name} onChange={(event) => setSkillDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Launch checklist" className="h-10 w-full rounded-lg border border-white/10 bg-[#080A0C] px-3 text-sm text-white outline-none placeholder:text-white/30 focus-visible:border-white/40" />
                  </label>
                  <label className="block space-y-1.5 text-xs text-white/65">Category
                    <select value={skillDraft.category} disabled={editingSkill?.category === "Official"} onChange={(event) => setSkillDraft((current) => ({ ...current, category: event.target.value as SkillCategory }))} className="h-10 w-full rounded-lg border border-white/10 bg-[#080A0C] px-3 text-sm text-white outline-none focus-visible:border-white/40 disabled:opacity-50">
                      {editingSkill?.category === "Official" ? <option value="Official">Official</option> : <><option value="Personal">Personal</option><option value="Third-party">Third-party</option></>}
                    </select>
                  </label>
                </div>
                <label className="block space-y-1.5 text-xs text-white/65">Description
                  <textarea required maxLength={300} rows={2} value={skillDraft.description} onChange={(event) => setSkillDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What does this skill help with?" className="w-full resize-y rounded-lg border border-white/10 bg-[#080A0C] px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/30 focus-visible:border-white/40" />
                </label>
                <label className="block space-y-1.5 text-xs text-white/65">Instructions
                  <textarea required maxLength={6000} rows={6} value={skillDraft.instructions} onChange={(event) => setSkillDraft((current) => ({ ...current, instructions: event.target.value }))} placeholder="Write the steps or rules the agent should follow" className="w-full resize-y rounded-lg border border-white/10 bg-[#080A0C] px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/30 focus-visible:border-white/40" />
                </label>
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button type="button" onClick={() => { setActionView("actions"); setImportError(null); }} className="mr-auto inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs text-white/55 hover:bg-white/[0.05] hover:text-white"><WandSparkles size={14} />More options</button>
                  <button type="button" onClick={() => { setActionsOpen(false); setEditingSkill(null); }} className="min-h-10 rounded-lg border border-white/15 px-4 text-sm text-white/70 hover:bg-white/[0.05]">Cancel</button>
                  <button type="submit" disabled={!skillDraft.name.trim() || !skillDraft.description.trim() || !skillDraft.instructions.trim()} className="min-h-10 rounded-lg bg-white px-4 text-sm font-medium text-[#080A0C] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45">{editingSkill ? "Save changes" : "Save skill"}</button>
                </div>
              </form>
            </>
          ) : actionView === "actions" ? (
            <>
              <SheetHeader className="mb-5 pr-8 text-left">
                <button type="button" onClick={() => setActionView("create")} className="mb-2 inline-flex w-fit items-center gap-1 text-xs text-white/45 hover:text-white"><ArrowLeft size={14} />Back to editor</button>
                <SheetTitle className="text-white">Other ways to add a skill</SheetTitle>
                <SheetDescription className="text-white/50">Import a JSON manifest or browse the shared catalog.</SheetDescription>
              </SheetHeader>
              <div className="mx-auto max-w-xl space-y-2">
                <button type="button" onClick={() => { setActionsOpen(false); fileInputRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#080A0C] px-4 py-3.5 text-left transition hover:bg-white/[0.04]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70"><Upload size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Upload a skill</span><span className="mt-0.5 block text-xs text-white/40">Choose a .json manifest</span></span>
                </button>
                <button type="button" onClick={() => { setActionView("github"); setImportError(null); }} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#080A0C] px-4 py-3.5 text-left transition hover:bg-white/[0.04]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70"><Github size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Import from GitHub</span><span className="mt-0.5 block text-xs text-white/40">Fetch skill.json from a public repository</span></span>
                  <ChevronRight size={16} className="text-white/35" />
                </button>
                <button type="button" onClick={() => { setSelectedTab("All"); setActionsOpen(false); }} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#080A0C] px-4 py-3.5 text-left transition hover:bg-white/[0.04]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70"><Compass size={17} /></span>
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
                <input id="github-skill-url" type="url" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="h-11 w-full rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-white caret-white outline-none placeholder:text-white/30 focus:border-[#8C96A3]" />
                {importError && <p role="alert" className="rounded-lg border border-white/10 bg-[#080A0C] px-3 py-2 text-xs leading-5 text-white/65">{importError}</p>}
                <button type="submit" disabled={isImporting || !githubUrl.trim()} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#F0F2F5] px-4 text-sm font-medium text-[#080A0C] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  {isImporting ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
                  {isImporting ? "Importing…" : "Fetch skill.json"}
                </button>
                <p className="text-xs leading-5 text-white/35">Only the manifest is fetched. Skill tools are metadata here and are not executed by this page.</p>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={Boolean(deletingSkill)} onOpenChange={(open) => !open && setDeletingSkill(null)}>
        <AlertDialogContent className="border-white/10 bg-[#111318] text-white">
          <AlertDialogHeader><AlertDialogTitle>Delete this skill?</AlertDialogTitle><AlertDialogDescription className="text-white/55">“{deletingSkill?.name}” will be removed from your Skills page on this browser.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="border-white/15 bg-transparent text-white hover:bg-white/[0.06]">Cancel</AlertDialogCancel><AlertDialogAction className="bg-white text-[#080A0C] hover:bg-white/90" onClick={(event) => { event.preventDefault(); confirmDeleteDisplayedSkill(); }}>Delete skill</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
