/**
 * One card, every source. Status, last sync and a single action — nothing about
 * how a particular source works reaches this component.
 */
import type { SourceDescriptor, SourceState } from "@/lib/health-sources";
import { statusLabel } from "@/lib/health-sources";

const DOT: Record<SourceState["status"], string> = {
  connected: "bg-moss",
  connecting: "bg-wheat",
  sync_error: "bg-accent",
  not_connected: "bg-fog",
};

function lastSync(at: string | null): string {
  if (!at) return "Nothing read yet";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60_000));
  if (minutes < 2) return "Read just now";
  if (minutes < 60) return `Read ${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Read ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `Read ${days} ${days === 1 ? "day" : "days"} ago`;
}

export function SourceCard({
  descriptor,
  state,
  busy,
  note,
  onConnect,
  onDisconnect,
  onRetry,
}: {
  descriptor: SourceDescriptor;
  state: SourceState;
  busy: boolean;
  note: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRetry: () => void;
}) {
  const connected = state.status === "connected";
  const errored = state.status === "sync_error";
  const blocked = Boolean(state.unavailableReason) && !connected;

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-[15px]">{descriptor.name}</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
            {note ?? state.error ?? state.unavailableReason ?? descriptor.body}
          </span>
        </span>
        <button
          type="button"
          onClick={errored ? onRetry : connected ? onDisconnect : onConnect}
          disabled={busy || (blocked && !errored)}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition-colors disabled:opacity-50 ${
            connected ? "border-border text-muted-foreground" : "border-accent text-accent"
          }`}
        >
          {busy ? "\u2026" : errored ? "Try again" : connected ? "Disconnect" : "Connect"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
        <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${DOT[state.status]}`} />
        <span>{statusLabel(state.status)}</span>
        {connected && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span>{lastSync(state.lastSyncAt)}</span>
          </>
        )}
      </div>

      {connected && (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          Reading {descriptor.reads.join(", ").toLowerCase()}.
        </p>
      )}
    </div>
  );
}
