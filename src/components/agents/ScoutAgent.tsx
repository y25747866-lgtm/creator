import { BotAvatar } from "bot-avatars";
import type { ReactNode } from "react";

type ScoutAgentProps = {
  isWorking?: boolean;
  isActive?: boolean;
  children?: ReactNode;
  className?: string;
};

export default function ScoutAgent({
  isWorking = false,
  isActive = true,
  children,
  className = "",
}: ScoutAgentProps) {
  const state = !isActive ? "sleeping" : isWorking ? "working" : "default";
  const status = !isActive ? "Sleeping" : isWorking ? "Working" : "Idle";

  return (
    <article
      data-agent="SCOUT"
      className={`rounded-2xl border border-white/10 bg-[#17191d] p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <BotAvatar
          type="clover"
          state={state}
          size={64}
          interactive={false}
          aria-label={`SCOUT, ${status.toLowerCase()}`}
        />
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-white">SCOUT</h2>
          <p className="mt-1 text-xs text-white/55">{status}</p>
        </div>
      </div>
      {children && <div className="mt-3 text-sm text-white/80">{children}</div>}
    </article>
  );
}
