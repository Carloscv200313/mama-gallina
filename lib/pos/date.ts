const LIMA_TIME_ZONE = "America/Lima";

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
