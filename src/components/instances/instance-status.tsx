
"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

import type {
    InstanceStatus,
    InstanceOperationStatus,
} from "@/lib/instances/schemas";

export function InstanceStatusBadge({
    status,
}: {
    status: InstanceStatus;
}) {
    const t = useTranslations("Instances");

    return (
        <Badge
            variant={
                status === "UNAUTHORIZED"
                    ? "destructive"
                    : status === "OK"
                        ? "default"
                        : "secondary"
            }
        >
            {t(`statuses.${status}`)}
        </Badge>
    );
}

export function OperationStatusBadge({
    status,
}: {
    status: InstanceOperationStatus;
}) {
    const t = useTranslations("Instances");

    return (
        <Badge variant="outline">
            {t(`operationStatuses.${status}`)}
        </Badge>
    );
}
