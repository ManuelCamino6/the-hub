
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Play, Trash2 } from "lucide-react";

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

import type {
    InstanceDetail,
} from "@/lib/instances/schemas";

type Props = {
    instance: InstanceDetail;
    mode: "resume" | "delete";
};

export function InstanceActions({
    instance,
    mode,
}: Props) {
    const router = useRouter();
    const t = useTranslations("Instances");
    const common = useTranslations("Common");

    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);

    const deleting = mode === "delete";

    const canResume =
        instance.operation_status === "PAUSED" &&
        instance.status === "OK" &&
        instance.connector_status === "AVAILABLE" &&
        !instance.connector_deleted;

    const title = deleting
        ? t("deleteInstance")
        : t("resume");

    async function execute() {
        if (pending) return;

        setPending(true);
        setError(false);

        try {
            const base = `/api/instances/${instance.id}`;

            const response = await fetch(
                deleting ? base : `${base}/resume`,
                {
                    method: deleting ? "DELETE" : "POST",
                    cache: "no-store",
                }
            );

            if (!response.ok) {
                setError(true);
                return;
            }

            setOpen(false);

            if (deleting) {
                router.replace(
                    `/p/${instance.project_id}/integrations`
                );
            }

            router.refresh();
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }

    if (
        !deleting &&
        instance.operation_status !== "PAUSED"
    ) {
        return null;
    }

    return (
        <div className="space-y-3" >
            <Button
                variant={deleting ? "destructive" : "default"}
                disabled={pending || (!deleting && !canResume)
                }
                onClick={() => {
                    setError(false);
                    setOpen(true);
                }}
            >
                {deleting ? <Trash2 /> : <Play />}
                {title}
            </Button>

            {
                !deleting && !canResume && (
                    <p className="text-sm text-muted-foreground" >
                        {t("resumeUnavailable")}
                    </p>
                )
            }

            <AlertDialog
                open={open}
                onOpenChange={(value) => {
                    if (!pending) setOpen(value);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {title}
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            {instance.name}
                            {" — "}
                            {
                                deleting
                                    ? t("deleteDescription")
                                    : t("resumeDescription")
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {
                        error && (
                            <Alert variant="destructive" >
                                <AlertDescription>
                                    {t("lifecycleError")}
                                </AlertDescription>
                            </Alert>
                        )
                    }

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>
                            {common("cancel")}
                        </AlertDialogCancel>

                        < AlertDialogAction
                            disabled={pending}
                            onClick={(event) => {
                                event.preventDefault();
                                void execute();
                            }}
                        >
                            {
                                pending
                                    ? deleting
                                        ? t("deleting")
                                        : t("resuming")
                                    : title}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
