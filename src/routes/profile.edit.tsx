import { useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Card, Chip, Screen } from "@/components/ciatta/screen";
import { GOALS, INTERESTS, LIFE_STAGES, useIdentity } from "@/lib/profile-store";

export const Route = createFileRoute("/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile — Ciatta" },
      {
        name: "description",
        content:
          "Update your name, photo, life stage, goals and health interests so Ciatta reads your days correctly.",
      },
      { property: "og:title", content: "Edit profile — Ciatta" },
      {
        property: "og:description",
        content: "Tell Ciatta who it's learning, so its understanding starts from the right place.",
      },
    ],
  }),
  component: EditProfile,
});

function EditProfile() {
  const router = useRouter();
  const { identity, save, hydrated } = useIdentity();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(identity.name);
  const [photo, setPhoto] = useState(identity.photo);
  const [lifeStage, setLifeStage] = useState(identity.lifeStage);
  const [goals, setGoals] = useState<string[]>(identity.goals);
  const [interests, setInterests] = useState<string[]>(identity.interests);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const onPhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 4_000_000) {
      setError("That image is a little large. Try one under 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setError("");
    };
    reader.onerror = () => setError("That image couldn't be read. Try another.");
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    if (!name.trim()) {
      setError("Ciatta needs something to call you.");
      return;
    }
    setStatus("saving");
    try {
      save({ name: name.trim(), photo, lifeStage, goals, interests });
      setStatus("saved");
      setTimeout(() => router.history.back(), 550);
    } catch {
      setStatus("error");
      setError("That didn't save. Try once more.");
    }
  };

  if (!hydrated) {
    return (
      <Screen title="Edit profile">
        <div className="space-y-4 rounded-2xl bg-surface px-4 py-6" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-4 animate-pulse rounded-full bg-secondary" />
          ))}
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      title="Edit profile"
      subtitle="This is the frame Ciatta reads everything else against. Keeping it accurate keeps its understanding honest."
    >
      <div className="flex items-center gap-4">
        {photo ? (
          <img
            src={photo}
            alt="Your profile photo"
            className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-[26px] font-light text-muted-foreground"
          >
            {name.charAt(0) || "\u00b7"}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-border px-3.5 py-2 text-[13px] transition-colors hover:bg-secondary active:bg-secondary"
          >
            {photo ? "Change photo" : "Add photo"}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => setPhoto("")}
              className="rounded-full border border-border px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary active:bg-secondary"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
      </div>

      <div className="mt-8">
        <p className="label-caps">Name</p>
        <Card>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-fog"
          />
        </Card>
      </div>

      <div className="mt-7">
        <p className="label-caps">Life stage</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Tells Ciatta which rhythm to expect underneath your days.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LIFE_STAGES.map((s) => (
            <Chip key={s} label={s} active={lifeStage === s} onClick={() => setLifeStage(s)} />
          ))}
        </div>
      </div>

      <div className="mt-7">
        <p className="label-caps">Goals</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          What you're actually here for. Insights lean toward these.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip
              key={g}
              label={g}
              active={goals.includes(g)}
              onClick={() => toggle(goals, setGoals, g)}
            />
          ))}
        </div>
      </div>

      <div className="mt-7">
        <p className="label-caps">Health interests</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Subjects you want Ciatta to keep an eye on.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Chip
              key={i}
              label={i}
              active={interests.includes(i)}
              onClick={() => toggle(interests, setInterests, i)}
            />
          ))}
        </div>
      </div>

      {error && <p className="mt-6 text-[13px] text-accent">{error}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={status === "saving"}
        className="mt-8 h-12 w-full rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "saving" ? "Saving\u2026" : status === "saved" ? "Saved" : "Save changes"}
      </button>
      {status === "saved" && (
        <p className="mt-3 text-center text-[13px] text-moss">
          Saved. Ciatta will read your next days with this in mind.
        </p>
      )}
    </Screen>
  );
}
