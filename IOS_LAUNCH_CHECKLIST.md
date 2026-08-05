# Ciatta iOS Launch Roadmap

Our goal is to ship the first production version of Ciatta on the Apple App Store.

For now, **ignore Android completely.** Android development will begin only after the iOS app has been approved and released.

## How I want you to work

- Focus on one task at a time.
- Explain what you're going to do before making changes.
- Complete each task thoroughly before moving to the next.
- If a task requires manual work from me (Apple Developer account, App Store Connect, screenshots, attorney review, physical iPhone testing, etc.), stop and clearly explain exactly what I need to do.
- If you discover a blocker, explain why it blocks the current task and recommend the best solution before proceeding.
- When a task is completed, mark it complete and update this roadmap.
- Keep this checklist as a living project document (IOS_LAUNCH_CHECKLIST.md) in the repository so our progress is always tracked.

---

## Mode: Launch Readiness

**Phase 3 architecture migration is paused.** `INTELLIGENCE_ARCHITECTURE.md` (frozen) and `PHASE_3_MIGRATION_PLAN.md` remain the canonical plan for that work — see `ARCHITECTURE_MIGRATION_LOG.md` for where it stands (milestone A3 complete, everything after it deliberately on hold). Nothing below includes architecture work unless it's a genuine App Store submission blocker — none currently are, confirmed by the review that produced this reorganization.

Everything below is reordered strictly by launch dependency, not by the original phase numbering. Detailed history of already-completed work (email provider setup, HealthKit integration, the Arc BLE native bridge) is kept further down as reference — nothing there was lost, just moved out of the critical path view.

---

## Must Complete Before TestFlight

Ordered so earlier items unblock or de-risk later ones.

- [ ] **1. Verify password reset + magic-link authentication end-to-end**
  A real fix was already made (the missing PKCE session exchange in `reset-password.tsx`) and deployed, but was never explicitly confirmed working after a completed test — the checklist item has stayed unchecked. Magic-link sign-in has never been tested at all in this project. Auth is core functionality every tester and every Apple reviewer will exercise directly; a broken flow undermines trust in everything else before they see anything. **Recommended as the next engineering task — see below.**

- [ ] **2. App icon**
  Pulled forward from the old Phase 5 (Design). Needed to successfully archive a valid build in Xcode — without it, the archive step below is blocked outright, not just cosmetically incomplete. Requires your visual design decision; I can implement the asset set once you provide artwork or direction.

- [ ] **3. Baseline QA pass — confirm the app works, not full exhaustive polish**
  Narrowed from the old Phase 4. Goal: no crashes, no dead ends, core flows (onboarding, Today, Teach, Journey, sign-in/sign-up) complete successfully. Full exhaustive edge-case QA is realistically done *during* TestFlight — that's what internal testing is for — but a baseline pass should happen first so TestFlight builds aren't wasted on something obviously broken.
  Progress so far: a browser-based onboarding pass found and fixed two real bugs (a render-purity `setState` bug affecting `ProductTour`, and a dead lookup in Profile). Today, Teach, Journey, authentication edge cases, offline behavior, error handling, and physical-device testing are not yet done.

- [ ] **4. Archive and upload the first build to App Store Connect**
  Requires 1–3 above, plus a minimal App Store Connect app record (bundle ID reserved, app entry created — not the full metadata listing yet, just somewhere to upload to) and answering the standard export-compliance question during upload.

---

## Must Complete Before App Store Submission

Can proceed in parallel with, or after, TestFlight — these block final review submission specifically, not getting a build into testers' hands.

- [ ] **5. Complete internal TestFlight testing, resolve what it finds**
- [ ] **6. Full exhaustive QA pass** — the rest of the old Phase 4: offline behavior, error handling, and notification-permission flow. Note on that last one: since real push notifications aren't implemented (see "Can wait" below), there's no real permission *request* to test yet — this item currently means confirming the app never mis-requests a permission it doesn't need, not testing actual delivery.
- [ ] **7. Attorney approval — Privacy Policy and Terms of Service**
  Your dependency, not mine — I can prepare or revise draft language on request, but can't substitute for legal sign-off. Apple explicitly checks for a working, accurate privacy policy at submission, and this is a health-data app, so scrutiny will be real.
- [ ] **8. Apple's Privacy Nutrition Labels**
  Depends on the data-collection surface being settled — it should be, given the Phase 1/2 coherence work already completed.
- [ ] **9. Full App Store Connect listing** — description, keywords, screenshots, pricing and availability, support URL, age rating questionnaire.
- [ ] **10. Finalize launch screen**
  Doesn't block archiving (Capacitor's default template already satisfies Xcode), but should be real before reviewers or users see it.
