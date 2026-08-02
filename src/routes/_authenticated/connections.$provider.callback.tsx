/**
 * Where a hosted source returns after authorization. The code is handed
 * straight to the server, which verifies the state, seals the credentials and
 * runs a first sync before sending the person back to their sources.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { Screen } from "@/components/ciatta/screen";
import { sourceById } from "@/lib/health-sources";
import { completeSourceAuthorization } from "@/lib/health-sources.functions";

export const Route = createFileRoute("/_authenticated/connections/$provider/callback")({
  head: () => ({
    meta: [
      { title: "Finishing a connection — Ciatta" },
      {
        name: "description",
        content: "Ciatta is finishing a connection to one of your health sources.",
      },
      { property: "og:title", content: "Finishing a connection — Ciatta" },
      {
        property: "og:description",
        content: "One moment while Ciatta finishes connecting your health source.",
      },
    ],
  }),
  component: ConnectionCallback,
});

function ConnectionCallback() {
  const { provider } = Route.useParams();
  const navigate = useNavigate();
  const complete = useServerFn(completeSourceAuthorization);
  const descriptor = sourceById(provider);
  const [message, setMessage] = useState("One moment.");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? "";
    const state = params.get("state") ?? "";

    if (!descriptor || !code) {
      setMessage("That connection didn't finish.");
      const timer = setTimeout(
        () => void navigate({ to: "/profile/settings/$section", params: { section: "sources" } }),
        1400,
      );
      return () => clearTimeout(timer);
    }

    void complete({
      data: {
        provider: descriptor.id,
        code,
        state,
        redirectUri: `${window.location.origin}/connections/${descriptor.id}/callback`,
      },
    })
      .then((result) => {
        setMessage(
          result.ok
            ? `${descriptor.name} is connected. I'll start reading from it.`
            : "That connection couldn't be verified.",
        );
      })
      .catch(() => setMessage("That connection couldn't be verified."))
      .finally(() => {
        setTimeout(
          () => void navigate({ to: "/profile/settings/$section", params: { section: "sources" } }),
          1400,
        );
      });
    return undefined;
  }, [complete, descriptor, navigate]);

  return (
    <Screen title="Connecting" subtitle={message}>
      <div className="mt-8 h-1 w-16 animate-pulse rounded-full bg-secondary" aria-hidden="true" />
    </Screen>
  );
}
