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
import { observationService } from "@/lib/observations/service";
import { useObservations } from "@/lib/observations/use-observations";


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
  const latestFeatures = Object.values(features.latest).sort((a, b) => b.timestamp - a.timestamp);
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
      </div>
    </main>
  );
}
