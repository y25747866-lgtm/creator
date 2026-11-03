import { ArrowUp } from "lucide-react";
import { useEffect, useRef, type FormEvent, type KeyboardEvent, type RefObject } from "react";

export interface ChatGPTPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatGPTPromptInput({
  value,
  onChange,
  onSubmit,
  inputRef,
  disabled = false,
  placeholder = "What do you want to build today...",
}: ChatGPTPromptInputProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? localRef;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [textareaRef, value]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = value.trim();
    if (prompt && !disabled) onSubmit(prompt);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" aria-label="Build prompt">
      <div className="nexora-prompt-bar flex min-h-[68px] items-end gap-3 rounded-[28px] border border-[#2a2a2a] bg-[#212121] p-3 pl-5 transition-colors focus-within:border-[#00e68e]/50 focus-within:ring-1 focus-within:ring-[#00e68e]/10">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="What do you want to build today?"
          className="nexora-home-input max-h-32 min-h-10 flex-1 resize-none self-center bg-transparent py-2 text-[15px] leading-6 text-[#e8e8e8] outline-none placeholder:text-[#888888] disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          aria-label="Send prompt"
          disabled={disabled || !value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-0 bg-[#00e68e] text-black transition-colors hover:bg-[#13d98d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
