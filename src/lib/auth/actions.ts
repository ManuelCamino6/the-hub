
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