export function formatSyncDate(
  value: string | null,
  locale: string,
  fallback = "—"
) {
  if (!value) {
    return fallback;
  }

  const normalized = value
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(
    locale === "es" ? "es-AR" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    }
  ).format(date);
}