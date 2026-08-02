## What I found

I checked the email setup for `notify.ciatta.io`:

- **Sending domain: verified.** The root domain `ciatta.io` and the delegated subdomain `notify.ciatta.io` both check out.
- **DNS records: fully propagated.** The verification TXT record and both NS delegation records (`ns3.lovable.cloud`, `ns4.lovable.cloud`) are live — that's why the domain flipped to Verified.
- **Still pending: the send-path activation step only.** Status reads exactly: "Send path not ready — Timed out waiting for email delivery path verification."

So this is **not** a DNS configuration issue on your side. Nothing to add or change at your registrar.

The send-path check is the last step of provisioning: the platform calls the app's email webhook route on the **published** app to confirm mail can actually be dispatched. Your webhook route exists in the codebase at the correct path, but that route only becomes reachable when the app is published with it. If the published deployment predates the email routes, the check has nothing to answer it and times out — which matches what we're seeing.

## Plan

1. **Confirm the email routes are complete and unblocked** — re-verify the auth webhook route, the email templates registry, and that `/lovable/*` requests bypass the app's middleware and route guards (an early redirect on that path would also make the send-path probe time out).
2. **Publish the app** so the email webhook route goes live at your production domain. This is the step that lets the send-path check succeed.
3. **Rerun email setup** from Cloud → Emails so the platform re-probes the delivery path instead of waiting for the timed-out attempt to retry.
4. **Re-check status** once, to confirm the send path flips to ready. No repeated polling.
5. **Test send end-to-end** — trigger a real signup verification email, then read the delivery logs to confirm a `sent` event for the recipient and that the branded Ciatta template rendered. If the log shows a rejection or suppression instead, report the exact reason.
6. **Raise the auth email rate limit** once sending is active (the default hourly cap is very low and will throttle real signups).

## Technical notes

- Verification blocker is platform-side provisioning, not DNS; no registrar changes needed.
- The send-path probe hits `src/routes/lovable/email/auth/webhook.ts`, which delegates to `createAuthEmailHandler`. It will be left as-is apart from confirming `/lovable/*` passthrough in `src/start.ts` and root-route `beforeLoad`.
- No SQL migrations, email tables, or queues are involved — delivery state lives platform-side. Please proceed with the proposed plan. Publish the latest build containing the email webhook routes, rerun the email delivery setup, verify that the send-path activation completes successfully, and perform an end-to-end signup test. Confirm the final result with delivery logs showing a successful verification email sent from `noreply@ciatta.io`