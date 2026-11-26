import {
  getLocale,
  getTranslations,
} from "next-intl/server";

import {
  formatSyncDate,
} from "@/lib/sync/format";

import {
  MetricCard,
} from "./metric-card";

type Props = {
  lastConfirmedAt: string | null;
  lastActivityAt: string | null;
};

export async function SyncDates({
  lastConfirmedAt,
  lastActivityAt,
}: Props) {
  const t = await getTranslations("Sync");
  const locale = await getLocale();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricCard
        label={t("lastConfirmed")}
        value={formatSyncDate(
          lastConfirmedAt,
          locale,
          t("never")
        )}
      />

      <MetricCard
        label={t("lastActivity")}
        value={formatSyncDate(
          lastActivityAt,
          locale,
          t("never")
        )}
      />
    </div>
  );
}