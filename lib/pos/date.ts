const LIMA_TIME_ZONE = "America/Lima";

function getLimaDateTimeParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(value));

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatLimaDateTime(value: string | Date) {
  const parts = getLimaDateTimeParts(value);
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod === "AM" ? "a. m." : "p. m."}`;
}

export function getLimaDayRange() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const start = new Date(`${date}T00:00:00-05:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { date, start, end };
}
