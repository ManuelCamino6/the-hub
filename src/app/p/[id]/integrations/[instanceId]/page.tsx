
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";

import {
    requireInstance,
} from "@/lib/instances/context";

import { Activity } from "lucide-react";

import {
    InstanceActions,
} from "@/components/instances/instance-actions";

import {
    getAllProtocolTables,
} from "@/lib/protocol/service";

import {
    permissionOperations,
} from "@/lib/instances/schemas";

import {
    InstanceStatusBadge,
    OperationStatusBadge,
} from "@/components/instances/instance-status";

import {
    InstanceAlerts,
} from "@/components/instances/instance-alerts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";

type Props = {
    params: Promise<{
        id: string;
        instanceId: string;
    }>;
};

export default function InstancePage(props: Props) {
    return (
        <Suspense
            fallback={<Skeleton className="h-96 w-full" />}
        >
            <InstanceContent {...props} />
        </Suspense>
    );
}

async function InstanceContent({ params }: Props) {
    const syncTranslations = await getTranslations("Sync");
    const { id, instanceId } = await params;

    const { instance, canWrite } =
        await requireInstance(id, instanceId);

    const t = await getTranslations("Instances");
    const common = await getTranslations("Common");
    const catalog = await getTranslations("Catalog");
    const connectors =
        await getTranslations("Connectors");

    const tables = await getAllProtocolTables(id);

    const tableNames = new Map(
        tables.map((table) => [
            table.id,
            table.name,
        ])
    );

    const base =
        `/p/${id}/integrations/${instanceId}`;

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href={`/p/${id}/integrations`}>
                    <ArrowLeft />
                    {common("back")}
                </Link>
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">
                        {instance.name}
                    </h1>

                    <div className="flex flex-wrap gap-2">
                        <InstanceStatusBadge
                            status={instance.status}
                        />

                        <OperationStatusBadge
                            status={instance.operation_status}
                        />
                    </div>
                </div>
                <div>
                    {canWrite && !instance.connector_deleted && (
                        <Button asChild>
                            <Link href={`${base}/edit`}>
                                <Pencil />
                                {t("edit")}
                            </Link>
                        </Button>
                    )}

                    <Button variant="outline" asChild>
                        <Link
                            href={`/p/${id}/integrations/${instanceId}/sync`}
                        >
                            <Activity />

                            {syncTranslations("title")}
                        </Link>
                    </Button>
                </div>
            </div>

            <InstanceAlerts instance={instance} />


            {instance.operation_status === "PAUSED" && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("operation")}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("pausedReason")}</Label>

                            <p className="text-sm">
                                {t(
                                    `pausedReasons.${[
                                        "CONNECTOR_IN_DEVELOPMENT",
                                        "CONNECTOR_DELETED",
                                        "INSTANCE_DELETED",
                                    ].includes(instance.paused_reason ?? "")
                                        ? instance.paused_reason
                                        : "UNKNOWN"
                                    }`
                                )}
                            </p>
                        </div>

                        {canWrite && (
                            <InstanceActions
                                instance={instance}
                                mode="resume"
                            />
                        )}
                    </CardContent>
                </Card>
            )}


            <Card>
                <CardHeader>
                    <CardTitle>{t("detail")}</CardTitle>
                </CardHeader>


                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t("connector")}</Label>

                        <Input
                            value={instance.connector_name}
                            readOnly
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t("connectorStatus")}</Label>

                        <Badge variant="outline">
                            {connectors(
                                `statuses.${instance.connector_status}`
                            )}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instance-id">
                            {t("instanceId")}
                        </Label>

                        <Input
                            id="instance-id"
                            value={instance.id}
                            readOnly
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("parameters")}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {!instance.parameters.length && (
                        <p className="text-sm text-muted-foreground">
                            {t("noParameters")}
                        </p>
                    )}

                    {instance.parameters.map((parameter) => (
                        <div
                            key={parameter.key}
                            className="space-y-2"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <Label>{parameter.key}</Label>

                                <Badge variant="outline">
                                    {parameter.required
                                        ? t("required")
                                        : t("optional")}
                                </Badge>

                                {parameter.encrypted && (
                                    <Badge variant="secondary">
                                        {t("encrypted")}
                                    </Badge>
                                )}
                            </div>

                            {parameter.encrypted ? (
                                <Badge variant="outline">
                                    {parameter.configured
                                        ? t("configured")
                                        : t("notConfigured")}
                                </Badge>
                            ) : (
                                <Input
                                    value={parameter.value ?? ""}
                                    placeholder={t("notConfigured")}
                                    readOnly
                                />
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("grantedPermissions")}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {!instance.models_permissions.some(
                        (permission) =>
                            permissionOperations.some(
                                (operation) =>
                                    permission[operation]
                            )
                    ) && (
                            <p className="text-sm text-muted-foreground">
                                {t("noGrantedPermissions")}
                            </p>
                        )}

                    {instance.models_permissions
                        .filter((permission) =>
                            permissionOperations.some(
                                (operation) =>
                                    permission[operation]
                            )
                        )
                        .map((permission) => (
                            <div
                                key={permission.table_id}
                                className="space-y-2"
                            >
                                <h3 className="font-medium">
                                    {tableNames.get(permission.table_id)
                                        ?? permission.table_id}
                                </h3>

                                <div className="flex flex-wrap gap-2">
                                    {permissionOperations
                                        .filter(
                                            (operation) =>
                                                permission[operation]
                                        )
                                        .map((operation) => (
                                            <Badge
                                                key={operation}
                                                variant="secondary"
                                            >
                                                {catalog(
                                                    `operations.${operation}`
                                                )}
                                            </Badge>
                                        ))}
                                </div>
                            </div>
                        ))}
                </CardContent>
            </Card>

            {canWrite && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("dangerZone")}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {t("deleteDescription")}
                        </p>

                        <InstanceActions
                            instance={instance}
                            mode="delete"
                        />
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
