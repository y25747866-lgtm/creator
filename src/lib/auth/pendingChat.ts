const PENDING_CHAT_KEY = "nexoraos.pending-chat-topic.v1";
const PENDING_CHAT_VERSION = 1;
const PENDING_CHAT_TTL_MS = 60 * 60 * 1000;
const MAX_TOPIC_LENGTH = 500;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

type PendingChatRecord = {
  version: number;
  topic: string;
  createdAt: number;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function savePendingChatTopic(topic: string, now = Date.now()): boolean {
  const normalizedTopic = topic.trim();
  const storage = getStorage();
  if (!storage || !normalizedTopic || normalizedTopic.length > MAX_TOPIC_LENGTH) return false;

  const record: PendingChatRecord = {
    version: PENDING_CHAT_VERSION,
    topic: normalizedTopic,
    createdAt: now,
  };

  try {
    storage.setItem(PENDING_CHAT_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function readPendingChatTopic(now = Date.now()): string | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const rawRecord = storage.getItem(PENDING_CHAT_KEY);
    if (!rawRecord) return null;

    const parsed: unknown = JSON.parse(rawRecord);
    if (!parsed || typeof parsed !== "object") {
      clearPendingChatTopic();
      return null;
    }

    const record = parsed as Partial<PendingChatRecord>;
    const validTopic = typeof record.topic === "string"
      && record.topic.trim().length > 0
      && record.topic.trim().length <= MAX_TOPIC_LENGTH;
    const validTimestamp = typeof record.createdAt === "number"
      && Number.isFinite(record.createdAt)
      && record.createdAt <= now + MAX_CLOCK_SKEW_MS
      && now - record.createdAt <= PENDING_CHAT_TTL_MS;

    if (record.version !== PENDING_CHAT_VERSION || !validTopic || !validTimestamp) {
      clearPendingChatTopic();
      return null;
    }

    return record.topic.trim();
  } catch {
    clearPendingChatTopic();
    return null;
  }
}

export function clearPendingChatTopic(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(PENDING_CHAT_KEY);
  } catch {
    // Storage can be disabled by browser policy; leave the app usable.
  }
}
