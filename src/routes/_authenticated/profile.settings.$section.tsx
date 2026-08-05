import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import { Card, Chip, Screen, Toggle } from "@/components/ciatta/screen";
import { SourceCard } from "@/components/ciatta/source-card";
import { deleteAllData, exportAllData } from "@/lib/ciatta-store";
import { forgetEverything } from "@/lib/engine.functions";
import { SOURCES } from "@/lib/health-sources";
import { endSession } from "@/lib/session";
import { useSources } from "@/lib/use-sources";
import { useSettings } from "@/lib/profile-store";
import { useAppearance } from "@/lib/use-appearance";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  notifications: {
    title: "Notifications",
    subtitle: "Ciatta only speaks up when it has something worth saying. Choose what counts.",
  },
  appearance: {
    title: "Appearance",
    subtitle: "How Ciatta looks on this device.",
  },
  sources: {
    title: "Connected sources",
    subtitle: "Each source you connect gives Ciatta another angle on the same body.",
  },
  // Kept so older links still land somewhere sensible.
  apps: {
    title: "Connected sources",
    subtitle: "Each source you connect gives Ciatta another angle on the same body.",
  },
  privacy: {
    title: "Privacy",
    subtitle: "Your understanding belongs to you. Here is exactly where it lives.",
  },
  help: { title: "Help", subtitle: "Short answers to the things people ask most." },
  about: { title: "About Ciatta", subtitle: "What this is, and what it is not." },
  legal: { title: "Legal", subtitle: "Terms, privacy policy and licences." },
};

export const Route = createFileRoute("/_authenticated/profile/settings/$section")({
  beforeLoad: ({ params }) => {
    if (!TITLES[params.section]) throw notFound();
  },
  head: ({ params }) => {
    const meta = TITLES[params.section] ?? { title: "Settings", subtitle: "Ciatta settings." };
    return {
      meta: [
        { title: `${meta.title} — Ciatta` },
        { name: "description", content: meta.subtitle },
        { property: "og:title", content: `${meta.title} — Ciatta` },
        { property: "og:description", content: meta.subtitle },
      ],
    };
  },
  component: SettingsSection,
});

function SettingsSection() {
  const { section } = Route.useParams();
  const meta = TITLES[section];

  return (
    <Screen title={meta.title} subtitle={meta.subtitle}>
      {section === "notifications" && <Notifications />}
      {section === "appearance" && <Appearance />}
      {(section === "sources" || section === "apps") && <ConnectedSources />}
      {section === "privacy" && <Privacy />}
      {section === "help" && <Help />}
      {section === "about" && <About />}
      {section === "legal" && <Legal />}
    </Screen>
  );
}

/* ---------------------------------------------------------------- sections */

function Notifications() {
  const { settings, save } = useSettings();
  const n = settings.notifications;
  const set = (k: keyof typeof n, v: boolean) => save({ notifications: { ...n, [k]: v } });

  return (
    <>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        Notifications aren&rsquo;t sending yet &mdash; this is coming soon. What you choose here is
        saved now, so it&rsquo;s already set the moment they turn on.
      </p>
      <Card>
        <Toggle
          label="Today's read"
          detail="One line each morning about what your body is asking for."
          checked={n.dailyRead}
          onChange={(v) => set("dailyRead", v)}
        />
        <Toggle
          label="New understanding"
          detail="When a pattern becomes confident enough to act on."
          checked={n.newUnderstanding}
          onChange={(v) => set("newUnderstanding", v)}
        />
        <Toggle
          label="Cycle shifts"
          detail="When Ciatta thinks your phase has changed."
          checked={n.cycleShifts}
          onChange={(v) => set("cycleShifts", v)}
        />
        <Toggle
          label="Weekly summary"
          detail="A short Sunday note on what changed."
          checked={n.weeklySummary}
          onChange={(v) => set("weeklySummary", v)}
        />
        <Toggle
          label="Quiet hours"
          detail="Nothing between 10pm and 7am."
          checked={n.quietHours}
          onChange={(v) => set("quietHours", v)}
        />
      </Card>
    </>
  );
}

