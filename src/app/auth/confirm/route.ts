import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const tokenHash =
        request.nextUrl.searchParams.get("token_hash");

    const type =
        request.nextUrl.searchParams.get("type") ?? "email";

    if (
        !tokenHash ||
        (type !== "email" && type !== "recovery")
    ) {
        return NextResponse.redirect(
            new URL("/auth/error", request.url)
        );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
    });

    if (error) {
        return NextResponse.redirect(
            new URL("/auth/error", request.url)
        );
    }

    return NextResponse.redirect(
        new URL(
            type === "recovery"
                ? "/reset-password"
                : "/dashboard",
            request.url
        )
    );
}