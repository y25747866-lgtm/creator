import { describe, expect, it, vi } from "vitest";
import { checkEbookQuality } from "./ebookQuality";
import { cacheLocalCreatorConversation, getLocalCreatorConversations, readLocalCreatorConversation } from "./chatPersistence";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

describe("ebook pre-export review", () => {
  it("passes a titled, structured manuscript without placeholder text", () => {
    const ebook = {
      id: "ebook-1", title: "A Useful Guide", topic: "planning", description: "Guide", coverImageUrl: null,
      pages: 4, length: "medium" as const, createdAt: new Date().toISOString(),
      content: `## Introduction\n${"Plan one useful step. ".repeat(25)}\n## Method\n${"Keep the process simple. ".repeat(25)}\n## Next steps\n${"Review and continue. ".repeat(25)}`,
    };
    expect(checkEbookQuality(ebook).every((check) => check.passed)).toBe(true);
  });

  it("flags empty or placeholder content rather than claiming it is ready", () => {
    const ebook = { id: "ebook-2", title: "", topic: "", content: "[insert content]", coverImageUrl: null, pages: 1, createdAt: new Date().toISOString() };
    expect(checkEbookQuality(ebook).some((check) => !check.passed)).toBe(true);
  });
});

describe("chat history backup", () => {
  it("keeps separate restorable conversations instead of replacing the previous chat", () => {
    localStorage.clear();
    const first = [{ id: "message-1", role: "user", kind: "text", text: "First project" }];
    const second = [{ id: "message-2", role: "user", kind: "text", text: "Second project" }];
    cacheLocalCreatorConversation("user-1", "conversation-1", "First project", first);
    cacheLocalCreatorConversation("user-1", "conversation-2", "Second project", second);

    expect(getLocalCreatorConversations("user-1").map((item) => item.id)).toEqual(["conversation-2", "conversation-1"]);
    expect(readLocalCreatorConversation("user-1", "conversation-1")).toEqual(first);
  });
});
