
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus, Plug } from "lucide-react";

import {
    requireDevelopmentProject,
} from "@/lib/connectors/context";

import { listConnectors } from "@/lib/connectors/service";
import { decodeCursor } from "@/lib/api/pagination";

import {
    listConnectorsSchema,
    connectorStatuses,
    connectorVisibilities,
} from "@/lib/connectors/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        name?: string;
        status?: string;
        visibility?: string;
        cursor?: string;
    }>;
};

export default function ConnectorsPage(props: Props) {
    return (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ConnectorsContent {...props} />
        </Suspense>
    );
}

async function ConnectorsContent({
    params,
    searchParams,
}: Props) {
    const { id } = await params;

    const project = await requireDevelopmentProject(id);
    const query = await searchParams;
    const base = `/p/${id}/connectors`;

    const parsed = listConnectorsSchema.safeParse({
        project_id: id,
        name: query.name || undefined,
        status: query.status || undefined,
        visibility: query.visibility || undefined,
        cursor: query.cursor || undefined,
        limit: 50,
    });

    if (!parsed.success) redirect(base);

    try {
        decodeCursor(parsed.data.cursor);
    } catch {
        redirect(base);
    }

    const [result, t, common, projects] = await Promise.all([
        listConnectors(parsed.data),
        getTranslations("Connectors"),
        getTranslations("Common"),
        getTranslations("Projects"),
    ]);

    const canWrite = project.role !== "VIEWER";

    function filterUrl(
        key: "status" | "visibility",
        value?: string
    ) {
        const filters = new URLSearchParams();

        if (query.name) filters.set("name", query.name);
        if (query.status) filters.set("status", query.status);
        if (query.visibility) {
            filters.set("visibility", query.visibility);
        }

        if (value) filters.set(key, value);
        else filters.delete(key);

        return `${base}?${filters.toString()}`;
    }

    function pageUrl(cursor?: string) {
        const filters = new URLSearchParams();

        if (query.name) filters.set("name", query.name);
        if (query.status) filters.set("status", query.status);
        if (query.visibility) {
            filters.set("visibility", query.visibility);
        }
        if (cursor) filters.set("cursor", cursor);

        return `${base}?${filters.toString()}`;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {t("title")}
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        {t("description")}
                    </p>
                </div>

                {canWrite && (
                    <Button asChild>
                        <Link href={`${base}/new`}>
                            <Plus />
                            {t("create")}
                        </Link>
                    </Button>
                )}
            </div>

            <form
                action={base}
                className="flex gap-2"
            >
                <Input
                    name="name"
                    defaultValue={query.name}
                    placeholder={common("search")}
                    maxLength={120}
                />

                {query.status && (
                    <input
                        type="hidden"
                        name="status"
                        value={query.status}
                    />
                )}

                {query.visibility && (
                    <input
                        type="hidden"
                        name="visibility"
                        value={query.visibility}
                    />
                )}

                <Button type="submit" variant="outline">
                    {common("search")}
                </Button>
            </form>

            <div className="space-y-2">
                <p className="text-sm font-medium">
                    {t("status")}
                </p>

                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={!query.status ? "default" : "outline"}
                        asChild
                    >
                        <Link href={filterUrl("status")}>
                            {t("all")}
                        </Link>
                    </Button>

                    {connectorStatuses.map((status) => (
                        <Button
                            key={status}
                            size="sm"
                            variant={
                                query.status === status
                                    ? "default"
                                    : "outline"
                            }
                            asChild
                        >
                            <Link href={filterUrl("status", status)}>
                                {t(`statuses.${status}`)}
                            </Link>
                        </Button>
                    ))}
                </div>

                <p className="text-sm font-medium">
                    {t("visibility")}
                </p>

                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={!query.visibility ? "default" : "outline"}
                        asChild
                    >
                        <Link href={filterUrl("visibility")}>
                            {t("all")}
                        </Link>
                    </Button>

                    {connectorVisibilities.map((visibility) => (
                        <Button
                            key={visibility}
                            size="sm"
                            variant={
                                query.visibility === visibility
                                    ? "default"
                                    : "outline"
                            }
                            asChild
                        >
                            <Link href={
                                filterUrl("visibility", visibility)
                            }>
                                {t(`visibilities.${visibility}`)}
                            </Link>
                        </Button>
                    ))}
                </div>
            </div>

            {!result.data.length ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("empty")}</CardTitle>

                        {canWrite &&
                            !query.name &&
                            !query.status &&
                            !query.visibility && (
                                <CardDescription>
                                    {t("emptyDescription")}
                                </CardDescription>
                            )}
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {result.data.map((connector) => (
                        <Card key={connector.id}>
                            <CardHeader>
                                <Plug className="size-5" />

                                <CardTitle>
                                    <Link
                                        href={`${base}/${connector.id}`}
                                        className="hover:underline"
                                    >
                                        {connector.name}
                                    </Link>
                                </CardTitle>

                                <CardDescription>
                                    {connector.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                    {t(`statuses.${connector.status}`)}
                                </Badge>

                                <Badge variant="outline">
                                    {t(`visibilities.${connector.visibility}`)}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="flex justify-end gap-2">
                {query.cursor && (
                    <Button variant="outline" asChild>
                        <Link href={pageUrl()}>
                            {projects("firstPage")}
                        </Link>
                    </Button>
                )}

                {result.next_cursor && (
                    <Button variant="outline" asChild>
                        <Link href={pageUrl(result.next_cursor)}>
                            {projects("nextPage")}
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
