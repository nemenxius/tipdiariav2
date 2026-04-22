export const APP_TIMEZONE = "Europe/Lisbon";

export function toLisbonDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function toLisbonTimeLabel(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function startOfTodayLisbon() {
  return toLisbonDate(new Date());
}
