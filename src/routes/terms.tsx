import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Ciatta" },
      {
        name: "description",
        content:
          "The agreement between you and Ciatta: how the app may be used, and what Ciatta is and isn't.",
      },
      { property: "og:title", content: "Terms of Use — Ciatta" },
      {
        property: "og:description",
        content: "How Ciatta may be used, and what it is and isn't.",
      },
      { name: "twitter:title", content: "Terms of Use — Ciatta" },
      {
        name: "twitter:description",
        content: "How Ciatta may be used, and what it is and isn't.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-[100svh] bg-background px-8 pt-14 pb-24">
      <Link to="/auth" className="text-[14px] text-muted-foreground">
        ← Back
      </Link>
      <h1 className="mt-10 font-serif text-[32px] leading-[1.12] tracking-[-0.02em]">
        Terms of Use
      </h1>
      <div className="mt-6 space-y-5 text-[14.5px] leading-relaxed text-muted-foreground">
        <p>
          Ciatta is a companion for understanding your own body. It is not a doctor, and nothing it
          shares is a diagnosis or medical advice. For anything that worries you, speak with a
          clinician.
        </p>
        <p>
          Your account is yours alone. Please keep your sign-in details private, and don&apos;t use
          Ciatta to store information about someone else without their knowledge.
        </p>
        <p>
          You may stop at any time. Deleting your data removes everything Ciatta has learned about
          you, and that removal is permanent.
        </p>
        <p>
          These terms may change as Ciatta grows. If something meaningful changes, you&apos;ll be
          told inside the app rather than quietly.
        </p>
      </div>
    </div>
  );
}
