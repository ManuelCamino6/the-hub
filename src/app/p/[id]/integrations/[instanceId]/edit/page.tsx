
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  requireInstance,
} from "@/lib/instances/context";

import {
  getInstalledConnectorDefinition,
  listInstances,
} from "@/lib/instances/service";

import {
  getAllProtocolTables,
} from "@/lib/protocol/service";

import {
  InstanceForm,
} from "@/components/instances/instance-form";

import {
  InstanceAlerts,
} from "@/components/instances/instance-alerts";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{
    id: string;
    instanceId: string;
  }>;
};

export default function EditInstancePage(
  props: Props
) {
  return (
    <Suspense
      fallback={<Skeleton className="h-96 w-full" />}
    >
      <EditInstanceContent {...props} />
    </Suspense>
  );
}

async function EditInstanceContent({
  params,
}: Props) {
  const { id, instanceId } = await params;

  const { instance, userId } =
    await requireInstance(
      id,
      instanceId,
      true
    );

  if (instance.connector_deleted) {
    redirect(
      `/p/${id}/integrations/${instanceId}`
    );
  }

  const t = await getTranslations("Instances");

  const connector =
    await getInstalledConnectorDefinition(
      userId,
      instanceId
    );

  const tables = await getAllProtocolTables(id);

  const origins: {
    id: string;
    name: string;
  }[] = [];

  let cursor: string | undefined;

  do {
    const result = await listInstances(userId, {
      project_id: id,
      limit: 200,
      cursor,
    });

    origins.push(
      ...result.data
        .filter((item) => item.id !== instanceId)
        .map((item) => ({
          id: item.id,
          name: item.name,
        }))
    );

    cursor = result.next_cursor ?? undefined;
  } while (cursor);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("edit")}
        </h1>

        <p className="text-sm text-muted-foreground">
          {t("editDescription")}
        </p>
      </div>

      <InstanceAlerts instance={instance} />

      <InstanceForm
        key={instance.id}
        projectId={id}
        connector={connector}
        instance={instance}
        tables={tables.map((table) => ({
          id: table.id,
          name: table.name,
        }))}
        origins={origins}
      />
    </div>
  );
}
