import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import {
    requireDevelopmentSyncContext,
    handleSyncPageError,
} from "@/lib/sync/context";

import {
    syncIdSchema,
} from "@/lib/sync/schemas";

import {
    getDevelopmentInstanceSync,
} from "@/lib/sync/development-service";

import {
    SyncCounters,
} from "@/components/sync/sync-counters";

import {
    SyncDates,
} from "@/components/sync/sync-dates";

import {
    SyncStatus,
} from "@/components/sync/sync-status";

import {
    SyncModelsTable,
} from "@/components/sync/sync-models-table";

import {
    SyncRefreshButton,
} from "@/components/sync/sync-refresh-button";

import {
    SyncSkeleton,
} from "@/components/sync/sync-skeleton";

type Props = {
    params: Promise<{
        id: string;
        connectorId: string;
        instanceId: string;
    }>;
};

async function InstallationSyncContent({
    params,
}: Props) {
    const {
        id,
        connectorId,
        instanceId,
    } = await params;

    const { userId } =
        await requireDevelopmentSyncContext(id);

    if (
        !syncIdSchema.safeParse(connectorId).success ||
        !syncIdSchema.safeParse(instanceId).success
    ) {
        notFound();
    }

    const t = await getTranslations("Sync");
    const common = await getTranslations("Common");

    const sync = await getDevelopmentInstanceSync(
        userId,
        connectorId,
        instanceId,
        id
    ).catch(handleSyncPageError);

    const basePath =
        `/p/${id}/connectors/${connectorId}/installations/${instanceId}`;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Button variant="ghost" asChild>
                        <Link
                            href={`/p/${id}/connectors/${connectorId}/installations`}
                        >
                            {common("back")}
                        </Link>
                    </Button>

                    <h1 className="text-2xl font-semibold">
                        {t("installationTitle")}
                    </h1>

                    <p className="text-muted-foreground">
                        {t("installationDescription")}
                    </p>
                </div>

                <SyncRefreshButton />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("installationId")}
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                    <p className="break-all font-mono text-sm">
                        {sync.instance_id}
                    </p>

                    <SyncStatus
                        status={sync.status}
                        operationStatus={sync.operation_status}
                    />
                </CardContent>
            </Card>

            <SyncCounters counters={sync} />

            <SyncDates
                lastConfirmedAt={sync.last_confirmed_at}
                lastActivityAt={sync.last_activity_at}
            />

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("models")}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <SyncModelsTable
                        models={sync.models}
                        basePath={`${basePath}/sync`}
                    />
                </CardContent>
            </Card>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>{t("metricsNotice")}</p>

                <p>{t("historicalNotice")}</p>
            </div>
        </div>
    );
}

export default function InstallationSyncPage(
    props: Props
) {
    return (
        <Suspense fallback={<SyncSkeleton />}>
            <InstallationSyncContent {...props} />
        </Suspense>
    );
}