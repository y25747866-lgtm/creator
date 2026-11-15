import { BotAvatar } from "bot-avatars";
import type { ReactNode } from "react";

type ApexAgentProps = {
  isWorking?: boolean;
  isActive?: boolean;
  children?: ReactNode;
  className?: string;
};

export default function ApexAgent({
  isWorking = false,
  isActive = true,
  children,
  className = "",
}: ApexAgentProps) {
  const state = !isActive ? "sleeping" : isWorking ? "working" : "default";
  const status = !isActive ? "Sleeping" : isWorking ? "Working" : "Idle";

  return (
    <article
      data-agent="APEX"
      className={`rounded-2xl border border-white/10 bg-[#17191d] p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <BotAvatar
          type="star"
          state={state}
          size={64}
          interactive={false}
          aria-label={`APEX, ${status.toLowerCase()}`}
        />
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-white">APEX</h2>
          <p className="mt-1 text-xs text-white/55">{status}</p>
        </div>
      </div>
      {children && <div className="mt-3 text-sm text-white/80">{children}</div>}
    </article>
  );
}
