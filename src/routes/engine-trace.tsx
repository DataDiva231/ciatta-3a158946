/**
 * Engine trace — an internal review surface, not part of the product
 * experience. It exists so every recommendation can be audited: which evidence
 * matched, why the others didn't, and how uncertain each dimension is.
 */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { engineTrace } from "@/lib/engine.functions";
import { deviceKey } from "@/lib/use-engine";

export const Route = createFileRoute("/engine-trace")({
  head: () => ({
    meta: [
      { title: "Engine trace · Ciatta" },
      {
        name: "description",
        content:
          "Internal review of Ciatta's reasoning: understanding, matched evidence, applicability and uncertainty.",
      },
      { property: "og:title", content: "Engine trace · Ciatta" },
      {
        property: "og:description",
        content: "How Ciatta reached today's guidance, layer by layer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EngineTracePage,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">The trace could not be built.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Nothing to trace yet.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-serif text-3xl tracking-tight">Engine trace</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Internal. Nothing here is shown to the person using Ciatta.
      </p>
      <div className="mt-10 space-y-10">{children}</div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</h2>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function EngineTracePage() {
  const query = useQuery({
    queryKey: ["engine-trace"],
    enabled: typeof window !== "undefined",
    queryFn: () => engineTrace({ data: { deviceKey: deviceKey() } }),
  });

  if (query.isPending)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Reading the current understanding…</p>
      </Shell>
    );

  const trace = query.data;
  if (!trace)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">No understanding recorded yet.</p>
      </Shell>
    );

  const u = trace.understanding;

  return (
    <Shell>
      <Section label="Understanding">
        <p>
          depth {u.depth} · state {u.state} · {u.observationCount} observation(s) · known{" "}
          {u.daysKnown} day(s)
        </p>
        <p className="text-muted-foreground">newest: {u.newest ?? "nothing recent"}</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
          {Object.entries(u.context).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt>{k}</dt>
              <dd className="text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground">
          holding: {u.beliefsHolding.join(" · ") || "none"}
        </p>
        <p className="text-muted-foreground">
          forming: {u.beliefsForming.join(" · ") || "none"}
        </p>
      </Section>

      <Section label="Uncertainty (never collapsed)">
        <p>understanding {trace.uncertainty.understanding}</p>
        <p>evidence {trace.uncertainty.evidence}</p>
        <p>applicability {trace.uncertainty.applicability}</p>
      </Section>

      <Section label={`Evidence library ${trace.library.version}`}>
        <p className="text-muted-foreground">
          {trace.library.active} active of {trace.library.total} records
        </p>
        <ul className="mt-2 space-y-3">
          {trace.candidates.map((c) => (
            <li key={c.evidenceId} className="rounded-lg border border-border/60 p-3">
              <p className="font-medium">{c.evidenceId}</p>
              <p className="text-muted-foreground">
                {c.domain} · {c.evidenceQuality} quality · {c.recommendationStrength} · applicability{" "}
                {c.applicabilityScore} · match {c.personalizationMatch}
              </p>
              <p className={c.rejectedBecause ? "text-muted-foreground" : "text-foreground"}>
                {c.rejectedBecause ?? "applicable"}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Guidance returned">
        <p className="font-serif text-xl">{trace.guidance.lead}</p>
        <p>{trace.guidance.rest}</p>
        <p className="text-muted-foreground">{trace.guidance.support}</p>
        {trace.guidance.meta ? (
          <div className="mt-3 rounded-lg border border-border/60 p-3 text-muted-foreground">
            <p>
              {trace.guidance.meta.evidenceId} · v{trace.guidance.meta.version} · reviewed{" "}
              {trace.guidance.meta.dateReviewed}
            </p>
            <p>
              {trace.guidance.meta.intervention} → {trace.guidance.meta.expectedOutcome}
            </p>
            <ul className="mt-2 list-disc pl-4">
              {trace.guidance.meta.citations.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">
            No recommendation. Continue learning was the correct answer.
          </p>
        )}
      </Section>

      <Section label="Reasoning chain">
        <ol className="space-y-2">
          {trace.chain.map((step, i) => (
            <li key={`${step.layer}-${i}`}>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {step.layer}
              </span>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </Section>
    </Shell>
  );
}
