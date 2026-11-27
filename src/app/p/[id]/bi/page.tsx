import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
    createClient,
} from "@/lib/supabase/server";

import {
    requireProjectAdmin,
} from "@/lib/projects/context";

import {
    getBiAccess,
} from "@/lib/bi/service";

import {
    BiAccessCard,
} from "@/components/bi/bi-access-card";

import {
    BiSkeleton,
} from "@/components/bi/bi-skeleton";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

async function BiContent({ params }: Props) {
    const { id } = await params;

    console.log("[BI] 1. Starting");

    const project = await requireProjectAdmin(id);

    console.log("[BI] 2. Project authorized");

    if (project.type !== "BUSINESS") {
        redirect(`/p/${id}`);
    }

    const supabase = await createClient();

    console.log("[BI] 3. Supabase client created");

    const {
        data: { user },
    } = await supabase.auth.getUser();

    console.log("[BI] 4. Authentication completed");

    if (!user) {
        redirect("/login");
    }

    console.log("[BI] 5. Loading BI access");

    const detail = await getBiAccess(user.id, id);

    console.log("[BI] 6. BI access loaded");

    const t = await getTranslations("BI");

    console.log("[BI] 7. Translations loaded");

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-2">
                    <h1>{t("title")}</h1>
                    <p>{t("description")}</p>
                </div>

                <Button variant="outline" asChild>
                    <Link href="/docs/bi">
                        <BookOpen />
                        {t("documentation")}
                    </Link>
                </Button>
            </div>

            <BiAccessCard
                projectId={id}
                detail={detail}
            />
        </div>
    );
}

export default function BiPage(
    props: Props
) {
    return (
        <Suspense fallback={<BiSkeleton />}>
            <BiContent {...props} />
        </Suspense>
    );
}