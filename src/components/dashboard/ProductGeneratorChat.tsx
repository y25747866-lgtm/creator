import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Menu,
  Plus,
  Plug,
  Puzzle,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useToast } from "@/hooks/use-toast";
import { Ebook, useEbookStore } from "@/hooks/useEbookStore";
import { supabase } from "@/integrations/supabase/client";
import { cacheLocalCreatorConversation, getLocalCreatorConversations, listCreatorConversations, loadCreatorConversation, readLocalCreatorConversation, saveCreatorConversation, type CreatorConversationSummary } from "@/lib/chatPersistence";
import { deleteCreatorMedia, refreshMediaLinks, saveGeneratedEbook, uploadCreatorMedia, type MediaAttachment } from "@/lib/ebookRepository";
import { generatePDF } from "@/lib/pdfGenerator";
import { recordMetric } from "@/lib/productTracking";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSidebarState } from "./DashboardLayout";
import ChatAuthPrompt from "@/components/auth/ChatAuthPrompt";
import { clearPendingChatTopic, readPendingChatTopic, savePendingChatTopic } from "@/lib/auth/pendingChat";
import { submitHybridTask, waitForHybridTask } from "@/lib/hybridAgent";
import ConnectorCatalog from "@/components/connectors/ConnectorCatalog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Template = {
  id: string;
  name: string;
  description: string;
  structure: string;
  tone: string;
};

type Chapter = { heading: string; body: string };
type MessageKind = "text" | "templates" | "progress" | "error" | "ready";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind: MessageKind;
  text: string;
  topic?: string;
  chapters?: Chapter[];
  totalChapters?: number;
  complete?: boolean;
  ebook?: Ebook;
  attachments?: MediaAttachment[];
};

const PRODUCT_TEMPLATES: Template[] = [
  {
    id: "essential-guide",
    name: "Essential guide",
    description: "A clear, approachable guide to the fundamentals.",
    structure: "A practical introduction, core principles, and next steps.",
    tone: "clear, encouraging, and practical",
  },
  {
    id: "action-plan",
    name: "Action plan",
    description: "Turn the topic into a sequence of doable steps.",
    structure: "A step-by-step plan with milestones, prompts, and a recap.",
    tone: "direct, energizing, and action-oriented",
  },
  {
    id: "workbook",
    name: "Guided workbook",
    description: "Reflective exercises and useful takeaways.",
    structure: "Short teaching sections followed by reflection and exercises.",
    tone: "warm, thoughtful, and supportive",
  },
  {
    id: "playbook",
    name: "Quick-start playbook",
    description: "A focused route from first move to first result.",
    structure: "A quick-start framework, prioritized tactics, and a checklist.",
    tone: "confident, concise, and useful",
  },
  {
    id: "field-manual",
    name: "Field manual",
    description: "A dependable reference for real-world use.",
    structure: "Core concepts, common situations, examples, and references.",
    tone: "expert, grounded, and precise",
  },
  {
    id: "deep-dive",
    name: "Deep-dive handbook",
    description: "A more comprehensive treatment of the subject.",
    structure: "An in-depth explanation, frameworks, examples, and synthesis.",
    tone: "insightful, nuanced, and professional",
  },
];

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.text === "string" &&
    ["text", "templates", "progress", "error", "ready"].includes(String(message.kind));
}

function parseChapters(markdown: string, title: string): Chapter[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const chapters: Chapter[] = [];
  let heading = "";
  let body: string[] = [];
  const flush = () => {
    const cleanedBody = body.join("\n").trim();
    if (heading && (cleanedBody || chapters.length === 0)) {
      chapters.push({ heading, body: cleanedBody });
    }
  };

  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1].trim();
      body = [];
    } else {
      body.push(line);
    }
  }
  flush();

  const withoutCoverTitle = chapters.filter((chapter, index) =>
    !(index === 0 && chapter.heading.toLocaleLowerCase() === title.toLocaleLowerCase() && !chapter.body),
  );
  return withoutCoverTitle.length > 0
    ? withoutCoverTitle
    : [{ heading: "Your guide", body: markdown.trim() }];
}

function estimatePages(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 420) + 2);
}

