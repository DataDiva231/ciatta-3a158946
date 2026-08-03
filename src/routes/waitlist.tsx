import { createFileRoute } from "@tanstack/react-router";

import { Everyday } from "@/components/landing/everyday";
import { LandingFooter } from "@/components/landing/footer";
import { HeroToday } from "@/components/landing/hero-today";
import { Intelligence } from "@/components/landing/intelligence";
import { Manifesto } from "@/components/landing/manifesto";
import { Products } from "@/components/landing/products";

const TITLE = "Ciatta — Finally understand your body";
const DESCRIPTION =
  "Ciatta is continuous women's health intelligence. It listens, learns what's normal for you, and tells you what your body is asking for. Join the waitlist.";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  return (
    <main className="bg-morning min-h-[100svh]">
      <HeroToday />
      <Everyday />
      <Products />
      <Intelligence />
      <Manifesto />
      <LandingFooter />
    </main>
  );
}
