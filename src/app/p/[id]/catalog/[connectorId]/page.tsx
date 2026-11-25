
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Plug, Lock } from "lucide-react";

import {
    requireCatalogConnector,
} from "@/lib/connectors/context";

import {
    getAllProtocolTables,
} from "@/lib/protocol/service";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";

const operations = [
    "can_list",
    "can_send_post",
    "can_receive_post",
    "can_send_update",
    "can_receive_update",
    "can_send_delete",
    "can_receive_delete",
] as const;

type Props = {
    params: Promise<{
        id: string;
        connectorId: string;
    }>;
};

export default function CatalogDetailPage(props: Props) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <CatalogDetailContent {...props} />
        </Suspense>
    );
}

async function CatalogDetailContent({
    params,
}: Props) {
    const { id, connectorId } = await params;

    const { connector, canWrite } =
        await requireCatalogConnector(id, connectorId);

    const [t, common, connectors, tables] =
        await Promise.all([
            getTranslations("Catalog"),
            getTranslations("Common"),
            getTranslations("Connectors"),
            getAllProtocolTables(id),
        ]);

    const tableNames = new Map(
        tables.map((table) => [table.id, table.name])
    );

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href={`/p/${id}/catalog`}>
                    {common("back")}
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <Plug className="size-10 text-muted-foreground" />

                    <CardTitle className="text-2xl">
                        {connector.name}
                    </CardTitle>

                    <CardDescription>
                        {connector.description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Badge variant="secondary">
                        {connectors(`statuses.${connector.status}`)}
                    </Badge>

                    {canWrite && (
                        <div className="space-y-2">
                            <Button disabled>
                                {t("install")}
                            </Button>

                            <p className="text-sm text-muted-foreground">
                                {t("installationPending")}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("parameters")}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {!connector.parameters.length && (
                        <p className="text-sm text-muted-foreground">
                            {t("noParameters")}
                        </p>
                    )}

                    {connector.parameters.map((parameter) => (
                        <div
                            key={parameter.key}
                            className="space-y-2 rounded-md border p-3"
                        >
                            <p className="font-mono text-sm font-medium">
                                {parameter.key}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    {parameter.type}
                                </Badge>

                                <Badge variant="secondary">
                                    {parameter.required
                                        ? t("required")
                                        : t("optional")}
                                </Badge>

                                {parameter.encrypted && (
                                    <Badge variant="outline">
                                        <Lock />
                                        {t("encrypted")}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("permissions")}</CardTitle>

                    <CardDescription>
                        {t("permissionDescription")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {!connector.models_permissions.length && (
                        <p className="text-sm text-muted-foreground">
                            {t("noPermissions")}
                        </p>
                    )}

                    {connector.models_permissions.map((model) => (
                        <div
                            key={model.table_id}
                            className="space-y-3 rounded-md border p-3"
                        >
                            <p className="font-medium">
                                {tableNames.get(model.table_id)
                                    ?? model.table_id}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {operations
                                    .filter((operation) => model[operation])
                                    .map((operation) => (
                                        <Badge
                                            key={operation}
                                            variant="secondary"
                                        >
                                            {t(`operations.${operation}`)}
                                        </Badge>
                                    ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
