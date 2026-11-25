
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus, Plug } from "lucide-react";

import {
    requireBusinessProject,
} from "@/lib/projects/business-context";

import {
    createClient,
} from "@/lib/supabase/server";

import {
    listInstances,
} from "@/lib/instances/service";

import {
    decodeCursor,
} from "@/lib/api/pagination";

import {
    InstanceStatusBadge,
    OperationStatusBadge,
} from "@/components/instances/instance-status";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";

import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@/components/ui/table";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        name?: string;
        cursor?: string;
    }>;
};

export default function IntegrationsPage(props: Props) {
    return (
        <Suspense
            fallback={<Skeleton className="h-64 w-full" />}
        >
            <IntegrationsContent {...props} />
        </Suspense>
    );
}

async function IntegrationsContent({
    params,
    searchParams,
}: Props) {
    const { id } = await params;

    const project = await requireBusinessProject(id);

    const supabase = await createClient();

    const { data: { user } } =
        await supabase.auth.getUser();

    if (!user) redirect("/login");

    const t = await getTranslations("Instances");
    const common = await getTranslations("Common");
    const catalog = await getTranslations("Catalog");

    const query = await searchParams;
    const base = `/p/${id}/integrations`;

    const name = typeof query.name === "string"
        ? query.name.trim().slice(0, 120)
        : "";

    try {
        decodeCursor(query.cursor);
    } catch {
        redirect(base);
    }

    const result = await listInstances(user.id, {
        project_id: id,
        name: name || undefined,
        cursor: query.cursor,
        limit: 50,
    });

    function pageUrl(cursor?: string) {
        const search = new URLSearchParams();

        if (name) search.set("name", name);
        if (cursor) search.set("cursor", cursor);

        return `${base}?${search.toString()}`;
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

                {project.role !== "VIEWER" && (
                    <Button asChild>
                        <Link href={`/p/${id}/catalog`}>
                            <Plus />
                            {t("create")}
                        </Link>
                    </Button>
                )}
            </div>

            <form action={base} className="flex gap-2">
                <Input
                    name="name"
                    defaultValue={name}
                    maxLength={120}
                    placeholder={common("search")}
                    aria-label={common("search")}
                    className="max-w-sm"
                />

                <Button variant="outline" type="submit">
                    {common("search")}
                </Button>
            </form>

            {!result.data.length ? (
                <Card>
                    <CardHeader>
                        <Plug className="size-8 text-muted-foreground" />

                        <CardTitle>
                            {name ? catalog("noResults") : t("empty")}
                        </CardTitle>

                        <CardDescription>
                            {name
                                ? catalog("noResultsDescription")
                                : t("emptyDescription")}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Button variant="outline" asChild>
                            <Link href={name ? base : `/p/${id}/catalog`}>
                                {name
                                    ? catalog("clearSearch")
                                    : t("explore")}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("name")}</TableHead>
                                    <TableHead>{t("connector")}</TableHead>

                                    <TableHead>
                                        {t("configurationStatus")}
                                    </TableHead>

                                    <TableHead>
                                        {t("operationStatus")}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {result.data.map((instance) => (
                                    <TableRow key={instance.id}>
                                        <TableCell className="font-medium">
                                            {instance.name}
                                        </TableCell>

                                        <TableCell>
                                            {instance.connector_name}
                                        </TableCell>

                                        <TableCell>
                                            <InstanceStatusBadge
                                                status={instance.status}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <OperationStatusBadge
                                                status={instance.operation_status}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end gap-2">
                {query.cursor && (
                    <Button variant="outline" asChild>
                        <Link href={pageUrl()}>
                            {catalog("firstPage")}
                        </Link>
                    </Button>
                )}

                {result.next_cursor && (
                    <Button variant="outline" asChild>
                        <Link href={pageUrl(result.next_cursor)}>
                            {catalog("nextPage")}
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
