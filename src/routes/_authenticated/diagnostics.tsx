/**
 * Developer diagnostics — internal only.
 *
 * A flat, honest read-out of the Bluetooth layer: what we're connected to, what
 * it's saying, and how often. Nothing here is part of the product experience,
 * and nothing here generates understanding.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useBluetooth } from "@/lib/ble/use-bluetooth";
import { EVIDENCE_LABELS } from "@/lib/evidence/model";
import { evidenceService } from "@/lib/evidence/service";
import { useEvidence } from "@/lib/evidence/use-evidence";
import { FEATURE_LABELS } from "@/lib/features/model";
import { featureService } from "@/lib/features/service";
import { useFeatures } from "@/lib/features/use-features";
import {
  INTELLIGENCE_DOMAIN_LABELS,
  INTELLIGENCE_STATUS_LABELS,
  type IntelligenceStatus,
} from "@/lib/intelligence/model";
import { intelligenceService } from "@/lib/intelligence/service";
import { useIntelligence } from "@/lib/intelligence/use-intelligence";
import { useTodayIntelligence } from "@/lib/intelligence/use-today-intelligence";
import { observationService } from "@/lib/observations/service";
import { useObservations } from "@/lib/observations/use-observations";
import { SESSION_LIFECYCLE_LABELS } from "@/lib/sessions/model";
import { sessionService } from "@/lib/sessions/service";
import { useSessions } from "@/lib/sessions/use-sessions";


export const Route = createFileRoute("/_authenticated/diagnostics")({
  head: () => ({
    meta: [
      { title: "Bluetooth diagnostics · Ciatta" },
      {
        name: "description",
        content:
          "Internal Bluetooth diagnostics: connection state, device details and live Arc sensor packets.",
      },
      { property: "og:title", content: "Bluetooth diagnostics · Ciatta" },
      {
        property: "og:description",
        content: "Internal read-out of the Arc Bluetooth connection and live sensor stream.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticsPage,
});

const STATE_LABEL: Record<string, string> = {
  unsupported: "Not supported",
  unavailable: "Bluetooth off",
  idle: "Not connected",
  scanning: "Scanning",
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  error: "Error",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <span className="text-[13px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="font-mono text-[14px] tabular-nums">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">{children}</h2>
  );
}

function clock(at: number | null): string {
  if (!at) return "—";
  return new Date(at).toLocaleTimeString(undefined, { hour12: false }) + `.${String(at % 1000).padStart(3, "0")}`;
}

function duration(from: number | null, now: number): string {
  if (!from) return "—";
  const seconds = Math.max(0, Math.floor((now - from) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function DiagnosticsPage() {
  const ble = useBluetooth();
  const observations = useObservations();
  const features = useFeatures();
  const evidence = useEvidence();
  const intelligence = useIntelligence();
  const today = useTodayIntelligence();
  const sessions = useSessions();

  const latestFeatures = Object.values(features.latest).sort((a, b) => b.timestamp - a.timestamp);
  const latestEvidence = Object.values(evidence.latest).sort((a, b) => b.timestamp - a.timestamp);


  const latestIntelligence = Object.values(intelligence.latest).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
  const activeStates = (Object.keys(INTELLIGENCE_STATUS_LABELS) as IntelligenceStatus[]).filter(
    (state) => intelligence.states[state] > 0,
  );

  const busy = ble.state === "scanning" || ble.state === "connecting" || ble.state === "reconnecting";
  const live = ble.state === "connected";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);


  return (
    <main className="mx-auto w-full max-w-md px-6 pb-32 pt-14">
      <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">Internal</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight">Bluetooth diagnostics</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For development only. Pair with an Arc prototype and watch the raw stream.
      </p>

      {!ble.supported ? (
        <p className="mt-8 text-sm text-muted-foreground">
          This browser can't use Bluetooth. Open this screen in Chrome on desktop or Android, over
          HTTPS.
        </p>
      ) : null}

      <div className="mt-10">
        <SectionTitle>Connection</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Status" value={STATE_LABEL[ble.state] ?? ble.state} />
          <Row label="Device" value={ble.device?.name ?? "—"} />
          <Row label="Device id" value={ble.device?.id ? `${ble.device.id.slice(0, 12)}…` : "—"} />
          <Row label="RSSI" value={ble.rssi === null ? "—" : `${ble.rssi} dBm`} />
          <Row
            label="Battery"
            value={ble.batteryLevel === null ? "—" : `${ble.batteryLevel}%`}
          />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Live sensor values</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Sequence" value={ble.latest?.sequence?.toString() ?? "—"} />
          <Row
            label="Temperature"
            value={ble.latest?.temperatureC === null || ble.latest === null ? "—" : `${ble.latest.temperatureC} °C`}
          />
          <Row
            label="Heart rate"
            value={ble.latest?.heartRate ? `${ble.latest.heartRate} bpm` : "—"}
          />
          <Row label="IBI" value={ble.latest?.ibiMs ? `${ble.latest.ibiMs} ms` : "—"} />
          <Row
            label="Humidity"
            value={ble.latest?.humidity === null || ble.latest === null ? "—" : `${ble.latest.humidity}%`}
          />
        </div>
        <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">
          {ble.latest?.hex ?? "no packets yet"}
        </p>
      </div>

      <div className="mt-10">
        <SectionTitle>Stream</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Packets" value={ble.packetCount.toString()} />
          <Row label="Invalid" value={ble.invalidCount.toString()} />
          <Row label="Last packet" value={clock(ble.lastPacketAt)} />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Observations</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Session" value={observations.session?.id.slice(0, 14) ?? "—"} />
          <Row
            label="Session length"
            value={duration(observations.session?.startedAt ?? null, now)}
          />
          <Row
            label="Packets / stored"
            value={`${observations.packetsReceived} / ${observations.observationCount}`}
          />
          <Row label="Rejected" value={observations.rejectedCount.toString()} />
          <Row
            label="Avg quality"
            value={
              observations.averageQuality === null
                ? "—"
                : `${Math.round(observations.averageQuality * 100)}%`
            }
          />
          <Row
            label="Validation"
            value={
              observations.lastRejection
                ? `rejected · ${observations.lastRejection.reason.replace(/_/g, " ")}`
                : observations.latest
                  ? "valid"
                  : "—"
            }
          />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Latest observation</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row
            label="Sensor"
            value={observations.latest?.sensorType.replace(/_/g, " ") ?? "—"}
          />
          <Row
            label="Value"
            value={
              observations.latest
                ? `${observations.latest.value} ${observations.latest.unit}`
                : "—"
            }
          />
          <Row label="Timestamp" value={clock(observations.latest?.timestamp ?? null)} />
          <Row
            label="Quality"
            value={
              observations.latest
                ? `${Math.round(observations.latest.quality.score * 100)}%`
                : "—"
            }
          />
          <Row
            label="Wear / motion"
            value={
              observations.latest
                ? `${Math.round(observations.latest.quality.wear * 100)}% · ${Math.round(
                    observations.latest.quality.motion * 100,
                  )}%`
                : "—"
            }
          />
          <Row
            label="Signal / continuity"
            value={
              observations.latest
                ? `${Math.round(observations.latest.quality.signalIntegrity * 100)}% · ${Math.round(
                    observations.latest.quality.packetContinuity * 100,
                  )}%`
                : "—"
            }
          />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Features</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Extracted" value={features.featureCount.toString()} />
          <Row label="Passes" value={features.passCount.toString()} />
          <Row
            label="Rate"
            value={features.extractionRate === null ? "—" : `${features.extractionRate} / min`}
          />
          <Row
            label="Latency"
            value={
              features.lastLatencyMs === null
                ? "—"
                : `${features.lastLatencyMs} ms · avg ${features.averageLatencyMs} ms`
            }
          />
          <Row
            label="Avg quality"
            value={
              features.averageQuality === null
                ? "—"
                : `${Math.round(features.averageQuality * 100)}%`
            }
          />
          <Row
            label="Avg confidence"
            value={
              features.averageConfidence === null
                ? "—"
                : `${Math.round(features.averageConfidence * 100)}%`
            }
          />
          <Row label="Last pass" value={clock(features.lastExtractedAt)} />
          <Row label="Version" value={features.processingVersion} />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Latest features</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          {latestFeatures.length ? (
            latestFeatures.map((feature) => (
              <Row
                key={feature.id}
                label={FEATURE_LABELS[feature.featureType]}
                value={`${feature.value} ${feature.unit} · q${Math.round(
                  feature.quality * 100,
                )} c${Math.round(feature.confidence * 100)} · n${feature.sourceObservationIds.length}`}
              />
            ))
          ) : (
            <Row label="No features yet" value="—" />
          )}
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Evidence</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Evidence" value={evidence.evidenceCount.toString()} />
          <Row label="Active types" value={latestEvidence.length.toString()} />
          <Row label="Passes" value={evidence.passCount.toString()} />
          <Row
            label="Rate"
            value={evidence.fusionRate === null ? "—" : `${evidence.fusionRate} / min`}
          />
          <Row
            label="Latency"
            value={
              evidence.lastLatencyMs === null
                ? "—"
                : `${evidence.lastLatencyMs} ms · avg ${evidence.averageLatencyMs} ms`
            }
          />
          <Row
            label="Avg confidence"
            value={
              evidence.averageConfidence === null
                ? "—"
                : `${Math.round(evidence.averageConfidence * 100)}%`
            }
          />
          <Row
            label="Support"
            value={`${evidence.lastSupport.features} feat · ${evidence.lastSupport.observations} obs`}
          />
          <Row label="Last fusion" value={clock(evidence.lastFusedAt)} />
          <Row label="Version" value={evidence.processingVersion} />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Active evidence</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          {latestEvidence.length ? (
            latestEvidence.map((item) => (
              <Row
                key={item.id}
                label={EVIDENCE_LABELS[item.evidenceType]}
                value={`${item.value} ${item.unit} · c${Math.round(item.confidence * 100)} · f${
                  item.supportingFeatureIds.length
                } o${item.supportingObservationIds.length}`}
              />
            ))
          ) : (
            <Row label="No evidence yet" value="—" />
          )}
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Intelligence</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Intelligence" value={intelligence.intelligenceCount.toString()} />
          <Row label="Active domains" value={latestIntelligence.length.toString()} />
          <Row label="Passes" value={intelligence.passCount.toString()} />
          <Row
            label="Rate"
            value={
              intelligence.generationRate === null ? "—" : `${intelligence.generationRate} / min`
            }
          />
          <Row
            label="Latency"
            value={
              intelligence.lastLatencyMs === null
                ? "—"
                : `${intelligence.lastLatencyMs} ms · avg ${intelligence.averageLatencyMs} ms`
            }
          />
          <Row
            label="Avg confidence"
            value={
              intelligence.averageConfidence === null
                ? "—"
                : `${Math.round(intelligence.averageConfidence * 100)}%`
            }
          />
          <Row
            label="States"
            value={
              activeStates.length
                ? activeStates
                    .map(
                      (state) =>
                        `${INTELLIGENCE_STATUS_LABELS[state]} ${intelligence.states[state]}`,
                    )
                    .join(" · ")
                : "—"
            }
          />
          <Row
            label="Support"
            value={`${intelligence.lastSupport.evidence} evid · ${intelligence.lastSupport.features} feat · ${intelligence.lastSupport.observations} obs`}
          />
          <Row label="Last pass" value={clock(intelligence.lastGeneratedAt)} />
          <Row label="Version" value={intelligence.processingVersion} />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Active intelligence</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          {latestIntelligence.length ? (
            latestIntelligence.map((item) => (
              <Row
                key={item.id}
                label={INTELLIGENCE_DOMAIN_LABELS[item.domain]}
                value={`${INTELLIGENCE_STATUS_LABELS[item.status]} · c${Math.round(
                  item.confidence * 100,
                )} · e${item.supportingEvidenceIds.length} f${
                  item.supportingFeatureIds.length
                } o${item.supportingObservationIds.length}`}
              />
            ))
          ) : (
            <Row label="No intelligence yet" value="—" />
          )}
        </div>
      </div>

      {latestIntelligence.length ? (
        <div className="mt-10">
          <SectionTitle>Why these exist</SectionTitle>
          <div className="mt-2 space-y-4">
            {latestIntelligence.map((item) => (
              <div key={`why-${item.id}`}>
                <p className="text-[13px] uppercase tracking-[0.14em] text-muted-foreground">
                  {INTELLIGENCE_DOMAIN_LABELS[item.domain]} · {clock(item.timestamp)}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed">{item.summary}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* What Today is showing, and the full trace behind it. */}
      <div className="mt-10">
        <SectionTitle>Today intelligence</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="State" value={today.state.replace(/_/g, " ")} />
          <Row
            label="Primary"
            value={today.primary ? INTELLIGENCE_DOMAIN_LABELS[today.primary.domain] : "—"}
          />
          <Row label="Confidence" value={today.confidenceLabel} />
          <Row label="Updated" value={today.updatedAt ? clock(today.updatedAt) : "—"} />
          <Row label="Ranked" value={today.ranked.length.toString()} />
          {today.primary ? (
            <Row
              label="Support"
              value={`e${today.primary.supportingEvidenceIds.length} f${today.primary.supportingFeatureIds.length} o${today.primary.supportingObservationIds.length}`}
            />
          ) : null}
        </div>
        {today.primary ? (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {today.primary.reason}
          </p>
        ) : null}
      </div>

      {/* Session Intelligence: lifecycle, quality, summary and history. */}
      <div className="mt-10">
        <SectionTitle>Active session</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Session" value={sessions.active?.id.slice(0, 16) ?? "—"} />
          <Row
            label="Lifecycle"
            value={
              sessions.active ? SESSION_LIFECYCLE_LABELS[sessions.active.lifecycle] : "no session"
            }
          />
          <Row label="Device" value={sessions.active?.deviceName ?? "—"} />
          <Row label="Started" value={clock(sessions.active?.startedAt ?? null)} />
          <Row
            label="Duration"
            value={sessions.active ? duration(sessions.active.startedAt, now) : "—"}
          />
          <Row
            label="Last data"
            value={clock(sessions.active?.lastObservationAt ?? null)}
          />
          <Row
            label="Paused for"
            value={
              sessions.active ? `${Math.round(sessions.active.pausedMs / 1000)}s` : "—"
            }
          />
          <Row
            label="Sensors active"
            value={
              sessions.active?.sensorsActive.length
                ? sessions.active.sensorsActive.map((s) => s.replace(/_/g, " ")).join(" · ")
                : "—"
            }
          />
          <Row
            label="Obs / feat / evid / intel"
            value={
              sessions.active
                ? `${sessions.active.counts.observations} / ${sessions.active.counts.features} / ${sessions.active.counts.evidence} / ${sessions.active.counts.intelligence}`
                : "—"
            }
          />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Session quality</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row
            label="Overall"
            value={
              sessions.active ? `${Math.round(sessions.active.quality.score * 100)}%` : "—"
            }
          />
          <Row
            label="Signal"
            value={
              sessions.active ? `${Math.round(sessions.active.quality.signal * 100)}%` : "—"
            }
          />
          <Row
            label="Completeness"
            value={
              sessions.active
                ? `${Math.round(sessions.active.quality.completeness * 100)}%`
                : "—"
            }
          />
          <Row
            label="Confidence"
            value={
              sessions.active ? `${Math.round(sessions.active.quality.confidence * 100)}%` : "—"
            }
          />
          <Row label="Rejected" value={sessions.active?.rejectedCount.toString() ?? "—"} />
          <Row label="Version" value={sessions.processingVersion} />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Last session summary</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Session" value={sessions.lastCompleted?.id.slice(0, 16) ?? "—"} />
          <Row
            label="End reason"
            value={sessions.lastCompleted?.endReason?.replace(/_/g, " ") ?? "—"}
          />
          <Row
            label="Duration"
            value={
              sessions.lastCompleted?.summary
                ? `${Math.round(sessions.lastCompleted.summary.durationMs / 1000)}s`
                : "—"
            }
          />
          <Row
            label="Sensors"
            value={
              sessions.lastCompleted?.summary?.sensorsActive.length
                ? sessions.lastCompleted.summary.sensorsActive
                    .map((s) => s.replace(/_/g, " "))
                    .join(" · ")
                : "—"
            }
          />
          <Row
            label="Data quality"
            value={
              sessions.lastCompleted?.summary
                ? `${Math.round(sessions.lastCompleted.summary.quality.score * 100)}%`
                : "—"
            }
          />
          <Row
            label="Confidence"
            value={
              sessions.lastCompleted?.summary
                ? `${Math.round(sessions.lastCompleted.summary.confidence * 100)}%`
                : "—"
            }
          />
          <Row
            label="Processing"
            value={
              sessions.lastCompleted?.summary
                ? `${sessions.lastCompleted.summary.processingMs} ms`
                : "—"
            }
          />
          <Row
            label="Key intelligence"
            value={sessions.lastCompleted?.summary?.keyIntelligence.length.toString() ?? "—"}
          />
        </div>
        {sessions.lastCompleted?.summary?.keyIntelligence.length ? (
          <div className="mt-3 space-y-3">
            {sessions.lastCompleted.summary.keyIntelligence.map((item) => (
              <div key={item.intelligenceId}>
                <p className="text-[13px] uppercase tracking-[0.14em] text-muted-foreground">
                  {item.domain.replace(/_/g, " ")} · {item.status} · c
                  {Math.round(item.confidence * 100)}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-10">
        <SectionTitle>Session timeline</SectionTitle>
        <div className="mt-2 space-y-5">
          {sessionService.timeline().length ? (
            sessionService.timeline().map((day) => (
              <div key={day.date}>
                <p className="text-[13px] uppercase tracking-[0.14em] text-muted-foreground">
                  {day.date}
                </p>
                <div className="mt-1 divide-y divide-border/70">
                  {day.sessions.map((session) => (
                    <Row
                      key={session.id}
                      label={`${SESSION_LIFECYCLE_LABELS[session.lifecycle]} · ${clock(
                        session.startedAt,
                      )}`}
                      value={`${Math.round(session.durationMs / 1000)}s · q${Math.round(
                        session.quality.score * 100,
                      )} · o${session.counts.observations} f${session.counts.features} e${
                        session.counts.evidence
                      } i${session.counts.intelligence}`}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <Row label="No sessions yet" value="—" />
          )}
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Session history</SectionTitle>
        <div className="mt-2 divide-y divide-border/70">
          <Row label="Stored" value={sessions.history.length.toString()} />
          <Row label="Started this run" value={sessions.startedCount.toString()} />
          <Row label="Completed this run" value={sessions.completedCount.toString()} />
          <Row
            label="Summarised"
            value={sessions.history.filter((session) => session.summary).length.toString()}
          />
        </div>
      </div>


      {ble.error ? (
        <div className="mt-10 rounded-2xl px-4 py-4 shadow-[inset_0_0_0_1px_hsl(var(--border))]">
          <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            {ble.error.kind.replace(/_/g, " ")}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed">{ble.error.message}</p>
          <button
            type="button"
            onClick={() => void ble.connect()}
            className="mt-4 rounded-full bg-foreground px-5 py-2 text-[14px] text-background disabled:opacity-40"
            disabled={busy}
          >
            Retry
          </button>
        </div>
      ) : null}

      {ble.known.length ? (
        <div className="mt-10">
          <SectionTitle>Previously paired</SectionTitle>
          <div className="mt-2 divide-y divide-border/70">
            {ble.known.map((device) => (
              <button
                key={device.id}
                type="button"
                onClick={() => void ble.connectKnown(device.id)}
                disabled={busy}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left text-[15px] disabled:opacity-40"
              >
                {device.name}
                <span className="text-[13px] text-muted-foreground">Connect</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void ble.connect()}
          disabled={busy || !ble.supported}
          className="rounded-full bg-foreground px-5 py-3 text-[15px] text-background disabled:opacity-40"
        >
          {busy ? "Working…" : "Scan for Arc"}
        </button>
        <button
          type="button"
          onClick={() => void ble.connectAny()}
          disabled={busy || !ble.supported}
          className="rounded-full px-5 py-3 text-[15px] shadow-[inset_0_0_0_1px_hsl(var(--border))] disabled:opacity-40"
        >
          Any device
        </button>
        <button
          type="button"
          onClick={() => void ble.disconnect()}
          disabled={!live && ble.state !== "reconnecting"}
          className="rounded-full px-5 py-3 text-[15px] shadow-[inset_0_0_0_1px_hsl(var(--border))] disabled:opacity-40"
        >
          Disconnect
        </button>
        <button
          type="button"
          onClick={ble.resetCounters}
          className="rounded-full px-5 py-3 text-[15px] shadow-[inset_0_0_0_1px_hsl(var(--border))]"
        >
          Reset counters
        </button>
        <button
          type="button"
          onClick={() => observationService.reset()}
          className="rounded-full px-5 py-3 text-[15px] shadow-[inset_0_0_0_1px_hsl(var(--border))]"
        >
          Clear observations
        </button>
        <button
          type="button"
          onClick={() => featureService.reset()}
          className="rounded-full px-5 py-3 text-[15px] shadow-[inset_0_0_0_1px_hsl(var(--border))]"
        >
          Clear features
        </button>
        <button
          type="button"
          onClick={() => evidenceService.reset()}
          className="rounded-full px-5 py-3 text-[15px] shadow-[inset_0_0_0_1px_hsl(var(--border))]"
        >
          Clear evidence
        </button>
        <button
          type="button"
          onClick={() => intelligenceService.reset()}
          className="rounded-full px-5 py-3 text-[15px] shadow-[inset_0_0_0_1px_hsl(var(--border))]"
        >
          Clear intelligence
        </button>


      </div>
    </main>
  );
}
