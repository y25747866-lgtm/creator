import type { Ebook } from "@/hooks/useEbookStore";

export type EbookCheck = { id: string; label: string; passed: boolean; detail: string };

export function checkEbookQuality(ebook: Ebook): EbookCheck[] {
  const text = ebook.content.trim();
  const headings = text.match(/^#{1,3}\s+.+$/gm) ?? [];
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasPlaceholder = /this is a placeholder|configure your groq_api_key|\[insert (?:text|content|example)/i.test(text);

  return [
    { id: "title", label: "Product has a title", passed: Boolean(ebook.title.trim()), detail: ebook.title.trim() ? "Title is present" : "Add a title before export" },
    { id: "content", label: "Manuscript has content", passed: wordCount >= 100, detail: `${wordCount.toLocaleString()} words` },
    { id: "structure", label: "Sections are organized", passed: headings.length >= 3, detail: `${headings.length} section headings` },
    { id: "placeholder", label: "No setup placeholders found", passed: !hasPlaceholder, detail: hasPlaceholder ? "Replace placeholder text before sharing" : "No known placeholder text" },
  ];
}