function Appearance() {
  const { choice, setChoice } = useAppearance();
  const options: Array<{ id: "light" | "dark" | "system"; label: string; body: string }> = [
    { id: "light", label: "Light", body: "Morning light \u2014 the default warm canvas." },
    { id: "dark", label: "Dark", body: "The same warmth, lowered for night reading." },
    { id: "system", label: "System", body: "Follows your device setting." },
  ];

  return (
    <Card>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setChoice(o.id)}
          aria-pressed={choice === o.id}
          className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          <span>
            <span className="block text-[15px]">{o.label}</span>
            <span className="mt-0.5 block text-[13px] text-muted-foreground">{o.body}</span>
          </span>
          <span className={`text-[15px] ${choice === o.id ? "text-accent" : "text-transparent"}`}>
            {"\u2713"}
          </span>
        </button>
      ))}
    </Card>
  );
}

function ConnectedSources() {
  const { sources, loading, busy, message, connect, disconnect, resync, nativeAvailable, nativeReady } =
    useSources();

  return (
    <Card>
      {SOURCES.map((descriptor) => {
        const state =
          sources.find((s) => s.id === descriptor.id) ??
          ({
            id: descriptor.id,
            status: "not_connected",
            lastSyncAt: null,
            connectedAt: null,
            error: null,
            unavailableReason: null,
          } as const);

        // A native source can only be authorized where its permission sheet exists.
        const nativeBlocked =
          descriptor.auth === "native" && nativeReady && !nativeAvailable
            ? "Apple Health is available in the iPhone app."
            : null;

        return (
          <SourceCard
            key={descriptor.id}
            descriptor={descriptor}
            state={{ ...state, unavailableReason: nativeBlocked ?? state.unavailableReason }}
            busy={busy === descriptor.id || loading}
            note={message?.id === descriptor.id ? message.text : null}
            onConnect={() => void connect(descriptor.id)}
            onDisconnect={() => void disconnect(descriptor.id)}
            onRetry={() =>
              void (state.status === "sync_error" && state.connectedAt
                ? resync(descriptor.id)
                : connect(descriptor.id))
            }
          />
        );
      })}
    </Card>
  );
}


