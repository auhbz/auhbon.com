/** Fix the browser's wall clock while leaving animation and event timers running. */
export function setLocalHour(context, hour = 12) {
  return context.clock.setFixedTime(new Date(`2026-11-12T${String(hour).padStart(2, "0")}:00:00`));
}
