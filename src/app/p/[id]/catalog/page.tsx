
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Plug, Search } from "lucide-react";

import {
    requireBusinessProject,
} from "@/lib/projects/business-context";

import {
    listConnectors,
} from "@/lib/connectors/service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        name?: string;
        cursor?: string;
    }>;
};

export default function CatalogPage(props: Props) {
    return (
        <Suspense fallback={<CatalogSkeleton />}>
            <CatalogContent {...props} />
        </Suspense>
    );
}

async function CatalogContent({
    params,
    searchParams,
}: Props) {
    const { id } = await params;

    await requireBusinessProject(id);

    const t = await getTranslations("Catalog");
    const common = await getTranslations("Common");

    const query = await searchParams;

    const name =
        typeof query.name === "string"
            ? query.name.trim().slice(0, 120)
            : "";

    const base = `/p/${id}/catalog`;

    const result = await listConnectors({
        project_id: id,
        name: name || undefined,
        cursor: query.cursor,
        limit: 24,
    }).catch(() => null);

    function pageUrl(cursor?: string) {
        const search = new URLSearchParams();

        if (name) search.set("name", name);
        if (cursor) search.set("cursor", cursor);

        const value = search.toString();

        return value ? `${base}?${value}` : base;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">
                    {t("title")}
                </h1>

                <p className="text-sm text-muted-foreground">
                    {t("description")}
                </p>
            </div>

            <form
                action={base}
                className="flex flex-wrap gap-2"
            >
                <Input
                    name="name"
                    defaultValue={name}
                    placeholder={t("searchPlaceholder")}
                    aria-label={t("searchPlaceholder")}
                    maxLength={120}
                    className="max-w-sm"
                />

                <Button type="submit" variant="outline">
                    <Search />
                    {common("search")}
                </Button>

                {name && (
                    <Button variant="ghost" asChild>
                        <Link href={base}>
                            {t("clearSearch")}
                        </Link>
                    </Button>
                )}
            </form>

            {!result ? (
                <Alert variant="destructive">
                    <AlertDescription>
                        {t("loadError")}
                    </AlertDescription>
                </Alert>
            ) : result.data.length === 0 ? (
                <Card>
                    <CardHeader>
                        <Plug className="size-8 text-muted-foreground" />

                        <CardTitle>
                            {name ? t("noResults") : t("empty")}
                        </CardTitle>

                        <CardDescription>
                            {name
                                ? t("noResultsDescription")
                                : t("emptyDescription")}
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {result.data.map((connector) => (
                        <Card key={connector.id}>
                            <CardHeader>
                                <Plug className="size-8 text-muted-foreground" />

                                <CardTitle>
                                    {connector.name}
                                </CardTitle>

                                <CardDescription>
                                    {connector.description}
                                </CardDescription>
                            </CardHeader>

                            <CardFooter className="mt-auto">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href={`${base}/${connector.id}`}>
                                        {t("open")}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {result && (
                <div className="flex justify-end gap-2">
                    {query.cursor && (
                        <Button variant="outline" asChild>
                            <Link href={pageUrl()}>
                                {t("firstPage")}
                            </Link>
                        </Button>
                    )}

                    {result.next_cursor && (
                        <Button variant="outline" asChild>
                            <Link href={pageUrl(result.next_cursor)}>
                                {t("nextPage")}
                            </Link>
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

function CatalogSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full max-w-sm" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton
                        key={index}
                        className="h-48 w-full"
                    />
                ))}
            </div>
        </div>
    );
}
