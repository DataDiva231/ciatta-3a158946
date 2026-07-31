import { createFileRoute } from "@tanstack/react-router";

import { TeachUpload } from "@/components/ciatta/teach-upload";

export const Route = createFileRoute("/attach")({
  head: () => ({
    meta: [
      { title: "Attach — Ciatta" },
      {
        name: "description",
        content:
          "Attach a lab result, prescription or clinic letter as a PDF, and Ciatta reads it alongside your daily signals.",
      },
      { property: "og:title", content: "Attach — Ciatta" },
      {
        property: "og:description",
        content: "Teach Ciatta with your lab results and clinical documents.",
      },
    ],
  }),
  component: AttachPage,
});

function AttachPage() {
  return (
    <TeachUpload
      category="Document"
      title="Attach"
      intro="Bloodwork, a prescription, a clinic letter. Ciatta reads it next to your daily signals."
      accept="application/pdf"
      emptyLabel="Choose a PDF"
      notePlaceholder="What is this document?"
      examples={["Blood panel", "Prescription", "Ultrasound report"]}
    />
  );
}
