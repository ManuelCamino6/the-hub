
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import {
    requireOwnedConnector,
} from "@/lib/connectors/context";

import {
    ConnectorActions,
} from "@/components/connectors/connector-actions";

import {
    ConnectorStatus,
} from "@/components/connectors/connector-status";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
    params: Promise<{
        id: string;
        connectorId: string;
    }>;
};

export default function ConnectorPage(props: Props) {
    return (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ConnectorContent {...props} />
        </Suspense>
    );
}

async function ConnectorContent({ params }: Props) {
    const { id, connectorId } = await params;

    const { connector, canWrite } =
        await requireOwnedConnector(id, connectorId);

    const t = await getTranslations("Connectors");
    const workspace = await getTranslations("Workspace");

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t("general")}</CardTitle>

                    {connector.description && (
                        <CardDescription>
                            {connector.description}
                        </CardDescription>
                    )}
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">
                            {t("connectorId")}
                        </p>

                        <p className="break-all font-mono text-sm">
                            {connector.id}
                        </p>
                    </div>

                    {canWrite && (
                        <ConnectorStatus connector={connector} />
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardDescription>
                            {t("parameters")}
                        </CardDescription>

                        <CardTitle className="text-2xl">
                            {connector.parameters.length}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardDescription>
                            {t("permissions")}
                        </CardDescription>

                        <CardTitle className="text-2xl">
                            {connector.models_permissions.length}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {canWrite && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {workspace("dangerZone")}
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <ConnectorActions
                            projectId={id}
                            connectorId={connectorId}
                            mode="delete"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
