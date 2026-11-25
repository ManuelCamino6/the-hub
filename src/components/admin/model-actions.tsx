
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type Props = {
    modelId: string;
    modelName: string;
};

export function ModelActions({
    modelId,
    modelName,
}: Props) {
    const router = useRouter();
    const t = useTranslations("Admin");
    const common = useTranslations("Common");

    const [open, setOpen] = useState(false);

    const [confirmation, setConfirmation] =
        useState("");

    const [pending, setPending] =
        useState(false);

    const [error, setError] = useState<
        "conflict" | "error" | null
    >(null);

    async function remove() {
        if (
            pending ||
            confirmation !== modelName
        ) {
            return;
        }

        setPending(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/tables/${modelId}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                setError(
                    response.status === 409
                        ? "conflict"
                        : "error"
                );

                return;
            }

            setOpen(false);

            router.replace("/admin/models");
            router.refresh();
        } catch {
            setError("error");
        } finally {
            setPending(false);
        }
    }

    return (
        <AlertDialog
            open={open}
            onOpenChange={(value) => {
                if (pending) return;

                setOpen(value);
                setConfirmation("");
                setError(null);
            }}
        >
            <AlertDialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 />
                    {t("delete")}
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {t("delete")}: {modelName}
                    </AlertDialogTitle>

                    <AlertDialogDescription>
                        {t("deleteDescription")}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="delete-model-confirmation">
                        {t("confirmName")}
                    </Label>

                    <Input
                        id="delete-model-confirmation"
                        value={confirmation}
                        placeholder={modelName}
                        disabled={pending}
                        onChange={(event) =>
                            setConfirmation(event.target.value)
                        }
                    />
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            {t(error)}
                        </AlertDescription>
                    </Alert>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>
                        {common("cancel")}
                    </AlertDialogCancel>

                    <Button
                        variant="destructive"
                        disabled={
                            pending ||
                            confirmation !== modelName
                        }
                        onClick={remove}
                    >
                        {pending
                            ? t("deleting")
                            : t("delete")}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
