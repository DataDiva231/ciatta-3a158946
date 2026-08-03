import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** The single conversion element on the page. Quiet, editorial, no urgency. */
export function WaitlistForm({
  source,
  align = "left",
  className = "",
}: {
  source: string;
  align?: "left" | "center";
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state === "sending" || state === "done") return;
    setState("sending");
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase(), source });
    // An address already on the list is still a success from the visitor's side.
    if (error && error.code !== "23505") setState("error");
    else setState("done");
  }

  if (state === "done") {
    return (
      <p
        className={`text-ink-soft text-[14px] leading-[1.7] ${align === "center" ? "text-center" : ""} ${className}`}
      >
        You&rsquo;re on the list. We&rsquo;ll write when Ciatta is ready for you.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`${align === "center" ? "mx-auto" : ""} w-full max-w-[420px] ${className}`}
    >
      <div className="border-hairline flex items-center gap-3 border-b pb-3">
        <label className="sr-only" htmlFor={`waitlist-${source}`}>
          Email address
        </label>
        <input
          id={`waitlist-${source}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email"
          className="text-ink placeholder:text-ink-faint min-w-0 flex-1 bg-transparent text-[14px] outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="text-clay shrink-0 text-[13px] tracking-[0.02em] transition-opacity duration-300 hover:opacity-70 disabled:opacity-50"
        >
          {state === "sending" ? "Joining…" : "Join Waitlist"}
        </button>
      </div>
      <p
        className={`text-ink-faint mt-3 text-[11.5px] ${align === "center" ? "text-center" : ""}`}
      >
        {state === "error"
          ? "That didn't go through. Please try again."
          : "Early access. No noise."}
      </p>
    </form>
  );
}
