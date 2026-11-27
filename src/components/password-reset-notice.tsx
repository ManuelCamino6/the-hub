"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

export function PasswordResetNotice() {
    const t = useTranslations("Auth");
    const searchParams = useSearchParams();

    if (searchParams.get("reset") !== "success") {
        return null;
    }

    return (
        <Alert>
            <AlertDescription>
                {t("passwordResetSuccess")}
            </AlertDescription>
        </Alert>
    );
}