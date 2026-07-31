/** Shared date formatting. No fixed reference date — always the real today. */
export function formatLongDate(date: Date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
