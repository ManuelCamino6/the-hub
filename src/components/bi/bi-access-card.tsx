"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    Database,
    Lock,
    RefreshCw,
    ShieldCheck,
    Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    BiConnectionFields,
} from "./bi-connection-fields";

import {
    BiCredentialsDialog,
} from "./bi-credentials-dialog";

import type {
    BiAccessDetail,
    BiCredentials,
    BiDisableResult,
} from "@/lib/bi/schemas";

type Operation = "enable" | "rotate" | "disable";

type Props = {
    projectId: string;
    detail: BiAccessDetail;
};

export function BiAccessCard({
    projectId,
    detail,
}: Props) {
    const t = useTranslations("BI");
    const common = useTranslations("Common");

    const router = useRouter();

    const [pending, setPending] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [warning, setWarning] =
        useState(false);

    const [credentials, setCredentials] =
        useState<BiCredentials | null>(null);

    const [confirmation, setConfirmation] =
        useState<"rotate" | "disable" | null>(null);

    const enabled =
        detail.access?.enabled === true;

    async function execute(
        operation: Operation
    ) {
        if (pending) return;

        setPending(true);
        setError(null);
        setWarning(false);
        setConfirmation(null);

        const endpoint =
            `/api/projects/${projectId}/bi`;

        try {
            const response = await fetch(
                operation === "rotate"
                    ? `${endpoint}/rotate`
                    : endpoint,
                {
                    method:
                        operation === "disable"
                            ? "DELETE"
                            : "POST",
                    cache: "no-store",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                switch (result.error?.code) {
                    case "BI_ALREADY_ENABLED":
                        setError(t("alreadyEnabled"));
                        break;

                    case "BI_NOT_ENABLED":
                        setError(t("notEnabled"));
                        break;

                    case "BI_ROTATION_TOO_SOON":
                        setError(t("rotationTooSoon"));
                        break;

                    default:
                        setError(t("error"));
                }

                router.refresh();
                return;
            }

            if (operation === "disable") {
                const data =
                    result.data as BiDisableResult;

                setWarning(
                    !data.sessions.complete
                );
            } else {
                const data =
                    result.data as BiCredentials;

                setCredentials(data);
            }

            router.refresh();
        } catch {
            setError(t("error"));
            router.refresh();
        } finally {
            setPending(false);
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle>
                            {t("connection")}
                        </CardTitle>

                        {detail.access && (
                            <Badge
                                variant={
                                    enabled
                                        ? "default"
                                        : "secondary"
                                }
                            >
                                {enabled
                                    ? t("enabled")
                                    : t("disabled")}
                            </Badge>
                        )}
                    </div>

                    <CardDescription>
                        {t("connectionDescription")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {warning && (
                        <Alert>
                            <Info />

                            <AlertDescription>
                                {t("sessionWarning")}
                            </AlertDescription>
                        </Alert>
                    )}

                    {!detail.available ? (
                        <Alert>
                            <Info />

                            <AlertDescription>
                                <strong>
                                    {t("unavailableTitle")}
                                </strong>

                                <p>
                                    {t("unavailableDescription")}
                                </p>
                            </AlertDescription>
                        </Alert>
                    ) : enabled && detail.connection ? (
                        <>
                            <BiConnectionFields
                                connection={detail.connection}
                            />

                            <Alert>
                                <ShieldCheck />

                                <AlertDescription>
                                    {t("readOnlyNotice")}
                                </AlertDescription>
                            </Alert>

                            <p>
                                {t("passwordNotice")}
                            </p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-8 text-center">
                            {detail.access
                                ? <Lock />
                                : <Database />}

                            <div className="grid gap-2">
                                <strong>
                                    {detail.access
                                        ? t("disabledTitle")
                                        : t("initialTitle")}
                                </strong>

                                <p>
                                    {detail.access
                                        ? t("disabledDescription")
                                        : t("initialDescription")}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>

                {(detail.available || enabled) && (
                    <CardFooter className="flex flex-wrap gap-2">
                        {enabled ? (
                            <>
                                {detail.available && (
                                    <Button
                                        variant="outline"
                                        disabled={pending}
                                        onClick={() =>
                                            setConfirmation("rotate")
                                        }
                                    >
                                        <RefreshCw />
                                        {t("rotate")}
                                    </Button>
                                )}

                                <Button
                                    variant="destructive"
                                    disabled={pending}
                                    onClick={() =>
                                        setConfirmation("disable")
                                    }
                                >
                                    {t("disable")}
                                </Button>
                            </>
                        ) : (
                            <Button
                                disabled={pending}
                                onClick={() =>
                                    execute("enable")
                                }
                            >
                                {pending
                                    ? t("processing")
                                    : detail.access
                                        ? t("reactivate")
                                        : t("enable")}
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>

            <AlertDialog
                open={confirmation !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmation(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmation === "rotate"
                                ? t("rotateTitle")
                                : t("disableTitle")}
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            {confirmation === "rotate"
                                ? t("rotateDescription")
                                : t("disableDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {common("cancel")}
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={pending}
                            onClick={() => {
                                if (confirmation) {
                                    void execute(confirmation);
                                }
                            }}
                        >
                            {common("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <BiCredentialsDialog
                credentials={credentials}
                onClose={() =>
                    setCredentials(null)
                }
            />
        </>
    );
}