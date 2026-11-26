import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import {
  getTranslations,
} from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  requireBusinessSyncContext,
  handleSyncPageError,
} from "@/lib/sync/context";

import {
  syncIdSchema,
} from "@/lib/sync/schemas";

import {
  getInstanceSync,
} from "@/lib/sync/instance-service";

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
    instanceId: string;
  }>;
};

async function InstanceSyncContent({
  params,
}: Props) {
  const {
    id,
    instanceId,
  } = await params;

  const { userId } =
    await requireBusinessSyncContext(id);

  if (
    !syncIdSchema.safeParse(instanceId).success
  ) {
    notFound();
  }

  const t = await getTranslations("Sync");
  const common = await getTranslations("Common");

  const sync = await getInstanceSync(
    userId,
    instanceId,
    id
  ).catch(handleSyncPageError);

  const basePath =
    `/p/${id}/integrations/${instanceId}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" asChild>
            <Link href={basePath}>
              {common("back")}
            </Link>
          </Button>

          <h1 className="text-2xl font-semibold">
            {t("instanceTitle")}
          </h1>

          <p className="text-muted-foreground">
            {t("instanceDescription")}
          </p>
        </div>

        <SyncRefreshButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("connector")}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {sync.connector.name}
            </p>

            <Badge variant="outline">
              {t(
                `connectorStatuses.${sync.connector.status}`
              )}
            </Badge>
          </div>

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

export default function InstanceSyncPage(
  props: Props
) {
  return (
    <Suspense fallback={<SyncSkeleton />}>
      <InstanceSyncContent {...props} />
    </Suspense>
  );
}