
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

type Props = {
    projectId: string;
    email: string;
};

export function ResendInvitation({
    projectId,
    email,
}: Props) {
    const t = useTranslations("Members");

    const [pending, setPending] = useState(false);

    const [result, setResult] = useState<
        "sent" | "error" | null
    >(null);

    async function resend() {
        if (pending) return;

        setPending(true);
        setResult(null);

        try {
            const response = await fetch(
                `/api/projects/${projectId}/users/resend`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email }),
                    cache: "no-store",
                }
            );

            setResult(
                response.ok ? "sent" : "error"
            );
        } catch {
            setResult("error");
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="space-y-2">
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={resend}
            >
                <Mail />

                {pending
                    ? t("resending")
                    : t("resendInvitation")}
            </Button>

            {result && (
                <Alert
                    variant={
                        result === "error"
                            ? "destructive"
                            : "default"
                    }
                >
                    <AlertDescription>
                        {result === "sent"
                            ? t("invitationSent")
                            : t("invitationResendUnavailable")}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
