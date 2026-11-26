export function formatBillingAmount(
  amountMinor: number,
  currency: string,
  locale: string
) {
  return new Intl.NumberFormat(
    locale === "es" ? "es-AR" : "en-US",
    {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }
  ).format(amountMinor / 100);
}

export function formatBillingDate(
  value: string | null,
  locale: string
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    locale === "es" ? "es-AR" : "en-US",
    {
      dateStyle: "medium",
      timeZone: "America/Argentina/Buenos_Aires",
    }
  ).format(new Date(value));
}