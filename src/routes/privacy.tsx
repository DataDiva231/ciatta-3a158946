import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Ciatta" },
      {
        name: "description",
        content:
          "What Ciatta holds, why it holds it, and how everything it learns about you stays private to your account.",
      },
      { property: "og:title", content: "Privacy Policy — Ciatta" },
      {
        property: "og:description",
        content: "What Ciatta holds, and how it stays private to you.",
      },
      { name: "twitter:title", content: "Privacy Policy — Ciatta" },
      {
        name: "twitter:description",
        content: "What Ciatta holds, and how it stays private to you.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-[100svh] bg-background px-8 pt-14 pb-24">
      <Link to="/auth" className="text-[14px] text-muted-foreground">
        ← Back
      </Link>
      <h1 className="mt-10 font-serif text-[32px] leading-[1.12] tracking-[-0.02em]">
        Privacy Policy
      </h1>
      <div className="mt-6 space-y-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <p>
          Everything you share — what you tell Ciatta, what it notices, and what it comes to believe
          — is held inside your own account and read only for you.
        </p>
        <p>
          Ciatta holds it for one reason: to understand you a little better each day. It is never
          sold, and never used to build a picture of anyone but you.
        </p>
        <p>
          If you connect health data, only the measurements you allow are read, and you can
          disconnect at any moment.
        </p>
        <p>
          You can ask Ciatta to forget everything. Choosing to delete your data removes your account
          and all of it, permanently.
        </p>
      </div>
    </div>
  );
}
