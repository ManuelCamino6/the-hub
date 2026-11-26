import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

import {
  requireDevelopmentSyncContext,
  handleSyncPageError,
} from "@/lib/sync/context";

import {
  syncIdSchema,
  syncTableNameSchema,
} from "@/lib/sync/schemas";

import {
  getDevelopmentModelSync,
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
  ModelPermissions,
} from "@/components/sync/model-permissions";

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
    tableName: string;
  }>;
};

async function DevelopmentModelSyncContent({
  params,
}: Props) {
  const {
    id,
    connectorId,
    instanceId,
    tableName,
  } = await params;

  const { userId } =
    await requireDevelopmentSyncContext(id);

  if (
    !syncIdSchema.safeParse(connectorId).success ||
    !syncIdSchema.safeParse(instanceId).success ||
    !syncTableNameSchema.safeParse(tableName).success
  ) {
    notFound();
  }

  const t = await getTranslations("Sync");
  const common = await getTranslations("Common");

  const model = await getDevelopmentModelSync(
    userId,
    connectorId,
    instanceId,
    tableName,
    id
  ).catch(handleSyncPageError);

  const basePath =
    `/p/${id}/connectors/${connectorId}/installations/${instanceId}/sync`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" asChild>
            <Link href={basePath}>
              {common("back")}
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground">
            {t("modelTitle")}
          </p>

          <h1 className="break-all text-2xl font-semibold">
            {model.table_name}
          </h1>

          <p className="text-muted-foreground">
            {t("modelDescription")}
          </p>
        </div>

        <SyncRefreshButton />
      </div>

      <SyncStatus
        status={model.instance_status}
        operationStatus={model.operation_status}
      />

      <SyncCounters counters={model} />

      <SyncDates
        lastConfirmedAt={model.last_confirmed_at}
        lastActivityAt={model.last_activity_at}
      />

      <ModelPermissions model={model} />

      <p className="text-sm text-muted-foreground">
        {t("metricsNotice")}
      </p>
    </div>
  );
}

export default function DevelopmentModelSyncPage(
  props: Props
) {
  return (
    <Suspense fallback={<SyncSkeleton />}>
      <DevelopmentModelSyncContent {...props} />
    </Suspense>
  );
}