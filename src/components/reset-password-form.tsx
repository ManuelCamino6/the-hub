"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { resetPassword } from "@/lib/auth/actions";

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

export function ResetPasswordForm() {
    const t = useTranslations("Auth");

    const [state, action, pending] =
        useActionState(resetPassword, {});

    const completed = Boolean(state.success);

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {t("resetPasswordTitle")}
                </CardTitle>

                <CardDescription>
                    {t("resetPasswordDescription")}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form
                    action={action}
                    className="flex flex-col gap-6"
                >
                    {!completed && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    {t("newPassword")}
                                </Label>

                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    disabled={pending}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">
                                    {t("confirmPassword")}
                                </Label>

                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    disabled={pending}
                                />
                            </div>
                        </>
                    )}

                    {state.success && (
                        <Alert>
                            <AlertDescription>
                                {state.success}
                            </AlertDescription>
                        </Alert>
                    )}

                    {state.error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {state.error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {!completed && (
                        <Button
                            type="submit"
                            disabled={pending}
                        >
                            {pending
                                ? t("resettingPassword")
                                : t("resetPassword")}
                        </Button>
                    )}

                    <Button asChild variant="link">
                        <Link href="/login">
                            {t("backToLogin")}
                        </Link>
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}