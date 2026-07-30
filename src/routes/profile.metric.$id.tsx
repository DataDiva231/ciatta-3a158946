import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, Screen } from "@/components/ciatta/screen";
import { useProfile } from "@/lib/profile-data";

export const Route = createFileRoute("/profile/metric/$id")({
  head: () => ({
    meta: [
      { title: "Metric detail — Ciatta" },
      {
        name: "description",
        content: "What this line of your health snapshot means and which observations produced it.",
      },
      { property: "og:title", content: "Metric detail — Ciatta" },
      {
        property: "og:description",
        content: "The reasoning behind one line of your Ciatta health snapshot.",
      },
    ],
  }),
  component: MetricDetail,
});

function MetricDetail() {
  const { id } = Route.useParams();
  const profile = useProfile();

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

  const metric = profile.snapshot.find((s) => s.id === id);

  if (!metric) {
    return (
      <Screen title="Not part of your portrait" subtitle="This line no longer exists.">
        <Link to="/profile" className="text-[15px] text-accent">
          Back to profile
        </Link>
      </Screen>
    );
  }

  return (
    <Screen title={metric.label} subtitle={metric.detail}>
      <div className="rounded-2xl bg-surface px-5 py-6">
        <p className="label-caps">Right now</p>
        <p className="mt-2 font-serif text-[28px] leading-tight">{metric.value}</p>
      </div>

      {metric.notes.length > 0 && (
        <>
          <p className="mt-7 label-caps">What sits behind it</p>
          <Card>
            {metric.notes.map((n) => (
              <p key={n} className="px-4 py-3.5 text-[14px] leading-relaxed text-muted-foreground">
                {n}
              </p>
            ))}
          </Card>
        </>
      )}

      <Link
        to="/teach"
        className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Teach Ciatta more
      </Link>
    </Screen>
  );
}