- [ ] **11. Submit to Apple for App Review**

---

## Can Wait Until After Launch

Nothing here blocks App Store submission. Listed so it isn't lost, not because it doesn't matter.

- **Oura / WHOOP / Fitbit integrations** — already explicitly deferred by your own decision earlier in this project.
- **Arc BLE physical-hardware verification + reconciling its "Coming soon" status in Sources** (`PRODUCT_COHERENCE_ROADMAP.md` 1.5) — the app functions fully without a connected Arc device; this doesn't block review.
- **State of Mind HealthKit metric** (iOS 18+) — deferred already, see the HealthKit detail below.
- **Real push notifications** — the honest "coming soon" labeling (`PRODUCT_COHERENCE_ROADMAP.md` 1.4, done) is sufficient for launch. Building real delivery is a genuine post-launch feature, not a submission requirement.
- **Website CTA swap to "Download on the App Store"** — already explicitly scheduled as a post-launch follow-up (`PRODUCT_COHERENCE_ROADMAP.md` 1.8).
- **All of Phase 3 architecture migration** (`INTELLIGENCE_ARCHITECTURE.md`, `PHASE_3_MIGRATION_PLAN.md`) — paused per this reorganization. Milestone A3 is complete; everything after it resumes after launch.
- **Android** — explicitly out of scope until iOS ships.

---

## Recommended Next Task

**Verify password reset and magic-link authentication end-to-end.** Reasoning: it's the only item on the "before TestFlight" list that's purely an engineering task I can execute right now without waiting on your design input (icon) or accumulating QA hours — and it's foundational enough that everything else (QA pass, TestFlight testers signing in, Apple's reviewers testing sign-up) depends on auth actually working. It was also left in the worst possible state for a checklist: a real fix was made and deployed, but never confirmed, which means right now nobody actually knows if it works.

Concretely, I can use Supabase's admin API to generate real recovery and magic links server-side (the same technique used earlier in this project for test-account setup) and drive the full flow in a browser — including the PKCE exchange the earlier fix touched — without needing to wait on real email delivery to verify it.

---

## Completed Work — Reference

Detailed history of everything already done, kept for institutional memory. Nothing here is on the critical path above unless linked from it.

