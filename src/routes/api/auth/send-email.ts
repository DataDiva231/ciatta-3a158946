import { createHmac, timingSafeEqual } from "node:crypto";

import { render } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { SignupEmail } from "@/lib/email-templates/signup";

/**
 * Supabase's "Send Email" Auth Hook. Supabase stops sending its own auth
 * emails once this hook is enabled and calls this endpoint instead for every
 * signup/recovery/magic-link/etc. — we render Ciatta's branded templates and
 * hand delivery off to Resend.
 *
 * Replaces the old Lovable-proprietary webhook (src/routes/lovable/email/
 * auth/webhook.ts), which verified against Lovable's own signing scheme and
 * sent through Lovable's own API — neither of which apply to an independent
 * Supabase project.
 */

const SITE_NAME = "ciatta";
const SITE_URL = "https://ciatta.io";
const FROM = "Ciatta <noreply@ciatta.io>";

// Standard Webhooks tolerance: reject anything older/newer than this to
// block replay of a captured request.
const TIMESTAMP_TOLERANCE_SECONDS = 300;

type EmailData = {
  token: string;
  token_hash: string;
  token_new: string;
  token_hash_new: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  old_email?: string;
};

type HookPayload = {
  user: { email: string; new_email?: string };
  email_data: EmailData;
};

/** Verifies the Standard Webhooks signature Supabase signs this request with. */
function verifySignature(secret: string, id: string, timestamp: string, body: string, signatureHeader: string): boolean {
  const withoutVersion = secret.startsWith("v1,") ? secret.slice(3) : secret;
  const base64Part = withoutVersion.startsWith("whsec_") ? withoutVersion.slice(6) : withoutVersion;
  const secretBytes = Buffer.from(base64Part, "base64");

  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expected, "base64");

  // svix-signature can list multiple space-separated "v1,<sig>" entries
  // (key rotation) — valid if any one matches.
  return signatureHeader
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter((sig): sig is string => Boolean(sig))
    .some((sig) => {
      const sigBuf = Buffer.from(sig, "base64");
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
    });
}

function hookError(httpCode: number, message: string): Response {
  return Response.json({ error: { http_code: httpCode, message } }, { status: httpCode });
}

/** Supabase's own verify endpoint — not the app's domain — completes the auth action. */
function verifyUrl(tokenHash: string, type: string, redirectTo: string): string {
  const base = process.env["SUPABASE_URL"];
  const params = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

async function buildEmail(
  recipient: string,
  data: EmailData,
  user: HookPayload["user"],
): Promise<{ subject: string; element: React.ReactElement } | null> {
  switch (data.email_action_type) {
    case "signup":
      return {
        subject: "Verify your email for Ciatta",
        element: React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient,
          confirmationUrl: verifyUrl(data.token_hash, "signup", data.redirect_to),
        }),
      };
    case "invite":
      return {
        subject: "You've been invited",
        element: React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: verifyUrl(data.token_hash, "invite", data.redirect_to),
        }),
      };
    case "magiclink":
      return {
        subject: "Your login link",
        element: React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl: verifyUrl(data.token_hash, "magiclink", data.redirect_to),
        }),
      };
    case "recovery":
      return {
        subject: "Reset your password",
        element: React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl: verifyUrl(data.token_hash, "recovery", data.redirect_to),
        }),
      };
    case "reauthentication":
      return {
        subject: "Your verification code",
        element: React.createElement(ReauthenticationEmail, { token: data.token }),
      };
    case "email_change":
      // KNOWN LIMITATION: only handles the simple single-confirmation case
      // (Secure Email Change disabled, Supabase's default). Supabase's own
      // docs warn the two-call double-confirmation mapping (which recipient
      // pairs with token vs token_new) is easy to get backwards, and this
      // app has no reachable "change email" UI yet to verify against. If
      // Secure Email Change is enabled later, this needs rework and real
      // testing before trusting it.
      return {
        subject: "Confirm your new email",
        element: React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? user.email,
          email: recipient,
          newEmail: user.new_email ?? "",
          confirmationUrl: verifyUrl(data.token_hash, "email_change", data.redirect_to),
        }),
      };
    default:
      // Notification-only types we have no template for (password_changed_
      // notification, mfa_factor_enrolled_notification, etc.) — safe no-op.
      return null;
  }
}

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed [${res.status}]: ${detail}`);
  }
}

export const Route = createFileRoute("/api/auth/send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SUPABASE_AUTH_HOOK_SECRET"];
        if (!secret) return hookError(500, "SUPABASE_AUTH_HOOK_SECRET is not configured");

        const id = request.headers.get("svix-id");
        const timestamp = request.headers.get("svix-timestamp");
        const signature = request.headers.get("svix-signature");
        if (!id || !timestamp || !signature) return hookError(401, "Missing webhook signature headers");

        const skewSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
        if (!Number.isFinite(skewSeconds) || skewSeconds > TIMESTAMP_TOLERANCE_SECONDS) {
          return hookError(401, "Webhook timestamp out of tolerance");
        }

        const body = await request.text();
        if (!verifySignature(secret, id, timestamp, body, signature)) {
          return hookError(401, "Invalid webhook signature");
        }

        let payload: HookPayload;
        try {
          payload = JSON.parse(body) as HookPayload;
        } catch {
          return hookError(400, "Invalid JSON payload");
        }

        const recipient = payload.user.email;
        const email = await buildEmail(recipient, payload.email_data, payload.user);
        if (!email) return Response.json({});

        // Rendering + the Resend API call together take ~2s, which is long
        // enough that Supabase's own hook-response timeout gives up and
        // reports failure to the person even though the send completes
        // fine a moment later. Acknowledge the hook immediately and do the
        // actual work in the background via Cloudflare's waitUntil — a send
        // failure here only shows up in our own logs, not as a broken
        // password-reset/magic-link request for the person waiting on it.
        const send = (async () => {
          try {
            const [html, text] = await Promise.all([
              render(email.element),
              render(email.element, { plainText: true }),
            ]);
            await sendViaResend(recipient, email.subject, html, text);
          } catch (error) {
            console.error("[send-email] failed:", error);
          }
        })();

        const waitUntil = (request as unknown as { waitUntil?: (p: Promise<unknown>) => void })
          .waitUntil;
        if (typeof waitUntil === "function") {
          waitUntil(send);
        } else {
          // No Cloudflare execution context (e.g. local dev) — just await it.
          await send;
        }

        return Response.json({});
      },
    },
  },
});
