
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export type AuthState = {
    error?: string;
    success?: string;
};

export async function login(
    _state: AuthState,
    formData: FormData
): Promise<AuthState> {
    const t = await getTranslations("Auth");
    const common = await getTranslations("Common");
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
    });

    if (error) {
        return {
            error:
                error.code === "invalid_credentials"
                    ? t("invalidCredentials")
                    : common("unexpectedError"),
        };
    }

    redirect("/dashboard");
}

export async function signup(
    _state: AuthState,
    formData: FormData
): Promise<AuthState> {
    const t = await getTranslations("Auth");
    const common = await getTranslations("Common");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    if (!name || !email || !password) {
        return { error: t("requiredFields") };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
        },
    });

    if (error) {
        return { error: common("unexpectedError") };
    }

    return { success: t("verifyEmail") };
}

export async function logout() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error("Unable to sign out.");
    }

    redirect("/login");
}

export async function loginWithGoogle() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    });

    if (error || !data.url) {
        redirect("/auth/error");
    }

    redirect(data.url);
}

export async function requestPasswordReset(
    _previousState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const t = await getTranslations("Auth");

    const email = String(
        formData.get("email") ?? ""
    ).trim();

    if (!email) {
        return {
            error: t("requiredFields"),
        };
    }

    const supabase = await createClient();

    const { error } =
        await supabase.auth.resetPasswordForEmail(
            email,
            {
                redirectTo:
                    `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
            }
        );

    if (error) {
        if (error.status === 429) {
            return {
                error: t("recoveryError"),
            };
        }
    }

    return {
        success: t("recoveryEmailSent"),
    };
}

export async function resetPassword(
    _previousState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const t = await getTranslations("Auth");

    const password = String(
        formData.get("password") ?? ""
    );

    const confirmPassword = String(
        formData.get("confirmPassword") ?? ""
    );

    if (password.length < 8) {
        return {
            error: t("passwordTooShort"),
        };
    }

    if (password !== confirmPassword) {
        return {
            error: t("passwordMismatch"),
        };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            error: t("invalidRecoverySession"),
        };
    }

    const { error } = await supabase.auth.updateUser({
        password,
    });

    if (error) {
        return {
            error: t("recoveryError"),
        };
    }

    const { error: signOutError } =
        await supabase.auth.signOut({
            scope: "global",
        });

    if (signOutError) {
        return {
            success: t("passwordResetSuccess"),
            error: t("sessionRevocationError"),
        };
    }

    redirect("/login?reset=success");
}