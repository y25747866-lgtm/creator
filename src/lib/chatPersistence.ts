import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type CreatorConversationSummary = { id: string; title: string; updated_at: string };

const localIndexKey = (userId: string) => `nexoraos-chat-index-v2-${userId}`;
const localConversationKey = (userId: string, id: string) => `nexoraos-chat-conversation-v2-${userId}-${id}`;

export function cacheLocalCreatorConversation(userId: string, id: string, title: string, messages: unknown[]): void {
  const updated_at = new Date().toISOString();
  window.localStorage.setItem(localConversationKey(userId, id), JSON.stringify(messages));
  const previous = getLocalCreatorConversations(userId).filter((item) => item.id !== id);
  const next = [{ id, title: title.slice(0, 120) || "New chat", updated_at }, ...previous].slice(0, 30);
  window.localStorage.setItem(localIndexKey(userId), JSON.stringify(next));
}

export function getLocalCreatorConversations(userId: string): CreatorConversationSummary[] {
  try {
    const raw = window.localStorage.getItem(localIndexKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item?.id === "string" && typeof item?.title === "string");
  } catch { /* read the legacy history below */ }
  try {
    const raw = window.localStorage.getItem(`nexoraos-chat-history-v1-${userId}`);
    const messages = raw ? JSON.parse(raw) : [];
    const firstPrompt = Array.isArray(messages) ? messages.find((item) => item?.role === "user" && typeof item.text === "string")?.text : null;
    return typeof firstPrompt === "string" ? [{ id: "legacy", title: firstPrompt.slice(0, 120), updated_at: new Date().toISOString() }] : [];
  } catch { return []; }
}

export function readLocalCreatorConversation(userId: string, id: string): unknown[] {
  const key = id === "legacy" ? `nexoraos-chat-history-v1-${userId}` : localConversationKey(userId, id);
  try {
    const raw = window.localStorage.getItem(key);
    const messages = raw ? JSON.parse(raw) : [];
    return Array.isArray(messages) ? messages : [];
  } catch { return []; }
}

export async function listCreatorConversations(userId: string): Promise<CreatorConversationSummary[]> {
  const { data, error } = await supabase
    .from("creator_chat_conversations")
    .select("id,title,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message || "Could not load chat history.");
  return data ?? [];
}

export async function loadCreatorConversation(userId: string, id: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from("creator_chat_conversations")
    .select("messages")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not load this conversation.");
  if (!data || !Array.isArray(data.messages)) throw new Error("This conversation was not found.");
  return data.messages;
}

export async function saveCreatorConversation(
  userId: string,
  id: string,
  title: string,
  messages: unknown[],
): Promise<void> {
  const { error } = await supabase.from("creator_chat_conversations").upsert({
    id,
    user_id: userId,
    title: title.slice(0, 120) || "New chat",
    messages: messages as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw new Error(error.message || "Could not save this conversation.");
}
