/**
 * The observation pipeline.
 *
 * Stages, in order and each independent:
 *   receive → validate integrity → parse → timestamp → assess quality →
 *   persist → publish.
 *
 * This module owns the first five. Persisting belongs to the store, publishing
 * to the service, so each piece stays reusable on its own.
 */
import { InvalidPacketError, parseSensorPacket, type SensorSample } from "@/lib/ble/protocol";
import type { BlePacket } from "@/lib/ble/bluetooth-manager";

import {
  newId,
  unitFor,
  type BiologicalObservation,
  type RejectionReason,
  type SensorType,
} from "./model";
import { assessQuality, type QualityContext } from "./quality";
import { validateCandidate, validatePacket, type StreamContext } from "./validate";

export type PipelineState = {
  sessionId: string;
  seenSequences: Set<number>;
  availableSensors: Set<SensorType>;
  lastSequence: number | null;
  lastTimestamp: number | null;
  lastHeartRate: number | null;
  reconnects: number;
};

export type PipelineResult = {
  observations: BiologicalObservation[];
  /** Everything turned away, with the reason, so diagnostics can show it. */
  rejections: { sensorType: SensorType | null; reason: RejectionReason }[];
};

export function createPipelineState(sessionId: string): PipelineState {
  return {
    sessionId,
    seenSequences: new Set(),
    availableSensors: new Set(),
    lastSequence: null,
    lastTimestamp: null,
    lastHeartRate: null,
    reconnects: 0,
  };
}

/** Stage: receive + validate integrity + parse. */
export function decodePacket(packet: BlePacket): SensorSample | RejectionReason {
  if (!packet.bytes.length) return "malformed_packet";
  const view = new DataView(
    packet.bytes.buffer.slice(packet.bytes.byteOffset, packet.bytes.byteOffset + packet.bytes.byteLength),
  );
  try {
    return parseSensorPacket(view, packet.receivedAt);
  } catch (error) {
    return error instanceof InvalidPacketError ? "malformed_packet" : "malformed_packet";
  }
}

/** Stage: parse → the individual measurements a packet carries. */
export function measurementsOf(sample: SensorSample): { sensorType: SensorType; value: number | null }[] {
  return [
    { sensorType: "skin_temperature" as SensorType, value: sample.temperatureC },
    { sensorType: "heart_rate" as SensorType, value: sample.heartRate },
    { sensorType: "heart_rate_interval" as SensorType, value: sample.ibiMs },
    { sensorType: "relative_humidity" as SensorType, value: sample.humidity },
  ];
}

/**
 * Runs a raw packet through every stage up to (but not including) persistence.
 * `state` is advanced in place; nothing already recorded is ever revisited.
 */
export function processPacket(packet: BlePacket, state: PipelineState): PipelineResult {
  const decoded = decodePacket(packet);
  if (typeof decoded === "string") {
    return { observations: [], rejections: [{ sensorType: null, reason: decoded }] };
  }

  // Stage: assign timestamp — arrival time, authoritative and monotonic-checked.
  const timestamp = packet.receivedAt;

  const streamContext: StreamContext = {
    connected: packet.connected,
    seenSequences: state.seenSequences,
    lastTimestamp: state.lastTimestamp,
    availableSensors: state.availableSensors,
  };

  const packetReason = validatePacket(decoded.sequence, timestamp, streamContext);
  if (packetReason) {
    return { observations: [], rejections: [{ sensorType: null, reason: packetReason }] };
  }

  const measurements = measurementsOf(decoded);
  for (const measurement of measurements) {
    if (measurement.value !== null) state.availableSensors.add(measurement.sensorType);
  }

  const qualityContext: QualityContext = {
    rssi: packet.rssi,
    connected: packet.connected,
    reconnects: state.reconnects,
    sequenceGap:
      decoded.sequence !== null && state.lastSequence !== null
        ? decoded.sequence - state.lastSequence
        : null,
    sinceLastPacket: state.lastTimestamp === null ? null : timestamp - state.lastTimestamp,
    temperatureC: decoded.temperatureC,
    heartRateDelta:
      decoded.heartRate !== null && state.lastHeartRate !== null
        ? Math.abs(decoded.heartRate - state.lastHeartRate)
        : null,
  };

  const fields = Object.fromEntries(
    measurements.map((measurement) => [measurement.sensorType, measurement.value]),
  ) as BiologicalObservation["raw"]["fields"];

  const observations: BiologicalObservation[] = [];
  const rejections: PipelineResult["rejections"] = [];

  for (const measurement of measurements) {
    const reason = validateCandidate(
      { ...measurement, sequence: decoded.sequence, timestamp },
      streamContext,
    );
    if (reason) {
      if (reason !== "sensor_unavailable") rejections.push({ sensorType: measurement.sensorType, reason });
      continue;
    }
    observations.push({
      id: newId("obs"),
      timestamp,
      sensorType: measurement.sensorType,
      value: measurement.value as number,
      raw: { hex: decoded.hex, sequence: decoded.sequence, fields },
      unit: unitFor(measurement.sensorType),
      deviceId: packet.deviceId,
      sessionId: state.sessionId,
      quality: assessQuality(measurement.sensorType, qualityContext),
      validationStatus: "valid",
      rejection: null,
    });
  }

  if (decoded.sequence !== null) {
    state.seenSequences.add(decoded.sequence);
    state.lastSequence = decoded.sequence;
  }
  state.lastTimestamp = timestamp;
  if (decoded.heartRate !== null) state.lastHeartRate = decoded.heartRate;

  return { observations, rejections };
}
