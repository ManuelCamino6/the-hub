import {
    getTranslations,
    getLocale,
} from "next-intl/server";

import type {
    SyncCounters as Counters,
} from "@/lib/sync/schemas";

import {
    MetricCard,
} from "./metric-card";

type Props = {
    counters: Counters;
};

export async function SyncCounters({
    counters,
}: Props) {
    const t = await getTranslations("Sync");
    const locale = await getLocale();

    const formatter =
        new Intl.NumberFormat(
            locale === "es" ? "es-AR" : "en-US"
        );

    const metrics = [
        {
            label: t("pending"),
            value: counters.pending,
            description: t("pendingDescription"),
        },
        {
            label: t("failed"),
            value: counters.failed,
            description: t("failedDescription"),
        },
        {
            label: t("confirmed"),
            value: counters.ok_total,
            description: t("confirmedDescription"),
        },
        {
            label: t("expired"),
            value: counters.expired_total,
            description: t("expiredDescription"),
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
                <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={formatter.format(metric.value)}
                    description={metric.description}
                />
            ))}
        </div>
    );
}