
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import {
    requireOwnedConnector,
} from "@/lib/connectors/context";

import {
    getAllProtocolTables,
} from "@/lib/protocol/service";

import {
    ConnectorForm,
} from "@/components/connectors/connector-form";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
    params: Promise<{
        id: string;
        connectorId: string;
    }>;
};

export default function DefinitionPage(props: Props) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <DefinitionContent {...props} />
        </Suspense>
    );
}

async function DefinitionContent({ params }: Props) {
    const { id, connectorId } = await params;

    const { connector, canWrite } =
        await requireOwnedConnector(id, connectorId);

    const [tables, t] = await Promise.all([
        getAllProtocolTables(id),
        getTranslations("Connectors"),
    ]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">
                {t("definition")}
            </h2>

            <ConnectorForm
                key={connector.id}
                projectId={id}
                connector={connector}
                tables={tables}
                readOnly={!canWrite}
            />
        </div>
    );
}