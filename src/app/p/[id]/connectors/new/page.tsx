
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import {
  requireDevelopmentProject,
} from "@/lib/connectors/context";

import {
  getAllProtocolTables,
} from "@/lib/protocol/service";

import {
  ConnectorForm,
} from "@/components/connectors/connector-form";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{ id: string }>;
};

export default function NewConnectorPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NewConnectorContent {...props} />
    </Suspense>
  );
}

async function NewConnectorContent({ params }: Props) {
  const { id } = await params;

  await requireDevelopmentProject(id, true);

  const [t, tables] = await Promise.all([
    getTranslations("Connectors"),
    getAllProtocolTables(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("create")}
        </h1>

        <p className="text-sm text-muted-foreground">
          {t("createDescription")}
        </p>
      </div>

      <ConnectorForm
        projectId={id}
        tables={tables}
      />
    </div>
  );
}