### Production email provider
**Active setup**: plain Supabase custom SMTP → Resend (`smtp.resend.com`), sending domain `ciatta.io` (verified). Set directly via the Management API: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_admin_email` (`noreply@ciatta.io`), `smtp_sender_name` (`Ciatta`). Emails use Supabase's plain default templates, not the custom-branded ones.

**Abandoned approach**: a custom Supabase "Send Email" Auth Hook (`src/routes/api/auth/send-email.ts`, still in the codebase but currently **disabled** — `hook_send_email_enabled: false`) that would have rendered the existing branded React Email templates and sent via Resend's API. Built and verified correct via a simulated signed request, and Supabase's config confirmed the hook as enabled with the right URL and secret — but real requests never reached it despite extensive debugging. Root cause not identified; worth revisiting later via a Supabase support ticket or a real Edge Function as the hook target instead of an external URL.

Known limitation if that path is ever revisited: `email_change` only handles the simple single-confirmation case, untested against Secure Email Change.

### Production voice transcription
Was calling Lovable's AI gateway with a placeholder key — switched `src/routes/api/transcribe.ts` to call OpenAI's transcription API directly, since the streaming event format the client expects turned out to be OpenAI's native format passed through unchanged. `OPENAI_API_KEY` set (local + Cloudflare). Verified directly against OpenAI's API with real generated speech audio. Not tested: the full authenticated route end-to-end with a real in-app recording — covered by the QA pass above.

### Apple HealthKit integration
Client-side code already existed fully built but had no native implementation — built a real Capacitor plugin (`CiattaHealthPlugin.swift`, `CiattaHealthTypes.swift`), registered via `ViewController.swift`, with the HealthKit entitlement and capability enabled. `NSHealthShareUsageDescription` finalized and confirmed in the built bundle.

Three real bugs found and fixed during physical-device testing: (1) `package.json`'s `"sideEffects": false` was tree-shaking the plugin-registration module — fixed via an explicitly-called named export; (2) Capacitor doesn't auto-discover locally-bundled plugins — fixed via `ViewController.swift` overriding `capacitorDidLoad()`; (3) `SceneDelegate.swift` was instantiating `CAPBridgeViewController()` directly, bypassing the storyboard (and therefore the fix in #2) entirely — fixed by pointing it at `ViewController()`. Also fixed: `capacitor.config.ts` had no `allowNavigation` entry, silently blocking the OAuth redirect chain.

Verified on physical iPhone: connect button works, the real HealthKit permission sheet appears, `isAvailable()`/`requestAuthorization()` resolve successfully.

Deferred: **State of Mind** (`HKStateOfMind`, iOS 18+) — a distinct sample class not confidently verifiable against the other 25 working metrics without risking a build break.

**Full list of what Ciatta can read**, and device/OS constraints:

| Metric | HealthKit identifier | Constraints |
|---|---|---|
| Menstrual cycle | `menstrualFlow` | None |
| Basal body temperature | `basalBodyTemperature` | None |
| Wrist temperature | `appleSleepingWristTemperature` | iOS 16+, Apple Watch Series 8/Ultra or later only |
| Sleep analysis | `sleepAnalysis` | None |
| Heart rate | `heartRate` | None |
| Resting heart rate | `restingHeartRate` | None |
| Heart rate variability | `heartRateVariabilitySDNN` | None |
| Walking heart rate average | `walkingHeartRateAverage` | None |
| VO₂ max | `vo2Max` | Typically Apple Watch Series 3+, watchOS 7+ outdoor workouts |
| Respiratory rate | `respiratoryRate` | Typically via Apple Watch sleep tracking |
| Blood oxygen (SpO₂) | `oxygenSaturation` | Background readings need Apple Watch Series 6+; manual entries work anywhere |
| Steps | `stepCount` | None |
| Walking + running distance | `distanceWalkingRunning` | None |
| Active energy | `activeEnergyBurned` | None |
| Workouts | `workoutType()` | None |
| Exercise minutes | `appleExerciseTime` | Populated via Apple Watch |
| Standing time | `appleStandTime` | Populated via Apple Watch |
| Flights climbed | `flightsClimbed` | Needs a barometer (iPhone 6+) |
| Body weight | `bodyMass` | None (manual or connected scale) |
| Body fat percentage | `bodyFatPercentage` | None (manual or connected scale) |
| Water intake | `dietaryWater` | None (manual or connected app) |
| Mindful minutes | `mindfulSession` | None |
| Blood pressure (systolic/diastolic) | `bloodPressureSystolic`/`Diastolic` | None (manual or connected cuff) |
| Blood glucose | `bloodGlucose` | None (manual or connected meter) |
| **State of Mind** | `stateOfMindType()` | **Not implemented** — deferred |

None require any entitlement beyond `com.apple.developer.healthkit`, including Blood Pressure and Blood Glucose — ordinary quantity samples, not Apple's separately-gated Clinical Health Records feature.

### Ciatta Arc earring (BLE) native bridge
The client-side pipeline (`src/lib/ble/*`, `src/lib/observations/*`, `src/lib/sessions/*`, `src/lib/intelligence/*`) already existed fully built — GATT parsing, connection state machine, validation/quality scoring, session lifecycle, through to the intelligence layer, entirely client-side with a working dev UI at `/diagnostics`. All of it depended on the Web Bluetooth API, which does not exist in iOS's WKWebView, so none of it could run on the phone.

Built `ios/App/App/CiattaBluetoothPlugin.swift` (CoreBluetooth-backed, generic UUID/deviceId-keyed GATT primitives) and `src/lib/native/ciatta-bluetooth-plugin.ts` (implements the exact `Bluetooth`/`BleDevice`/`BleServer`/`BleCharacteristic` shapes `web-bluetooth.ts` already defines, assigned onto `navigator.bluetooth` natively) — zero changes needed to the manager, observation pipeline, sessions, or intelligence layers.

Added `NSBluetoothAlwaysUsageDescription`, registered the plugin alongside `CiattaHealthPlugin`. Verified: TypeScript type-checks clean, full Xcode simulator build succeeds. **Not yet verified against a real Arc earring on physical hardware** — tracked as a "can wait" item above, not a launch blocker.

Two open questions once real hardware is available: (1) the UUIDs/packet format in `src/lib/ble/protocol.ts` are marked "provisional" pending the real firmware spec; (2) background operation (logging while locked/backgrounded) needs `bluetooth-central` background mode plus CoreBluetooth state restoration, deliberately left out pending a real decision on the App Review/battery tradeoff.

---

## Definition of Done

The project is complete only when:

- The production build has been approved by Apple.
- Ciatta is live on the Apple App Store.
- The repository checklist has been fully updated to reflect the completed launch.

Do not begin Android development until this roadmap has been completed successfully.
