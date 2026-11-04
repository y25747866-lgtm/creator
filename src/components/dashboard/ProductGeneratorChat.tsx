import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Menu,
  Plus,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useToast } from "@/hooks/use-toast";
import { Ebook, useEbookStore } from "@/hooks/useEbookStore";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF } from "@/lib/pdfGenerator";
import { Link } from "react-router-dom";
import { useSidebarState } from "./DashboardLayout";
import ChatAuthPrompt from "@/components/auth/ChatAuthPrompt";
import { clearPendingChatTopic, readPendingChatTopic, savePendingChatTopic } from "@/lib/auth/pendingChat";
import { submitHybridTask, waitForHybridTask } from "@/lib/hybridAgent";

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
  const [capabilityMenuOpen, setCapabilityMenuOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const generationLock = useRef(false);
  const hasConversation = messages.length > 0;

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
    if (activeSystem === "hybrid-agentic") {
      const progressId = makeId();
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "user", kind: "text", text: topic },
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
      { id: makeId(), role: "user", kind: "text", text: topic },
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
      const { data, error } = await supabase.functions.invoke("generate-ebook", {
        body: {
          topic,
          title,
          description: `${template.description} Structure: ${template.structure}`,
          length: "medium",
          category: "Digital product ebook",
          targetAudience: "Readers interested in the topic",
          tone: template.tone,
          language: "English",
        },
      });

      if (error) throw new Error(error.message || "The ebook service could not complete the request.");
      const chapterContent = Array.isArray(data?.chapters)
        ? data.chapters
          .filter((chapter: unknown): chapter is { title?: unknown; content?: unknown } => typeof chapter === "object" && chapter !== null)
          .map((chapter) => `## ${typeof chapter.title === "string" ? chapter.title : "Chapter"}\n\n${typeof chapter.content === "string" ? chapter.content : ""}`)
          .join("\n\n")
        : "";
      const content = (typeof data?.content === "string" ? data.content : chapterContent).trim();
      if (!content) throw new Error("The ebook service returned no content. Please try again later.");
      if (/this is a placeholder for the ebook content|configure your groq_api_key/i.test(content)) {
        throw new Error("The connected Edge Function returned setup placeholder text rather than a generated ebook. No file was saved.");
      }

      const finalTitle = typeof data?.title === "string" && data.title.trim() ? data.title.trim() : title;
      const chapters = parseChapters(content, finalTitle);
      const ebook: Ebook = {
        id: makeId(),
        title: finalTitle,
        topic,
        description: template.description,
        content,
        coverImageUrl: null,
        pages: estimatePages(content),
        length: "medium",
        createdAt: new Date().toISOString(),
        userId: user?.id,
      };
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
      toast({ title: "PDF exported", description: "Your ebook download has started." });
    } catch {
      toast({ title: "Export failed", description: "We couldn’t create the PDF. Please try again.", variant: "destructive" });
    }
  };

  const startNewChat = () => {
    if (isGenerating) return;
    clearPendingChatTopic();
    setMessages([]);
    setDraft("");
    setActiveProduct("Ebook");
    setSelectedTemplate(null);
    composerRef.current?.focus();
  };

  return (
    <div className="nexora-chat-workspace flex min-h-[calc(100dvh-0px)] flex-col" style={{ background: "#151515", color: "#F5F5F5" }}>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#292929] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation drawer"
            onClick={() => setMobileOpen(true)}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-[#B2B2B2] transition hover:bg-[#242424] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E] md:hidden"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777] sm:inline">Workspace</span>
          <span className="hidden h-1 w-1 rounded-full bg-[#00E68E] sm:inline-block" aria-hidden="true" />
          <span className="text-sm text-[#C9C9C9]">Product studio</span>
        </div>
        {hasConversation && (
          <button
            type="button"
            onClick={startNewChat}
            disabled={isGenerating}
            className="rounded-lg px-3 py-2 text-sm text-[#A0A0A0] transition hover:bg-[#202020] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            New chat
          </button>
        )}
      </header>

      <div ref={conversationRef} className="flex-1 overflow-y-auto overscroll-contain">
        {!hasConversation ? (
          <section className="mx-auto flex min-h-[calc(100dvh-240px)] w-full max-w-[800px] items-center justify-center px-5 pb-8 pt-10 sm:px-8" aria-label="New conversation" />
        ) : (
          <section className="mx-auto flex w-full max-w-[800px] flex-col gap-7 px-4 py-8 sm:px-8 sm:py-10" aria-label="Conversation" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {message.role === "user" ? (
                  <div className="max-w-[88%] rounded-2xl rounded-br-md bg-[#242424] px-4 py-3 text-[15px] leading-6 text-[#F2F2F2] sm:max-w-[78%] sm:px-5">
                    {message.text}
                  </div>
                ) : (
                  <div className="w-full max-w-full sm:max-w-[92%]">
                    {message.kind === "templates" && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#313131] bg-[#202020] text-[#00E68E]">
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
                                className={`group rounded-xl border p-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E] disabled:cursor-not-allowed disabled:opacity-65 ${selected ? "border-[#00E68E]/60 bg-[#1D2723]" : "border-[#303030] bg-[#1B1B1B] hover:border-[#545454] hover:bg-[#202020]"}`}
                                aria-pressed={selected}
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#333] bg-[#222] text-[#B8B8B8] transition group-hover:text-[#00E68E]">
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
                      <div className="rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#353535] bg-[#222] text-[#00E68E]">
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
                            <div className="h-full rounded-full bg-[#00E68E] transition-[width] duration-300" style={{ width: `${((message.chapters?.length ?? 0) / message.totalChapters) * 100}%` }} />
                          </div>
                        ) : null}
                        {(message.chapters ?? []).map((chapter, index) => (
                          <article key={`${message.id}-${index}`} className="mt-5 border-t border-[#2E2E2E] pt-4">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#00C67B]">Chapter {index + 1}</p>
                            <h3 className="text-base font-medium tracking-tight text-[#F2F2F2]">{chapter.heading}</h3>
                            {chapter.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#B0B0B0]">{chapter.body}</p>}
                          </article>
                        ))}
                      </div>
                    )}

                    {message.kind === "error" && (
                      <div role="alert" className="rounded-xl border border-[#5A3939] bg-[#241A1A] p-4 text-sm leading-6 text-[#E7C3C3]">
                        <p className="font-medium text-[#F0DADA]">The ebook wasn’t created</p>
                        <p className="mt-1 text-[#C6AFAF]">{message.text}</p>
                      </div>
                    )}

                    {message.kind === "ready" && message.ebook && (
                      <div className="rounded-2xl border border-[#365447] bg-[#19211D] p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#365447] bg-[#1F2B25] text-[#00E68E]">
                            <BookOpen size={16} aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#F1F5F2]">{message.text}</p>
                            <h3 className="mt-1 truncate text-[15px] font-medium text-[#C9D9CF]">{message.ebook.title}</h3>
                            <p className="mt-2 text-xs text-[#91A397]">PDF · about {message.ebook.pages} pages · saved to Downloads</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void downloadEbook(message.ebook!)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#151515] transition hover:bg-[#E9E9E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E]"
                          >
                            <Download size={15} aria-hidden="true" />
                            Download PDF
                          </button>
                          <Link
                            to="/dashboard/downloads"
                            className="inline-flex min-h-10 items-center rounded-lg border border-[#3A4940] px-4 text-sm text-[#D4DED7] transition hover:bg-[#233028] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E]"
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

      <div className="sticky bottom-0 z-10 w-full shrink-0 bg-gradient-to-t from-[#151515] via-[#151515] to-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-5 sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="mx-auto w-full max-w-[800px]">
          <form onSubmit={submitTopic} className="relative rounded-[20px] border border-[#353535] bg-[#202020] shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition focus-within:border-[#4A4A4A]">
            <label htmlFor="nexora-topic-composer" className="sr-only">Describe the ebook topic</label>
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
              disabled={isGenerating}
              placeholder={activeSystem === "product-generator" ? "What topic do you want to create an ebook about?" : "Hybrid Agentic System is not connected in this preview…"}
              className="block max-h-40 min-h-[58px] w-full resize-none bg-transparent px-5 pb-2 pt-[18px] text-[15px] leading-6 text-[#F5F5F5] outline-none placeholder:text-[#777] disabled:opacity-60 sm:px-6"
              aria-describedby="composer-hint"
            />
            <p id="composer-hint" className="sr-only">Press Enter to send. Press Shift and Enter to add a new line.</p>
            <div className="flex items-center justify-between gap-2 px-3 pb-3 sm:px-4">
              <div className="relative flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setAttachmentMenuOpen((open) => !open); setCapabilityMenuOpen(false); }}
                  aria-label="Open attachment options"
                  aria-expanded={attachmentMenuOpen}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#9B9B9B] transition hover:bg-[#2B2B2B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E]"
                >
                  <Plus size={19} aria-hidden="true" />
                </button>
                {attachmentMenuOpen && (
                  <div role="status" className="absolute bottom-12 left-0 z-20 w-[min(290px,calc(100vw-40px))] rounded-xl border border-[#393939] bg-[#262626] p-3.5 shadow-xl">
                    <p className="text-sm font-medium text-[#EFEFEF]">Attachments aren’t available here yet</p>
                    <p className="mt-1 text-xs leading-5 text-[#9A9A9A]">For this ebook flow, start with a topic and select a format. No file upload has been enabled.</p>
                  </div>
                )}
                <div className="hidden h-5 w-px bg-[#383838] sm:block" aria-hidden="true" />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setCapabilityMenuOpen((open) => !open); setAttachmentMenuOpen(false); }}
                    aria-haspopup="menu"
                    aria-expanded={capabilityMenuOpen}
                    className="flex h-9 max-w-[205px] items-center gap-2 rounded-xl px-2.5 text-xs font-medium text-[#B7B7B7] transition hover:bg-[#2B2B2B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E]"
                  >
                    <Sparkles size={14} className="shrink-0 text-[#00E68E]" aria-hidden="true" />
                    <span className="truncate">{activeSystem === "product-generator" ? "AI Product Generator" : "Hybrid Agentic System"}</span>
                    <ChevronDown size={13} className="shrink-0" aria-hidden="true" />
                  </button>
                  {capabilityMenuOpen && (
                    <div role="menu" aria-label="NexoraOS system selector" className="absolute bottom-12 left-0 z-20 w-[min(290px,calc(100vw-32px))] rounded-xl border border-[#393939] bg-[#262626] p-1.5 shadow-xl">
                      <button type="button" role="menuitemradio" aria-checked={activeSystem === "product-generator"} onClick={() => { setActiveSystem("product-generator"); setCapabilityMenuOpen(false); }} className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-[#EDEDED] hover:bg-[#303030]">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00E68E]" />
                        <span><span className="block font-medium">AI Product Generator</span><span className="mt-0.5 block text-[10px] leading-4 text-[#929292]">Creates ebooks with the verified product workflow.</span></span>
                      </button>
                      <button type="button" role="menuitemradio" aria-checked={activeSystem === "hybrid-agentic"} onClick={() => { setActiveSystem("hybrid-agentic"); setCapabilityMenuOpen(false); }} className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-[#BDBDBD] hover:bg-[#303030]">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#777]" />
                        <span><span className="block font-medium">Hybrid Agentic System</span><span className="mt-0.5 block text-[10px] leading-4 text-[#929292]">Not connected in this preview; no agent run will be simulated.</span></span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-[11px] text-[#737373] sm:inline">Enter to send</span>
                <button
                  type="submit"
                  disabled={!draft.trim() || isGenerating}
                  aria-label="Send topic"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E] disabled:cursor-not-allowed ${draft.trim() && !isGenerating ? "bg-white text-[#111] hover:bg-[#E8E8E8]" : "bg-[#303030] text-[#777]"}`}
                >
                  {isGenerating ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={19} strokeWidth={2.4} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </form>

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
                className={`min-h-8 rounded-full border px-3 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E68E] ${activeProduct === product.label ? "border-[#00E68E]/45 bg-[#1B2B23] text-[#B8F4D8]" : product.enabled ? "border-[#3B3B3B] bg-[#1C1C1C] text-[#B6B6B6] hover:border-[#555] hover:text-white" : "cursor-not-allowed border-[#2D2D2D] bg-[#191919] text-[#5F5F5F]"}`}
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
