import { createFileRoute } from "@tanstack/react-router";

import { TeachUpload } from "@/components/ciatta/teach-upload";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Capture — Ciatta" },
      {
        name: "description",
        content:
          "Show Ciatta what you're seeing. A photo of a rash, a supplement label, a swollen ankle — it becomes part of your record.",
      },
      { property: "og:title", content: "Capture — Ciatta" },
      {
        property: "og:description",
        content: "Teach Ciatta with a photo from your camera.",
      },
    ],
  }),
  component: CapturePage,
});

function CapturePage() {
  return (
    <TeachUpload
      category="Photo"
      title="Capture"
      intro="Some things are easier to show than to describe."
      accept="image/*"
      useCamera
      emptyLabel="Take a photo or choose one"
      notePlaceholder="What should Ciatta notice here?"
      examples={["Skin change", "Supplement label", "Swelling"]}
    />
  );
}
