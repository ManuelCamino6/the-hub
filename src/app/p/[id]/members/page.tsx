
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { requireProjectAdmin } from "@/lib/projects/context";
import { listMembers } from "@/lib/projects/member-service";
import { decodeCursor } from "@/lib/api/pagination";

import { ProjectMembers } from "@/components/projects/project-members";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ cursor?: string }>;
};

export default function MembersPage(props: Props) {
    return (
        <Suspense fallback={
            <Skeleton className="h-64 w-full" />
        }>
            <MembersContent {...props} />
        </Suspense>
    );
}

async function MembersContent({
    params,
    searchParams,
}: Props) {
    const { id } = await params;

    await requireProjectAdmin(id);

    const supabase = await createClient();

    const { data: { user } } =
        await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { cursor } = await searchParams;

    try {
        decodeCursor(cursor);
    } catch {
        redirect(`/p/${id}/members`);
    }

    const result = await listMembers(id, {
        limit: 50,
        cursor,
    });

    const t = await getTranslations("Projects");

    const base = `/p/${id}/members`;

    return (
        <>
            <ProjectMembers
                projectId={id}
                currentUserId={user.id}
                members={result.data}
            />

            <div className="flex justify-end gap-2">
                {cursor && (
                    <Button variant="outline" asChild>
                        <Link href={base}>
                            {t("firstPage")}
                        </Link>
                    </Button>
                )}

                {result.next_cursor && (
                    <Button variant="outline" asChild>
                        <Link href={
                            `${base}?cursor=${encodeURIComponent(
                                result.next_cursor
                            )}`
                        }>
                            {t("nextPage")}
                        </Link>
                    </Button>
                )}
            </div>
        </>
    );
}
