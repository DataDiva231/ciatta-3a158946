import { useOnlineStatus } from "@/lib/use-online-status";

/**
 * A quiet, non-blocking notice — not a takeover screen. Most of what Ciatta
 * does (Teach, Quick Add, Talk) writes to this device first and keeps
 * working with no connection at all; only the things that genuinely need
 * the network (syncing, sign-in, transcription, connected sources) don't.
 * Blocking the whole app here would make it do less than it actually can.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="animate-in fade-in absolute inset-x-0 top-0 z-40 flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] duration-300"
    >
      <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-[12.5px] text-muted-foreground shadow-soft">
        <span aria-hidden="true" className="h-[6px] w-[6px] shrink-0 rounded-full bg-fog" />
        You&rsquo;re offline. What you share here is kept and sent along once you&rsquo;re back.
      </div>
    </div>
  );
}
