import Link from "next/link";
import { Suspense } from "react";

import {
  getTranslations,
} from "next-intl/server";

import { Button } from "@/components/ui/button";

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
  getProjectSync,
} from "@/lib/sync/project-service";

import {
  MetricCard,
} from "@/components/sync/metric-card";

import {
  SyncCounters,
} from "@/components/sync/sync-counters";

import {
  SyncDates,
} from "@/components/sync/sync-dates";

import {
  ProjectModelsTable,
} from "@/components/sync/project-models-table";

import {
  CommercialAlert,
} from "@/components/sync/commercial-alert";

import {
  SyncRefreshButton,
} from "@/components/sync/sync-refresh-button";

import {
  SyncSkeleton,
} from "@/components/sync/sync-skeleton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function SyncContent({
  params,
}: Props) {
  const { id } = await params;

  const {
    project,
    userId,
  } = await requireBusinessSyncContext(id);

  const t = await getTranslations("Sync");

  const sync = await getProjectSync(
    userId,
    id
  ).catch(handleSyncPageError);

  const instanceMetrics = [
    {
      label: t("instances"),
      value: sync.instances_total,
    },
    {
      label: t("instancesOk"),
      value: sync.instances_ok,
    },
    {
      label: t("instancesIncomplete"),
      value: sync.instances_incomplete,
    },
    {
      label: t("instancesUnauthorized"),
      value: sync.instances_unauthorized,
    },
    {
      label: t("instancesPaused"),
      value: sync.instances_paused,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("title")}
          </h1>

          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <SyncRefreshButton />
      </div>

      <CommercialAlert
        projectId={id}
        operational={sync.operational}
        isAdmin={project.role === "ADMIN"}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {instanceMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <div>
        <Button variant="outline" asChild>
          <Link href={`/p/${id}/integrations`}>
            {t("viewIntegrations")}
          </Link>
        </Button>
      </div>

      <SyncCounters
        counters={{
          pending: sync.pending_total,
          failed: sync.failed_total,
          ok_total: sync.ok_total,
          expired_total: sync.expired_total,
          last_confirmed_at:
            sync.last_confirmed_at,
          last_activity_at:
            sync.last_activity_at,
        }}
      />

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
          <ProjectModelsTable
            models={sync.models}
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

export default function SyncPage(
  props: Props
) {
  return (
    <Suspense fallback={<SyncSkeleton />}>
      <SyncContent {...props} />
    </Suspense>
  );
}