"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
    requestPasswordReset,
} from "@/lib/auth/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

export function ForgotPasswordForm() {
    const t = useTranslations("Auth");

    const [state, action, pending] =
        useActionState(
            requestPasswordReset,
            {}
        );

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {t("forgotPasswordTitle")}
                </CardTitle>

                <CardDescription>
                    {t("forgotPasswordDescription")}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form
                    action={action}
                    className="flex flex-col gap-6"
                >
                    <div className="grid gap-2">
                        <Label htmlFor="email">
                            {t("email")}
                        </Label>

                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            disabled={pending}
                        />
                    </div>

                    {state.error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {state.error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {state.success && (
                        <Alert>
                            <AlertDescription>
                                {state.success}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        disabled={pending}
                    >
                        {pending
                            ? t("sendingRecoveryEmail")
                            : t("sendRecoveryEmail")}
                    </Button>

                    <Button
                        asChild
                        variant="link"
                    >
                        <Link href="/login">
                            {t("backToLogin")}
                        </Link>
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}