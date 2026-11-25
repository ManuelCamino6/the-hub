
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  requireCatalogConnector,
} from "@/lib/connectors/context";

import {
  getAllProtocolTables,
} from "@/lib/protocol/service";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  listInstances,
} from "@/lib/instances/service";

import {
  InstanceForm,
} from "@/components/instances/instance-form";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{
    id: string;
    connectorId: string;
  }>;
};

export default function InstallPage(props: Props) {
  return (
    <Suspense
      fallback={<Skeleton className="h-96 w-full" />}
    >
      <InstallContent {...props} />
    </Suspense>
  );
}

async function InstallContent({ params }: Props) {
  const { id, connectorId } = await params;

  const { connector, canWrite } =
    await requireCatalogConnector(id, connectorId);

  if (!canWrite) {
    redirect(`/p/${id}/catalog/${connectorId}`);
  }

  const supabase = await createClient();

  const { data: { user } } =
    await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("Instances");

  const tables = await getAllProtocolTables(id);

  const origins: { id: string; name: string }[] = [];

  let cursor: string | undefined;

  do {
    const result = await listInstances(user.id, {
      project_id: id,
      limit: 200,
      cursor,
    });

    origins.push(
      ...result.data.map((instance) => ({
        id: instance.id,
        name: instance.name,
      }))
    );

    cursor = result.next_cursor ?? undefined;
  } while (cursor);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">
        {t("install")}
      </h1>

      <InstanceForm
        projectId={id}
        connector={connector}
        tables={tables.map((table) => ({
          id: table.id,
          name: table.name,
        }))}
        origins={origins}
      />
    </div>
  );
}
