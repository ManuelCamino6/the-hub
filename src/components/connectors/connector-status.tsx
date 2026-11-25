
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
    connectorStatuses,
    type ConnectorDetail,
    type ConnectorStatus as Status,
} from "@/lib/connectors/schemas";

export function ConnectorStatus({
    connector,
}: {
    connector: ConnectorDetail;
}) {
    const t = useTranslations("Connectors");
    const common = useTranslations("Common");
    const router = useRouter();

    const [nextStatus, setNextStatus] =
        useState<Status | null>(null);

    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);

    async function changeStatus() {
        if (!nextStatus || pending) return;

        setPending(true);
        setError(false);

        try {
            const response = await fetch(
                `/api/connectors/${connector.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: connector.name,
                        description: connector.description ?? "",
                        status: nextStatus,
                        parameters: connector.parameters,
                        models_permissions: connector.models_permissions,
                    }),
                }
            );

            if (!response.ok) {
                setError(true);
                return;
            }

            setNextStatus(null);
            router.refresh();
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }

    if (connector.status === "DEPRECATED") {
        return (
            <Alert>
                <AlertDescription>
                    {t("terminalStatus")}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm font-medium">
                {t("changeStatus")}
            </p>

            <div className="flex flex-wrap gap-2">
                {connectorStatuses
                    .filter((status) => status !== connector.status)
                    .map((status) => (
                        <Button
                            key={status}
                            variant="outline"
                            disabled={pending}
                            onClick={() => {
                                setError(false);
                                setNextStatus(status);
                            }}
                        >
                            {t(`statuses.${status}`)}
                        </Button>
                    ))}
            </div>

            <AlertDialog
                open={nextStatus !== null}
                onOpenChange={(open) => {
                    if (!open && !pending) setNextStatus(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("changeStatus")}
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            {t("statusConfirmation")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {nextStatus && (
                        <div className="space-y-2 text-sm">
                            <p>
                                {t("currentStatus")}:{" "}
                                {t(`statuses.${connector.status}`)}
                            </p>

                            <p>
                                {t("newStatus")}:{" "}
                                {t(`statuses.${nextStatus}`)}
                            </p>

                            {nextStatus === "DEPRECATED" && (
                                <Alert>
                                    <AlertDescription>
                                        {t("deprecatedWarning")}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {nextStatus === "IN_DEVELOPMENT" &&
                                connector.status === "AVAILABLE" && (
                                    <Alert>
                                        <AlertDescription>
                                            {t("pauseWarning")}
                                        </AlertDescription>
                                    </Alert>
                                )}
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {t("error")}
                            </AlertDescription>
                        </Alert>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>
                            {common("cancel")}
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={pending}
                            onClick={(event) => {
                                event.preventDefault();
                                void changeStatus();
                            }}
                        >
                            {pending
                                ? common("loading")
                                : common("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
