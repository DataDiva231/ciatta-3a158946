import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { CheckInForm } from "@/components/ciatta/check-in-form";
import { Card, Screen, Toggle } from "@/components/ciatta/screen";
import { useProfile } from "@/lib/profile-data";

export const Route = createFileRoute("/profile/source/$id")({
  head: () => ({
    meta: [
      { title: "Connected source — Ciatta" },
      {
        name: "description",
        content:
          "How this source contributes to Ciatta's understanding, what it can read, and how to manage it.",
      },
      { property: "og:title", content: "Connected source — Ciatta" },
      {
        property: "og:description",
        content: "Status and permissions for one of Ciatta's sources of understanding.",
      },
    ],
  }),
  component: SourceDetail,
});

const PERMISSIONS: Record<string, string[]> = {
  teach: ["Text, voice notes, photos and PDFs you send", "Nothing is read that you didn't send"],
  apple: [
    "Sleep stages and timing",
    "Resting heart rate and HRV",
    "Workouts and daily movement",
    "Never written back to \u2014 read only",
  ],
  checkins: [
    "How sleep felt, energy and mood",
    "Symptoms you tag",
    "Cycle start days you mark",
  ],
};

function SourceDetail() {
  const { id } = Route.useParams();
  const profile = useProfile();
  const [reading, setReading] = useState(true);
  const [note, setNote] = useState("");

  if (!profile.hydrated) {
    return (
      <Screen title="Loading">
        <div className="space-y-4 rounded-2xl bg-surface px-4 py-6" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-4 animate-pulse rounded-full bg-secondary" />
          ))}
        </div>
      </Screen>
    );
  }

  const source = profile.sources.find((s) => s.id === id);

  if (!source || !source.active) {
    return (
      <Screen
        title={source?.name ?? "Not available"}
        subtitle={
          source
            ? "This source isn't available yet. When it is, it will start contributing automatically."
            : "This source isn't part of your setup."
        }
      >
        <Link to="/profile" className="text-[15px] text-accent">
          Back to profile
        </Link>
      </Screen>
    );
  }

  const permissions = PERMISSIONS[source.id] ?? [];

  return (
    <Screen title={source.name} subtitle={source.body}>
      <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-4">
        <span className="text-[15px]">Status</span>
        <span className="flex items-center gap-2 text-[14px] text-accent">
          <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-accent" />
          {reading ? source.status : "Paused"}
        </span>
      </div>

      <p className="mt-7 label-caps">What it can read</p>
      <Card>
        {permissions.map((p) => (
          <p key={p} className="px-4 py-3.5 text-[14px] leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </Card>

      <p className="mt-7 label-caps">Manage</p>
      <Card>
        <Toggle
          label="Let Ciatta read from this"
          detail="Pausing keeps everything already learned, but stops new data coming in."
          checked={reading}
          onChange={(v) => {
            setReading(v);
            setNote(v ? "Reading resumed." : "Paused. Nothing new will come in from here.");
          }}
        />
      </Card>
      {note && <p className="mt-3 px-1 text-[13px] text-moss">{note}</p>}

      {source.id === "checkins" && (
        <>
          <p className="mt-8 label-caps">Today's check-in</p>
          <div className="mt-3 rounded-2xl bg-surface px-4 py-5">
            <CheckInForm />
          </div>
        </>
      )}

      {source.id === "teach" && (
        <Link
          to="/teach"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Teach Ciatta something
        </Link>
      )}
    </Screen>
  );
}
