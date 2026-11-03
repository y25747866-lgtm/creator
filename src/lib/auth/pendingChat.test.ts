import { beforeEach, describe, expect, it } from "vitest";
import { clearPendingChatTopic, readPendingChatTopic, savePendingChatTopic } from "./pendingChat";

const STORAGE_KEY = "nexoraos.pending-chat-topic.v1";

beforeEach(() => {
  localStorage.clear();
});

describe("pending chat topic storage", () => {
  it("round-trips a trimmed topic and clears it after use", () => {
    expect(savePendingChatTopic("  A focused weekly plan  ", 10_000)).toBe(true);
    expect(readPendingChatTopic(10_001)).toBe("A focused weekly plan");
    clearPendingChatTopic();
    expect(readPendingChatTopic(10_002)).toBeNull();
  });

  it("drops expired, future-dated, malformed, and oversized records", () => {
    expect(savePendingChatTopic("An expired topic", 10_000)).toBe(true);
    expect(readPendingChatTopic(10_000 + 60 * 60 * 1000 + 1)).toBeNull();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, topic: "Future", createdAt: 1_000_000 }));
    expect(readPendingChatTopic(10_000)).toBeNull();

    localStorage.setItem(STORAGE_KEY, "not-json");
    expect(readPendingChatTopic(10_000)).toBeNull();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, topic: "x".repeat(501), createdAt: 10_000 }));
    expect(readPendingChatTopic(10_000)).toBeNull();
  });
});
