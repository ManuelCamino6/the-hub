import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
    ResetPasswordForm,
} from "@/components/reset-password-form";

import { Skeleton } from "@/components/ui/skeleton";

async function ResetPasswordContent() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/forgot-password");
    }

    return <ResetPasswordForm />;
}

function ResetPasswordSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <main className="flex min-h-svh items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <Suspense
                    fallback={<ResetPasswordSkeleton />}
                >
                    <ResetPasswordContent />
                </Suspense>
            </div>
        </main>
    );
}