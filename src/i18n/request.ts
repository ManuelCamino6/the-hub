
import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isLocale,
  localeCookie,
} from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(localeCookie)?.value;

  const browserLanguage = (await headers())
    .get("accept-language")
    ?.split(",")[0]
    ?.split("-")[0]
    ?.split(";")[0]
    ?.trim();

  const locale = isLocale(savedLocale)
    ? savedLocale
    : isLocale(browserLanguage)
      ? browserLanguage
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`))
      .default,
    timeZone: "America/Argentina/Buenos_Aires",
  };
});