function Privacy() {
  const navigate = useNavigate();
  const { settings, save } = useSettings();
  const p = settings.privacy;
  const set = (k: keyof typeof p, v: boolean) => save({ privacy: { ...p, [k]: v } });

  const [exportState, setExportState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onExport = () => {
    setExportState("working");
    try {
      const blob = new Blob([JSON.stringify(exportAllData(), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ciatta-understanding-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportState("done");
    } catch {
      setExportState("error");
    }
  };

  return (
    <>
      <Card>
        <Toggle
          label="Keep everything on this device"
          detail="Nothing leaves your phone. Ciatta reasons locally."
          checked={p.onDeviceOnly}
          onChange={(v) => set("onDeviceOnly", v)}
        />
        <Toggle
          label="Help improve Ciatta"
          detail="Anonymous, aggregated signals only. Never your logs."
          checked={p.improveCiatta}
          onChange={(v) => set("improveCiatta", v)}
        />
        <Toggle
          label="Contribute to women's health research"
          detail="Opt in per study. You can withdraw at any time."
          checked={p.research}
          onChange={(v) => set("research", v)}
        />
      </Card>

      <p className="mt-8 label-caps">Your data</p>
      <Card>
        <button
          type="button"
          onClick={onExport}
          disabled={exportState === "working"}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] transition-colors hover:bg-secondary/60 active:bg-secondary disabled:opacity-60"
        >
          Export my data
          <span className="text-[13px] text-muted-foreground">
            {exportState === "working"
              ? "Preparing\u2026"
              : exportState === "done"
                ? "Downloaded"
                : exportState === "error"
                  ? "Failed \u2014 retry"
                  : "JSON"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          Delete my data
          <span aria-hidden="true" className="text-[13px] text-muted-foreground">
            {"\u203A"}
          </span>
        </button>
      </Card>

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete your data"
          className="fixed inset-0 z-50 flex items-end justify-center bg-background px-4 pb-8"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="animate-fade-in w-full max-w-[398px] rounded-3xl bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-[22px] leading-snug">Delete your data?</p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              This will permanently delete everything Ciatta has learned about you and remove it
              from your account. This can&rsquo;t be undone.
            </p>
            <button
              type="button"
              onClick={async () => {
                // Forget in Ciatta's own memory, then on the device, then end
                // the session.
                await forgetEverything().catch(() => {});
                deleteAllData();
                await endSession();
                setConfirmDelete(false);
                navigate({ to: "/auth", replace: true });
              }}
              className="mt-6 h-12 w-full rounded-full bg-destructive text-[15px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Delete my data
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="mt-2 h-12 w-full rounded-full text-[15px] text-muted-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const HELP = [
  {
    q: "How does Ciatta decide what to say?",
    a: "It compares today against your own recent baseline, not a population average. When something repeats, confidence rises and it starts to say it out loud.",
  },
  {
    q: "Why is confidence so low at the start?",
    a: "Because it should be. Ciatta would rather say nothing than guess. A handful of logs is usually enough for the first honest pattern.",
  },
  {
    q: "What is the fastest way to teach it?",
    a: "Quick Add whenever something happens, and a daily check-in. Those two together give it both the event and how it felt.",
  },
  {
    q: "Can I correct something it got wrong?",
    a: "Yes. Teach Ciatta the correction directly and it will weigh the newer information more heavily.",
  },
];

function Help() {
  const [open, setOpen] = useState<string | null>(HELP[0].q);
  return (
    <>
      <Card>
        {HELP.map((h) => (
          <div key={h.q}>
            <button
              type="button"
              aria-expanded={open === h.q}
              onClick={() => setOpen((c) => (c === h.q ? null : h.q))}
              className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left text-[15px] transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              {h.q}
              <span
                aria-hidden="true"
                className={`text-fog transition-transform duration-300 ${
                  open === h.q ? "-rotate-90" : ""
                }`}
              >
                {"\u203A"}
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ${
                open === h.q ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-[14px] leading-relaxed text-muted-foreground">{h.a}</p>
              </div>
            </div>
          </div>
        ))}
      </Card>
      <Link
        to="/teach"
        className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Ask Ciatta directly
      </Link>
    </>
  );
}

function About() {
  return (
    <>
      <p className="font-serif text-[21px] leading-snug">
        Ciatta is a continuous understanding of your body, built from what you live.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        It reads your signals, your logs and your context together, and tells you what today is
        asking for. It gets more useful the longer it knows you.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Ciatta is not a doctor and does not diagnose. If something feels wrong, speak to a
        clinician.
      </p>
      <Card>
        <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
          <span>Version</span>
          <span className="text-[14px] text-muted-foreground">1.0 (MVP)</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
          <span>Understanding engine</span>
          <span className="text-[14px] text-muted-foreground">Ciatta&rsquo;s servers</span>
        </div>
      </Card>
    </>
  );
}

function Legal() {
  // Terms and Privacy have full, real pages already \u2014 link straight there
  // instead of a one-line summary standing in for the actual document.
  // Health disclaimer and licences don't have dedicated pages yet, so they
  // stay as an inline expand until they do.
  const docs = [
    { title: "Terms of use", href: "/terms" as const },
    { title: "Privacy policy", href: "/privacy" as const },
    {
      title: "Health disclaimer",
      body: "Ciatta offers understanding, not medical advice or diagnosis.",
    },
    { title: "Open source licences", body: "The libraries Ciatta is built on." },
  ];
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Card>
      {docs.map((d) =>
        d.href ? (
          <Link
            key={d.title}
            to={d.href}
            className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-[15px] transition-colors hover:bg-secondary/60 active:bg-secondary"
          >
            {d.title}
            <span aria-hidden="true" className="text-fog">
              {"\u203A"}
            </span>
          </Link>
        ) : (
          <div key={d.title}>
            <button
              type="button"
              aria-expanded={open === d.title}
              onClick={() => setOpen((c) => (c === d.title ? null : d.title))}
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-[15px] transition-colors hover:bg-secondary/60 active:bg-secondary"
            >
              {d.title}
              <span
                aria-hidden="true"
                className={`text-fog transition-transform duration-300 ${
                  open === d.title ? "-rotate-90" : ""
                }`}
              >
                {"\u203A"}
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ${
                open === d.title ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-[14px] leading-relaxed text-muted-foreground">
                  {d.body}
                </p>
              </div>
            </div>
          </div>
        ),
      )}
    </Card>
  );
}
