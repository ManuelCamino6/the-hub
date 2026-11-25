
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

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

import { TokenDialog } from "./token-dialog";

type Props = {
    projectId: string;
    connectorId: string;
    mode?: "rotate" | "delete" | "both";
};

export function ConnectorActions({
    projectId,
    connectorId,
    mode = "both",
}: Props) {
    const t = useTranslations("Connectors");
    const common = useTranslations("Common");
    const router = useRouter();

    const [action, setAction] = useState<
        "rotate" | "delete" | null
    >(null);

    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    async function execute() {
        if (!action || pending) return;

        setPending(true);
        setError(false);

        try {
            const base = `/api/connectors/${connectorId}`;

            const response = await fetch(
                action === "rotate"
                    ? `${base}/token/rotate`
                    : base,
                {
                    method: action === "rotate" ? "POST" : "DELETE",
                    cache: "no-store",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setError(true);
                return;
            }

            if (action === "rotate") {
                setToken(result.data.token);
            } else {
                router.replace(`/p/${projectId}/connectors`);
                router.refresh();
            }

            setAction(null);
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {mode !== "delete" && (
                    <Button
                        variant="outline"
                        disabled={pending || !!token}
                        onClick={() => {
                            setError(false);
                            setAction("rotate");
                        }}
                    >
                        <KeyRound />
                        {t("rotateToken")}
                    </Button>
                )}
                {mode !== "rotate" && (
                    <Button
                        variant="destructive"
                        disabled={pending || !!token}
                        onClick={() => {
                            setError(false);
                            setAction("delete");
                        }}
                    >
                        <Trash2 />
                        {t("deleteConnector")}
                    </Button>
                )}
            </div>

            <AlertDialog
                open={action !== null}
                onOpenChange={(open) => {
                    if (!open && !pending) setAction(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {action === "rotate"
                                ? t("rotateToken")
                                : t("deleteConnector")}
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            {action === "rotate"
                                ? t("rotateWarning")
                                : t("deleteWarning")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

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
                                void execute();
                            }}
                        >
                            {pending
                                ? common("loading")
                                : common("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {token && (
                <TokenDialog
                    token={token}
                    onConfirm={() => {
                        setToken(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
