/**
 * Subtle haptics.
 *
 * Ciatta never buzzes for attention — a tap is confirmed with the shortest
 * pulse the device can give, and only when the platform actually supports it.
 */

type Strength = "tap" | "confirm";

const PATTERN: Record<Strength, number | number[]> = {
  /** Acknowledges the touch itself. */
  tap: 8,
  /** Marks the handoff into a flow: two whispers. */
  confirm: [10, 40, 14],
};

export function haptic(strength: Strength = "tap") {
  if (typeof navigator === "undefined") return;
  const vibrate = navigator.vibrate?.bind(navigator);
  if (!vibrate) return;
  try {
    vibrate(PATTERN[strength]);
  } catch {
    /* some browsers reject vibration outside a user gesture — silence is fine */
  }
}