const ProductGeneratorChat = () => {
  const { user, loading: authLoading, sendMagicLink } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { setMobileOpen } = useSidebarState();
  const { recordUsage, hasPaidSubscription, isExpired } = useFeatureAccess();
  const { toast } = useToast();
  const addEbook = useEbookStore((state) => state.addEbook);
  const [activeProduct, setActiveProduct] = useState<string>("Ebook");
  const [activeSystem, setActiveSystem] = useState<"product-generator" | "hybrid-agentic">("product-generator");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [connectorPanelOpen, setConnectorPanelOpen] = useState(false);
  const [capabilityMenuOpen, setCapabilityMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MediaAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [recentTasks, setRecentTasks] = useState<CreatorConversationSummary[]>([]);
  const [showRecentTasks, setShowRecentTasks] = useState(false);
  const [showSkillsStatus, setShowSkillsStatus] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const capabilitySelectorRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const generationLock = useRef(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const hasConversation = messages.length > 0;

  useEffect(() => {
    if (!capabilityMenuOpen) return;
    const closeOnOutsideInteraction = (event: Event) => {
      if (capabilitySelectorRef.current && !capabilitySelectorRef.current.contains(event.target as Node)) {
        setCapabilityMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("touchstart", closeOnOutsideInteraction, { passive: true });
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("touchstart", closeOnOutsideInteraction);
    };
  }, [capabilityMenuOpen]);

  useEffect(() => {
    if (!user?.id || !messages.length) return;
    const conversationId = activeConversationIdRef.current ?? makeId();
    activeConversationIdRef.current = conversationId;
    const title = messages.find((message) => message.role === "user")?.text?.trim().slice(0, 120) || "New chat";
    const snapshot = messages;
    try {
      cacheLocalCreatorConversation(user.id, conversationId, title, snapshot);
    } catch { /* local caching is only a backup */ }
    const timer = window.setTimeout(() => {
      void saveCreatorConversation(user.id, conversationId, title, snapshot).then(() => {
        window.dispatchEvent(new Event("nexoraos:history-updated"));
      }).catch((reason) => console.warn("Chat history remains in the local backup until Supabase is available:", reason));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [messages, user?.id]);

  useEffect(() => {
    if (!user?.id) { setRecentTasks([]); return; }
    let cancelled = false;
    const readRecentTasks = async () => {
      const localItems = getLocalCreatorConversations(user.id);
      try {
        const remoteItems = await listCreatorConversations(user.id);
        if (cancelled) return;
        const merged = new Map(remoteItems.map((item) => [item.id, item]));
        for (const item of localItems) if (!merged.has(item.id)) merged.set(item.id, item);
        setRecentTasks([...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5));
      } catch {
        if (!cancelled) setRecentTasks(localItems.slice(0, 5));
      }
    };
    void readRecentTasks();
    window.addEventListener("storage", readRecentTasks);
    window.addEventListener("nexoraos:history-updated", readRecentTasks);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", readRecentTasks);
      window.removeEventListener("nexoraos:history-updated", readRecentTasks);
    };
  }, [user?.id]);

  useEffect(() => {
    const requestedId = new URLSearchParams(location.search).get("conversation");
    if (!requestedId || !user?.id) return;
    let cancelled = false;
    setHistoryLoading(true);
    void (async () => {
      let rawMessages: unknown[] = [];
      try {
        if (requestedId === "legacy") throw new Error("Load legacy browser history");
        rawMessages = await loadCreatorConversation(user.id, requestedId);
      } catch {
        rawMessages = readLocalCreatorConversation(user.id, requestedId);
      }
      const validMessages = rawMessages.filter(isChatMessage);
      const withFreshLinks = await Promise.all(validMessages.map(async (message) => ({
        ...message,
        attachments: message.attachments?.length ? await refreshMediaLinks(message.attachments) : message.attachments,
      })));
      if (!cancelled) {
        activeConversationIdRef.current = requestedId === "legacy" ? null : requestedId;
        setMessages(withFreshLinks);
        setDraft("");
        setSelectedTemplate(null);
      }
    })().catch((reason) => {
      if (!cancelled) toast({ title: "Could not open chat", description: reason instanceof Error ? reason.message : "This conversation is unavailable.", variant: "destructive" });
    }).finally(() => {
      if (!cancelled) {
        setHistoryLoading(false);
        navigate("/dashboard", { replace: true });
      }
    });
    return () => { cancelled = true; };
  }, [location.search, navigate, toast, user?.id]);

  const persistCurrentConversation = useCallback(() => {
    if (!user?.id || !messages.length) return;
    const conversationId = activeConversationIdRef.current ?? makeId();
    activeConversationIdRef.current = conversationId;
    const title = messages.find((message) => message.role === "user")?.text?.trim().slice(0, 120) || "New chat";
    try { cacheLocalCreatorConversation(user.id, conversationId, title, messages); } catch { /* cache is optional */ }
    void saveCreatorConversation(user.id, conversationId, title, messages).then(() => {
      window.dispatchEvent(new Event("nexoraos:history-updated"));
    }).catch((reason) => console.warn("Could not sync chat history yet:", reason));
  }, [messages, user?.id]);

  useEffect(() => {
    const handleNewChat = () => {
      if (generationLock.current) return;
      persistCurrentConversation();
      clearPendingChatTopic();
      for (const attachment of pendingAttachments) void deleteCreatorMedia(attachment.path).catch(() => undefined);
      activeConversationIdRef.current = null;
      setMessages([]);
      setPendingAttachments([]);
      setDraft("");
      setActiveProduct("Ebook");
      setSelectedTemplate(null);
      composerRef.current?.focus();
    };
    window.addEventListener("nexoraos:new-chat", handleNewChat);
    return () => window.removeEventListener("nexoraos:new-chat", handleNewChat);
  }, [persistCurrentConversation, pendingAttachments]);

  useEffect(() => {
    const container = conversationRef.current;
    if (container && hasConversation) {
      container.scrollTo?.({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages, hasConversation]);

  useEffect(() => {
    if (authLoading) return;
    const pendingTopic = readPendingChatTopic();
    if (!pendingTopic) return;

    if (user?.id) {
      clearPendingChatTopic();
      setAuthPromptOpen(false);
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "user", kind: "text", text: pendingTopic },
        {
          id: makeId(),
          role: "assistant",
          kind: "templates",
          text: "Choose a starting point. You can refine the ebook after it’s created.",
          topic: pendingTopic,
        },
      ]);
      setDraft("");
      if (composerRef.current) composerRef.current.style.height = "auto";
      setSelectedTemplate(null);
      return;
    }

    setAuthPromptOpen(true);
  }, [authLoading, user?.id]);

  const resizeComposer = () => {
    const element = composerRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  };

  const handleMediaSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    setAttachmentMenuOpen(false);
    if (!user?.id) {
      setAuthPromptOpen(true);
      return;
    }
    const attachedInConversation = messages.reduce((total, message) => total + (message.attachments?.length ?? 0), 0);
    const remainingSlots = Math.max(0, 5 - attachedInConversation - pendingAttachments.length);
    if (remainingSlots === 0) {
      toast({ title: "Attachment limit reached", description: "A conversation can contain up to five uploaded files.", variant: "destructive" });
      return;
    }
    const selectedFiles = files.slice(0, remainingSlots);
    if (selectedFiles.length < files.length) toast({ title: "Some files were skipped", description: "A conversation can contain up to five uploaded files." });
    setIsUploading(true);
    for (const file of selectedFiles) {
      try {
        const uploaded = await uploadCreatorMedia(file, user.id);
        setPendingAttachments((current) => [...current, uploaded]);
      } catch (reason) {
        toast({ title: "Upload failed", description: reason instanceof Error ? reason.message : "Check the file and try again.", variant: "destructive" });
      }
    }
    setIsUploading(false);
  };

  const removePendingAttachment = async (attachment: MediaAttachment) => {
    setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id));
    try { await deleteCreatorMedia(attachment.path); } catch { /* the chat does not depend on a cleanup retry */ }
  };

  const submitTopic = (event?: FormEvent) => {
    event?.preventDefault();
    if (generationLock.current || !draft.trim()) return;
    const topic = draft.trim();

    if (topic.length > 500) {
      toast({ title: "Topic is too long", description: "Keep the ebook topic to 500 characters or fewer.", variant: "destructive" });
      return;
    }

    if (authLoading || !user) {
      if (!savePendingChatTopic(topic)) {
        toast({
          title: "Draft could not be saved",
          description: "Allow local browser storage so your message can be restored after sign-in.",
          variant: "destructive",
        });
        return;
      }
      if (!authLoading) setAuthPromptOpen(true);
      return;
    }

    clearPendingChatTopic();
    const attachments = pendingAttachments;
    setPendingAttachments([]);
    setAttachmentMenuOpen(false);
    if (activeSystem === "hybrid-agentic") {
      const progressId = makeId();
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "user", kind: "text", text: topic, attachments },
        { id: progressId, role: "assistant", kind: "progress", text: "Connecting to the Hybrid Agentic System…", complete: false },
      ]);
      setDraft("");
      if (composerRef.current) composerRef.current.style.height = "auto";
      generationLock.current = true;
      setIsGenerating(true);
      void (async () => {
        try {
          const { taskId } = await submitHybridTask(topic);
          replaceMessage(progressId, { text: "NEXUS accepted the task. Recovering durable agent status…" });
          const task = await waitForHybridTask(taskId);
          if (task.status === "error") throw new Error("The Hybrid Agentic System reported an error while processing this task.");
          replaceMessage(progressId, { text: "Hybrid task completed. Review the returned agent result in the service workspace.", complete: true });
        } catch (error) {
          replaceMessage(progressId, { kind: "error", text: error instanceof Error ? error.message : "Hybrid Agentic System is unavailable." });
        } finally {
          generationLock.current = false;
          setIsGenerating(false);
        }
      })();
      return;
    }
    setMessages((current) => [
      ...current,
      { id: makeId(), role: "user", kind: "text", text: topic, attachments },
      {
        id: makeId(),
        role: "assistant",
        kind: "templates",
        text: "Choose a starting point. You can refine the ebook after it’s created.",
        topic,
      },
    ]);
    setDraft("");
    if (composerRef.current) composerRef.current.style.height = "auto";
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitTopic();
    }
  };

  const replaceMessage = (messageId: string, update: Partial<ChatMessage>) => {
    setMessages((current) => current.map((message) =>
      message.id === messageId ? { ...message, ...update } : message,
    ));
  };

  const beginGeneration = async (template: Template, topic: string) => {
    if (generationLock.current || isGenerating || activeSystem !== "product-generator") return;
    if (authLoading || !user) {
      if (savePendingChatTopic(topic)) setAuthPromptOpen(true);
      else toast({ title: "Sign-in required", description: "Your topic could not be saved locally. Please allow browser storage before continuing.", variant: "destructive" });
      return;
    }

    generationLock.current = true;
    setIsGenerating(true);
    setSelectedTemplate(template.id);

    const progressId = makeId();
    setMessages((current) => [
      ...current,
      {
        id: progressId,
        role: "assistant",
        kind: "progress",
        text: "Preparing your ebook request…",
        chapters: [],
        complete: false,
      },
    ]);

    try {
      const allowed = await recordUsage("ebook_generator");
      if (!allowed) {
        replaceMessage(progressId, {
          kind: "error",
          text: "Your current plan limit was reached. You can review your plan or try again when access is available.",
        });
        return;
      }

      replaceMessage(progressId, { text: "Sending the brief to the ebook generator…" });
      const title = `${template.name}: ${topic}`;
      const { data, error } = await supabase.functions.invoke("generate-ebook-content", {
        body: {
          topic,
          title,
          description: `${template.description} Structure: ${template.structure}`,
          length: "medium",
          category: "Digital product ebook",
          targetAudience: "Readers interested in the topic",
          tone: template.tone,
        },
      });

      if (error) throw new Error(error.message || "The ebook service could not complete the request.");
      const content = typeof data?.content === "string" ? data.content.trim() : "";
      if (!content) throw new Error("The ebook service returned no content. Please try again later.");
      if (/this is a placeholder for the ebook content|configure your groq_api_key/i.test(content)) {
        throw new Error("The connected Edge Function returned setup placeholder text rather than a generated ebook. No file was saved.");
      }

      const finalTitle = typeof data?.title === "string" && data.title.trim() ? data.title.trim() : title;
      const chapters = parseChapters(content, finalTitle);
      const ebookDraft: Omit<Ebook, "id" | "dbProductId"> = {
        title: finalTitle,
        topic,
        description: template.description,
        content,
        coverImageUrl: null,
        pages: estimatePages(content),
        length: "medium",
        createdAt: new Date().toISOString(),
        userId: user.id,
      };
      const ebook = await saveGeneratedEbook(ebookDraft, user.id);
      addEbook(ebook);

      replaceMessage(progressId, {
        text: "The generator returned a manuscript. Preparing its chapters for the conversation…",
        chapters: [],
        totalChapters: chapters.length,
      });
      for (let index = 0; index < chapters.length; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 110));
        replaceMessage(progressId, {
          text: `Preparing chapter ${index + 1} of ${chapters.length}`,
          chapters: chapters.slice(0, index + 1),
          totalChapters: chapters.length,
          complete: index === chapters.length - 1,
        });
      }

      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          kind: "ready",
          text: "Your ebook is ready to export.",
          ebook,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong while generating the ebook.";
      replaceMessage(progressId, {
        kind: "error",
        text: message,
      });
      setSelectedTemplate(null);
    } finally {
      generationLock.current = false;
      setIsGenerating(false);
    }
  };

  const downloadEbook = async (ebook: Ebook) => {
    if (authLoading) {
      toast({ title: "Checking sign-in", description: "Please try the download again in a moment." });
      return;
    }
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    if (!hasPaidSubscription || isExpired) {
      toast({
        title: "Upgrade required",
        description: isExpired
          ? "Your subscription has expired. Renew to export downloads."
          : "PDF downloads are available on Creator and Pro plans.",
        variant: "destructive",
      });
      return;
    }
    try {
      await generatePDF(ebook);
      if (ebook.dbProductId) void recordMetric(ebook.dbProductId, "download");
      toast({ title: "PDF exported", description: "Your ebook download has started." });
    } catch {
      toast({ title: "Export failed", description: "We couldn’t create the PDF. Please try again.", variant: "destructive" });
    }
  };

  const startNewChat = () => {
    if (isGenerating) return;
    persistCurrentConversation();
    clearPendingChatTopic();
    for (const attachment of pendingAttachments) void deleteCreatorMedia(attachment.path).catch(() => undefined);
    activeConversationIdRef.current = null;
    setMessages([]);
    setPendingAttachments([]);
    setDraft("");
    setActiveProduct("Ebook");
    setSelectedTemplate(null);
    composerRef.current?.focus();
  };

  return (
    <div className="nexora-chat-workspace relative flex h-[100dvh] min-h-[560px] flex-col overflow-hidden" style={{ background: "#121212", color: "#F5F5F5" }}>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#292929] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation drawer"
            onClick={() => setMobileOpen(true)}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-[#B2B2B2] transition hover:bg-[#1F1F1F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] md:hidden"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          {hasConversation && messages[0]?.role === "user" && (
            <span className="text-sm text-[#C9C9C9] truncate max-w-[200px] sm:max-w-[400px]">
              {messages[0].text?.slice(0, 50)}{(messages[0].text?.length ?? 0) > 50 ? "…" : ""}
            </span>
          )}
        </div>
        {hasConversation && (
          <button
            type="button"
            onClick={startNewChat}
            disabled={isGenerating}
            className="rounded-lg px-3 py-2 text-sm text-[#A0A0A0] transition hover:bg-[#1F1F1F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            New chat
          </button>
        )}
      </header>

      <div ref={conversationRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!hasConversation ? (
          <section className="mx-auto flex h-full min-h-full w-full max-w-[800px] items-center justify-center px-5 sm:px-8" aria-label="New conversation">
            {historyLoading && <p role="status" className="text-xs text-[#8B8B8B]">Opening saved conversation…</p>}
          </section>
        ) : (
          <section className="mx-auto flex w-full max-w-[800px] flex-col gap-7 px-4 py-8 sm:px-8 sm:py-10" aria-label="Conversation" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {message.role === "user" ? (
                  <div className="max-w-[88%] rounded-2xl rounded-br-md bg-[#1F1F1F] px-4 py-3 text-[15px] leading-6 text-[#F2F2F2] sm:max-w-[78%] sm:px-5">
                    {message.text}
                    {message.attachments?.length ? (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {message.attachments.map((attachment) => (
                          <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noreferrer" download={attachment.name} className="overflow-hidden rounded-lg border border-white/10 bg-black/20 text-xs text-[#D3D3D3]">
                            {attachment.signedUrl && attachment.mimeType.startsWith("image/") ? <img src={attachment.signedUrl} alt={attachment.name} className="max-h-52 w-full object-cover" /> : null}
                            {attachment.signedUrl && attachment.mimeType.startsWith("video/") ? <video src={attachment.signedUrl} controls preload="metadata" className="max-h-52 w-full bg-black" aria-label={attachment.name} /> : null}
                            {attachment.mimeType === "application/pdf" ? <span className="flex items-center gap-2 px-3 py-3 text-[#D9D9D9]"><FileText size={15} className="shrink-0 text-[#8BB8E8]" aria-hidden="true" />PDF document</span> : null}
                            <span className="block truncate px-2.5 py-2">{attachment.name}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="w-full max-w-full sm:max-w-[92%]">
                    {message.kind === "templates" && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#313131] bg-[#1F1F1F] text-white">
                            <Sparkles size={14} aria-hidden="true" />
                          </span>
                          <div className="pt-1">
                            <p className="text-sm leading-6 text-[#DEDEDE]">{message.text}</p>
                            <p className="mt-1 text-xs text-[#777]">Six formats · choose one to begin</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {PRODUCT_TEMPLATES.map((template, index) => {
                            const selected = selectedTemplate === template.id;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => message.topic && beginGeneration(template, message.topic)}
                                disabled={isGenerating || (selectedTemplate !== null && !selected)}
                                className={`group rounded-xl border p-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] disabled:cursor-not-allowed disabled:opacity-65 ${selected ? "border-[#195A9F]/60 bg-[#131E2A]" : "border-[#1F1F1F] bg-[#1F1F1F] hover:border-[#545454] hover:bg-[#131E2A]"}`}
                                aria-pressed={selected}
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#333] bg-[#1F1F1F] text-[#B8B8B8] transition group-hover:text-[#195A9F]">
                                    {selected ? <Check size={15} /> : <FileText size={15} />}
                                  </span>
                                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#737373]">0{index + 1}</span>
                                </div>
                                <span className="block text-sm font-medium text-[#F0F0F0]">{template.name}</span>
                                <span className="mt-1.5 block text-xs leading-5 text-[#929292]">{template.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {message.kind === "progress" && (
                      <div className="rounded-2xl border border-[#2D2D2D] bg-[#1F1F1F] p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#353535] bg-[#1F1F1F] text-[#195A9F]">
                            {message.complete ? <Check size={15} /> : <Loader2 size={15} className="animate-spin" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#EAEAEA]">{message.complete ? "Chapter preparation complete" : "Creating your ebook"}</p>
                            <p className="mt-1 text-xs leading-5 text-[#898989]" aria-live="polite">{message.text}</p>
                          </div>
                          {message.totalChapters && (
                            <span className="shrink-0 rounded-full border border-[#343434] px-2.5 py-1 text-[10px] text-[#929292]">
                              {message.chapters?.length ?? 0} / {message.totalChapters}
                            </span>
                          )}
                        </div>
                        {message.totalChapters ? (
                          <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#303030]" aria-hidden="true">
                            <div className="h-full rounded-full bg-[#195A9F] transition-[width] duration-300" style={{ width: `${((message.chapters?.length ?? 0) / message.totalChapters) * 100}%` }} />
                          </div>
                        ) : null}
                        {(message.chapters ?? []).map((chapter, index) => (
                          <article key={`${message.id}-${index}`} className="mt-5 border-t border-[#2E2E2E] pt-4">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D0D0D0]">Chapter {index + 1}</p>
                            <h3 className="text-base font-medium tracking-tight text-[#F2F2F2]">{chapter.heading}</h3>
                            {chapter.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#B0B0B0]">{chapter.body}</p>}
                          </article>
                        ))}
                      </div>
                    )}

                    {message.kind === "error" && (
                      <div role="alert" className="rounded-xl border border-[#353535] bg-[#1F1F1F] p-4 text-sm leading-6 text-[#D0D0D0]">
                        <p className="font-medium text-[#F5F5F5]">The ebook wasn’t created</p>
                        <p className="mt-1 text-[#929292]">{message.text}</p>
                      </div>
                    )}

                    {message.kind === "ready" && message.ebook && (
                      <div className="rounded-2xl border border-[#353535] bg-[#1F1F1F] p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#353535] bg-[#1F1F1F] text-[#195A9F]">
                            <BookOpen size={16} aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#F5F5F5]">{message.text}</p>
                            <h3 className="mt-1 truncate text-[15px] font-medium text-[#F5F5F5]">{message.ebook.title}</h3>
                            <p className="mt-2 text-xs text-[#929292]">PDF · about {message.ebook.pages} pages · saved to Downloads</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void downloadEbook(message.ebook!)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#121212] transition hover:bg-[#E9E9E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]"
                          >
                            <Download size={15} aria-hidden="true" />
                            Download PDF
                          </button>
                          <Link
                            to="/dashboard/downloads"
                            className="inline-flex min-h-10 items-center rounded-lg border border-[#353535] px-4 text-sm text-[#D0D0D0] transition hover:bg-[#1F1F1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]"
                          >
                            Open Downloads
                          </Link>
                        </div>
                      </div>
                    )}

                    {message.kind === "text" && <p className="text-sm leading-6 text-[#DEDEDE]">{message.text}</p>}
                  </div>
                )}
              </div>
            ))}
            <div className="h-2 shrink-0" aria-hidden="true" />
          </section>
        )}
      </div>

      <div className={hasConversation ? "sticky bottom-0 z-10 w-full shrink-0 bg-[#121212] px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+20px)]" : "absolute left-0 right-0 top-1/2 z-10 w-full -translate-y-1/2 px-3 sm:px-6"}>
        <div className="mx-auto w-full max-w-[800px]">
          <form onSubmit={submitTopic} className="relative min-h-[120px] rounded-[24px] border border-[#353535] bg-[#1F1F1F] px-6 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition focus-within:border-[#4A4A4A]">
            <label htmlFor="nexora-topic-composer" className="sr-only">Describe the ebook topic</label>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleMediaSelection} className="sr-only" aria-label="Capture a photo" />
            <input ref={pictureInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,video/ogg" onChange={handleMediaSelection} className="sr-only" aria-label="Choose pictures or videos" />
            <input ref={fileInputRef} type="file" multiple accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,video/ogg" onChange={handleMediaSelection} className="sr-only" aria-label="Upload image, video, or PDF files" />
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3 sm:px-5" aria-label="Pending attachments">
                {pendingAttachments.map((attachment) => (
                  <span key={attachment.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] text-[#C8C8C8]">
                    {attachment.mimeType.startsWith("video/") ? <Video size={13} /> : attachment.mimeType === "application/pdf" ? <FileText size={13} /> : <ImageIcon size={13} />}
                    <span className="max-w-36 truncate">{attachment.name}</span>
                    <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => void removePendingAttachment(attachment)} className="ml-1 rounded p-0.5 text-[#8E8E8E] hover:bg-white/10 hover:text-white"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <p id="composer-hint" className="sr-only">Press Enter to send. Press Shift and Enter to add a new line.</p>
            <div className="flex items-end gap-1.5 sm:gap-2">
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setAttachmentMenuOpen((open) => !open); setConnectorPanelOpen(false); setCapabilityMenuOpen(false); }}
                  aria-label="Add to chat"
                  aria-expanded={attachmentMenuOpen}
                  aria-haspopup="dialog"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9B9B9B] transition hover:bg-[#2B2B2B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]"
                >
                  <Plus size={19} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => { setConnectorPanelOpen((open) => !open); setAttachmentMenuOpen(false); setCapabilityMenuOpen(false); }}
                  aria-label="Open workspace capabilities"
                  aria-expanded={connectorPanelOpen}
                  aria-haspopup="dialog"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9B9B9B] transition hover:bg-[#2B2B2B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]"
                >
                  <Plug size={17} aria-hidden="true" />
                </button>
              </div>
              <textarea
                id="nexora-topic-composer"
                ref={composerRef}
                rows={1}
                maxLength={500}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  resizeComposer();
                }}
                onKeyDown={handleComposerKeyDown}
                disabled={isGenerating || isUploading}
                placeholder={activeSystem === "product-generator" ? "What do you want to create today?" : "What do you want your agents to do?"}
                className="block max-h-40 min-h-[60px] min-w-0 flex-1 resize-none bg-transparent text-[16px] leading-[1.6] text-[#F5F5F5] outline-none placeholder:text-[#777] disabled:opacity-60"
                aria-describedby="composer-hint"
              />
              <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
                <div ref={capabilitySelectorRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setCapabilityMenuOpen((open) => !open); setAttachmentMenuOpen(false); setConnectorPanelOpen(false); }}
                    aria-haspopup="menu"
                    aria-expanded={capabilityMenuOpen}
                    aria-label={`Product mode: ${activeSystem === "product-generator" ? "AI Product Generator" : "Hybrid Agentic System"}`}
                    className="flex h-9 max-w-[47px] items-center gap-1 rounded-xl px-1.5 text-xs font-medium text-[#B7B7B7] transition hover:bg-[#2B2B2B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] sm:max-w-[205px] sm:gap-2 sm:px-2.5"
                  >
                    <Sparkles size={14} className="shrink-0 text-[#195A9F]" aria-hidden="true" />
                    <span className="hidden truncate sm:inline">{activeSystem === "product-generator" ? "AI Product Generator" : "Hybrid Agentic System"}</span>
                    <ChevronDown size={13} className="shrink-0" aria-hidden="true" />
                  </button>
                  {capabilityMenuOpen && (
                    <div role="menu" aria-label="NexoraOS system selector" className="absolute bottom-12 right-0 z-20 w-[min(290px,calc(100vw-32px))] rounded-xl border border-[#393939] bg-[#1F1F1F] p-1.5 shadow-xl">
                      <button type="button" role="menuitemradio" aria-checked={activeSystem === "product-generator"} onClick={() => { setActiveSystem("product-generator"); setCapabilityMenuOpen(false); }} className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-[#EDEDED] hover:bg-[#1F1F1F]">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#195A9F]" />
                        <span><span className="block font-medium">AI Product Generator</span><span className="mt-0.5 block text-[10px] leading-4 text-[#929292]">Creates ebooks with the verified product workflow.</span></span>
                      </button>
                      <button type="button" role="menuitemradio" aria-checked={activeSystem === "hybrid-agentic"} onClick={() => { setActiveSystem("hybrid-agentic"); setCapabilityMenuOpen(false); }} className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-[#BDBDBD] hover:bg-[#1F1F1F]">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#777]" />
                        <span><span className="block font-medium">Hybrid Agentic System</span><span className="mt-0.5 block text-[10px] leading-4 text-[#929292]">Activate your NEXUS, SCOUT, FLUX, FORGE and APEX agents.</span></span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!draft.trim() || isGenerating || isUploading}
                  aria-label="Send topic"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] disabled:cursor-not-allowed ${draft.trim() && !isGenerating && !isUploading ? "bg-white text-[#111] hover:bg-[#E8E8E8]" : "bg-[#303030] text-[#777]"}`}
                >
                  {isGenerating ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={19} strokeWidth={2.4} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </form>

          <Sheet open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
            <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl border-[#303030] bg-[#171717] px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 text-white sm:px-6">
              <SheetHeader className="pr-9 text-left">
                <SheetTitle className="text-base text-white">Add to chat</SheetTitle>
                <SheetDescription className="text-xs leading-5 text-[#898989]">Private uploads: up to five files per conversation, 50 MB each. Pictures, videos, and PDF files are supported. The ebook generator currently uses your text brief, not uploaded media.</SheetDescription>
              </SheetHeader>

              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={isUploading} className="flex aspect-square min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1D1D1D] text-[#D4D4D4] transition hover:border-white/20 hover:bg-[#222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] disabled:opacity-50">
                  <Camera size={20} aria-hidden="true" />
                  <span className="text-xs font-medium">Camera</span>
                </button>
                <button type="button" onClick={() => pictureInputRef.current?.click()} disabled={isUploading} className="flex aspect-square min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1D1D1D] text-[#D4D4D4] transition hover:border-white/20 hover:bg-[#222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] disabled:opacity-50">
                  <ImageIcon size={20} aria-hidden="true" />
                  <span className="text-xs font-medium">Picture</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex aspect-square min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1D1D1D] text-[#D4D4D4] transition hover:border-white/20 hover:bg-[#222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F] disabled:opacity-50">
                  <FileText size={20} aria-hidden="true" />
                  <span className="text-xs font-medium">File</span>
                </button>
              </div>

              {isUploading && <p role="status" className="mt-3 text-center text-xs text-[#999]">Uploading privately…</p>}
              <div className="my-4 border-t border-white/10" />
              <div className="space-y-1">
                <Link to="/dashboard/downloads" onClick={() => setAttachmentMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#D0D0D0] transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">
                  <BookOpen size={17} className="text-[#949494]" aria-hidden="true" />
                  <span className="flex-1">Library</span>
                  <span className="text-[10px] text-[#777]">Downloads</span>
                </Link>
                <Link to="/dashboard/products" onClick={() => setAttachmentMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#D0D0D0] transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">
                  <FolderOpen size={17} className="text-[#949494]" aria-hidden="true" />
                  <span className="flex-1">Creations</span>
                  <span className="text-[10px] text-[#777]">Projects</span>
                </Link>
                <button type="button" onClick={() => { setShowRecentTasks((open) => !open); setShowSkillsStatus(false); }} aria-expanded={showRecentTasks} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[#D0D0D0] transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">
                  <Clock size={17} className="text-[#949494]" aria-hidden="true" />
                  <span className="flex-1">Recent tasks</span>
                  <span className="text-[10px] text-[#777]">{recentTasks.length ? recentTasks.length : "History"}</span>
                </button>
                {showRecentTasks && (
                  <div className="ml-9 space-y-1 border-l border-white/10 py-1 pl-2">
                    {recentTasks.length ? recentTasks.map((task) => (
                      <button key={task.id} type="button" title={task.title} onClick={() => { setAttachmentMenuOpen(false); navigate(`/dashboard?conversation=${encodeURIComponent(task.id)}`); }} className="block min-h-9 w-full truncate rounded-md px-2 text-left text-xs text-[#A8A8A8] transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">{task.title}</button>
                    )) : <p className="px-2 py-2 text-xs leading-5 text-[#777]">{user ? "No saved chats yet." : "Sign in to see recent chats."}</p>}
                  </div>
                )}
                <button type="button" onClick={() => { setShowSkillsStatus((open) => !open); setShowRecentTasks(false); }} aria-expanded={showSkillsStatus} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[#D0D0D0] transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195A9F]">
                  <Puzzle size={17} className="text-[#949494]" aria-hidden="true" />
                  <span className="flex-1">Skills</span>
                  <span className="text-[10px] text-[#777]">Workspace</span>
                </button>
                {showSkillsStatus && <p className="ml-9 rounded-md border-l border-white/10 py-2 pl-4 text-xs leading-5 text-[#777]">No workspace skills are configured in this preview yet.</p>}
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={connectorPanelOpen} onOpenChange={setConnectorPanelOpen}>
            <SheetContent side="bottom" className="!bottom-20 !left-1/2 !right-auto !top-auto !w-[min(680px,calc(100vw-32px))] !max-w-none -translate-x-1/2 max-h-[70dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1F1F1F] px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 text-white sm:px-6">
              <SheetHeader className="pr-9 text-left">
                <SheetTitle className="text-base text-white">Workspace capabilities</SheetTitle>
                <SheetDescription className="text-xs leading-5 text-[#898989]">Browse and connect the apps available to your workspace.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <ConnectorCatalog compact />
              </div>
            </SheetContent>
          </Sheet>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2" aria-label="Product type">
            {[
              { label: "Ebook", enabled: true },
              { label: "Course", enabled: false },
              { label: "Workbook", enabled: false },
              { label: "Template", enabled: false },
              { label: "Report", enabled: false },
            ].map((product) => (
              <button
                key={product.label}
                type="button"
                disabled={!product.enabled || isGenerating || activeSystem !== "product-generator"}
                aria-pressed={activeProduct === product.label}
                title={product.enabled ? "Create an ebook" : `${product.label} creation is not enabled yet`}
                onClick={() => {
                  setActiveProduct(product.label);
                  setAttachmentMenuOpen(false);
                  setCapabilityMenuOpen(false);
                  composerRef.current?.focus();
                }}
                className={`min-h-8 rounded-full border px-3 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${activeProduct === product.label ? "border-[#195A9F] bg-[#131E2A] text-white" : product.enabled ? "border-white/15 bg-transparent text-white/50 hover:border-white/25 hover:text-white" : "cursor-not-allowed border-white/10 bg-transparent text-white/25"}`}
              >
                {product.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] leading-4 text-[#656565]">AI-generated content should be reviewed before publishing.</p>
        </div>
      </div>
      <ChatAuthPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        pendingTopic={draft || readPendingChatTopic()}
        sendMagicLink={sendMagicLink}
      />
    </div>
  );
};

export default ProductGeneratorChat;
