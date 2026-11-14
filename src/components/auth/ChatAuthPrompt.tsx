import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { signInWithGoogle } from "@/lib/auth/login";

import { Skeleton } from "@/components/ui/skeleton";
type ChatAuthPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingTopic?: string | null;
  sendMagicLink: (email: string) => Promise<{ error: { message: string } | null }>;
};

const ChatAuthPrompt = ({ open, onOpenChange, pendingTopic, sendMagicLink }: ChatAuthPromptProps) => {
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingGoogle, setIsSendingGoogle] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSendingEmail(true);

    try {
      const { error } = await sendMagicLink(email.trim());
      if (error) {
        setErrorMessage(error.message || "We couldn’t send the sign-in link. Please try again.");
        return;
      }
      setEmailSent(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn’t send the sign-in link. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setIsSendingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in could not be started. Please try again.");
    } finally {
      setIsSendingGoogle(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.25rem)] max-w-[440px] max-h-[calc(100dvh-2rem)] overflow-y-auto border-[#363636] bg-[#191919] p-5 text-[#F5F5F5] sm:p-6">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-xl tracking-tight text-white">Sign in to continue</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6 text-[#A0A0A0]">
            Sign in or create an account to continue in NexoraOS. {pendingTopic ? "Your draft is saved locally for up to one hour and resumes after sign-in." : "Protected account features remain available only after sign-in."}
          </DialogDescription>
        </DialogHeader>

        {pendingTopic && (
          <div className="rounded-xl border border-[#333] bg-[#202020] p-3.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7D7D7D]">Your message</p>
            <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-5 text-[#D8D8D8]">{pendingTopic}</p>
          </div>
        )}

        {emailSent ? (
          <div role="status" className="rounded-xl border border-[#31513F] bg-[#1B2720] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#24362B] text-[#79D9AA]">
                <Mail size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-[#D9F0E2]">Check your email</p>
                <p className="mt-1 text-xs leading-5 text-[#A9C5B3]">
                  We sent a sign-in link to <span className="font-medium text-[#D8E7DD]">{email}</span>. Open it in this browser to continue with your saved message.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className="mt-3 text-xs font-medium text-[#B7BEC8] underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label htmlFor="chat-auth-email" className="mb-1.5 block text-xs font-medium text-[#B8B8B8]">Email address</label>
              <input
                id="chat-auth-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-11 w-full rounded-lg border border-[#3A3A3A] bg-[#111] px-3.5 text-sm text-white caret-white outline-none placeholder:text-[#696969] focus:border-[#8C96A3] focus:ring-2 focus:ring-[#8C96A3]/20"
              />
            </div>
            <button
              type="submit"
              disabled={isSendingEmail || isSendingGoogle}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#151515] transition hover:bg-[#E9E9E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
            >
              {isSendingEmail ? <Skeleton className="h-4 w-4" aria-label="Loading" /> : null}
              {isSendingEmail ? "Sending sign-in link…" : "Continue with email"}
            </button>
          </form>
        )}

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-[#343434]" />
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#707070]">or</span>
          <span className="h-px flex-1 bg-[#343434]" />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isSendingEmail || isSendingGoogle}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#3A3A3A] bg-[#222] px-4 text-sm font-medium text-[#E0E0E0] transition hover:bg-[#292929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
        >
          {isSendingGoogle ? <Skeleton className="h-4 w-4" aria-label="Loading" /> : null}
          {isSendingGoogle ? "Opening Google sign-in…" : "Continue with Google"}
        </button>

        {errorMessage && <p role="alert" className="text-sm leading-5 text-[#E2A7A7]">{errorMessage}</p>}

        <p className="text-center text-[10px] leading-4 text-[#727272]">Protected generation, account data, and downloads remain unavailable until sign-in is complete.</p>
      </DialogContent>
    </Dialog>
  );
};

export default ChatAuthPrompt;
