import { ArrowUp, Plus } from "lucide-react";
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
  placeholder = "Ask anything, or tell Nexora what to build...",
}: ChatGPTPromptInputProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? localRef;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
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
      <div className="nexora-prompt-bar rounded-[17px] border border-[#303030] bg-[#202020] px-3.5 pb-2.5 pt-3.5 transition-colors focus-within:border-[#444444] sm:rounded-[19px] sm:px-4 sm:pb-3 sm:pt-4">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="What do you want to build today?"
          className="nexora-home-input min-h-10 w-full max-h-[120px] resize-none bg-transparent py-1 text-[14px] leading-6 text-[#e8e8e8] outline-none placeholder:text-[#777777] disabled:cursor-not-allowed sm:text-[15px]"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button type="button" aria-label="Add attachment" onClick={() => document.getElementById("nexora-prompt-file")?.click()} className="flex h-8 w-8 items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-[#303030] hover:text-white">
            <Plus className="h-[17px] w-[17px]" strokeWidth={1.7} />
          </button>
          <input id="nexora-prompt-file" type="file" className="hidden" aria-label="Attach a file" />
          <div className="ml-auto flex items-center gap-2.5">
            <button type="button" className="hidden text-[10px] text-[#a1a1a1] transition-colors hover:text-white sm:inline-flex sm:items-center sm:gap-1">
              Nexora AI <span className="text-[#696969]">Pro</span>
            </button>
            <span className="hidden text-[10px] text-[#696969] sm:inline">Balanced</span>
            <button
              type="submit"
              aria-label="Send prompt"
              disabled={disabled || !value.trim()}
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-0 bg-[#4a4a4a] text-[#d0d0d0] transition-colors hover:bg-[#00e68e] hover:text-[#08120d] disabled:cursor-not-allowed disabled:opacity-65"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
