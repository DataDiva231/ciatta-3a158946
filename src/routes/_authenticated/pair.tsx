/**
 * Pairing — the one screen that turns a sensing earring into a live source.
 *
 * All device logic lives in the Bluetooth manager; this screen only reads its
 * snapshot and offers the next honest step. Once a reading arrives, the
 * observation pipeline is already listening, so nothing else has to be wired.
 */
import { createFileRoute } from "@tanstack/react-router";

import { Card, Screen } from "@/components/ciatta/screen";
import { useBluetooth } from "@/lib/ble/use-bluetooth";
import { useObservations } from "@/lib/observations/use-observations";

export const Route = createFileRoute("/_authenticated/pair")({
  head: () => ({
    meta: [
      { title: "Pair your earring — Ciatta" },
      {
        name: "description",
        content:
          "Connect your Ciatta sensing earring over Bluetooth and start sending temperature, heart rate and rhythm to your understanding.",
      },
      { property: "og:title", content: "Pair your earring — Ciatta" },
      {
        property: "og:description",
        content: "Connect your Ciatta sensing earring and begin receiving data.",
      },
    ],
  }),
  component: PairPage,
});

function signalLabel(rssi: number | null): string | null {
  if (rssi === null) return null;
  if (rssi > -60) return "Strong signal";
  if (rssi > -75) return "Good signal";
  return "Weak signal — keep it closer";
}

function agoLabel(at: number | null): string {
  if (!at) return "No reading yet";
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 5) return "Reading just now";
  if (seconds < 60) return `Last reading ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `Last reading ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="text-[15px]">{label}</span>
      <span className="text-[15px] text-muted-foreground">{value}</span>
    </div>
  );
}

function Status({ tone, children }: { tone: "live" | "waiting" | "quiet"; children: string }) {
  const dot = tone === "live" ? "bg-moss" : tone === "waiting" ? "bg-wheat" : "bg-fog";
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <span aria-hidden="true" className={`h-[6px] w-[6px] rounded-full ${dot}`} />
      <span>{children}</span>
    </div>
  );
}

function PairPage() {
  const ble = useBluetooth();
  const observations = useObservations();

  const connecting =
    ble.state === "scanning" || ble.state === "connecting" || ble.state === "reconnecting";
  const connected = ble.state === "connected";
  const receiving = connected && ble.packetCount > 0;

  return (
    <Screen
      title="Pair your earring"
      subtitle="Your earring reads skin temperature, heart rate and rhythm. Once it's paired, Ciatta listens on its own."
    >
      {!ble.supported ? (
        <>
          <Status tone="quiet">Bluetooth isn&rsquo;t available here</Status>
          <Card>
            <div className="px-4 py-4 text-[13px] leading-relaxed text-muted-foreground">
              This browser can&rsquo;t reach Bluetooth devices. Open Ciatta in the iPhone or Android
              app, or in Chrome on desktop over HTTPS, then come back to this screen.
            </div>
          </Card>
        </>
      ) : (
        <>
          <Status tone={receiving ? "live" : connected || connecting ? "waiting" : "quiet"}>
            {receiving
              ? "Receiving data"
              : connected
                ? "Connected — waiting for the first reading"
                : ble.state === "scanning"
                  ? "Looking for your earring"
                  : ble.state === "connecting"
                    ? "Connecting"
                    : ble.state === "reconnecting"
                      ? "Reconnecting"
                      : ble.state === "unavailable"
                        ? "Bluetooth is off"
                        : "Not paired"}
          </Status>

          {!connected && (
            <>
              <Card>
                <div className="px-4 py-4">
                  <p className="text-[15px]">Before you tap pair</p>
                  <ol className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    <li>1. Wear the earring, or hold it against your skin.</li>
                    <li>2. Press and hold its button until the light pulses.</li>
                    <li>3. Keep it within arm&rsquo;s reach of this device.</li>
                  </ol>
                </div>
              </Card>

              {ble.error && (
                <p className="mt-3 text-[13px] leading-relaxed text-accent">{ble.error.message}</p>
              )}

              <button
                type="button"
                onClick={() => void ble.connect()}
                disabled={connecting}
                className="mt-5 w-full rounded-full bg-foreground py-3.5 text-[15px] text-background transition-opacity disabled:opacity-50"
              >
                {connecting ? "Looking\u2026" : ble.error ? "Try again" : "Pair earring"}
              </button>

              <button
                type="button"
                onClick={() => void ble.connectAny()}
                disabled={connecting}
                className="mt-3 w-full py-2 text-[13px] text-muted-foreground transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                My earring isn&rsquo;t showing up
              </button>

              {ble.known.length > 0 && (
                <>
                  <p className="mt-8 text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                    Already trusted
                  </p>
                  <Card>
                    {ble.known.map((device) => (
                      <button
                        key={device.id}
                        type="button"
                        onClick={() => void ble.connectKnown(device.id)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                      >
                        <span className="text-[15px]">{device.name}</span>
                        <span className="text-[13px] text-accent">Connect</span>
                      </button>
                    ))}
                  </Card>
                </>
              )}
            </>
          )}

          {connected && (
            <>
              <Card>
                <Row label="Device" value={ble.device?.name ?? "Earring"} />
                <Row
                  label="Battery"
                  value={ble.batteryLevel === null ? "—" : `${ble.batteryLevel}%`}
                />
                <Row label="Signal" value={signalLabel(ble.rssi) ?? "—"} />
                <Row label="Readings" value={String(ble.packetCount)} />
                <Row label="Observations kept" value={String(observations.observationCount)} />
              </Card>

              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {agoLabel(ble.lastPacketAt)}
                {ble.latest?.temperatureC !== null && ble.latest
                  ? ` · ${ble.latest.temperatureC}°C`
                  : ""}
                {ble.latest?.heartRate ? ` · ${ble.latest.heartRate} bpm` : ""}
              </p>

              {!receiving && (
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  Paired. The first reading usually lands within a few seconds of the earring
                  touching skin.
                </p>
              )}

              <button
                type="button"
                onClick={() => void ble.disconnect()}
                className="mt-6 w-full rounded-full border border-border py-3.5 text-[15px] text-muted-foreground"
              >
                Disconnect
              </button>
              <button
                type="button"
                onClick={() => {
                  void ble.disconnect();
                  ble.forget();
                }}
                className="mt-3 w-full py-2 text-[13px] text-muted-foreground transition-opacity hover:opacity-70"
              >
                Forget this earring
              </button>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
