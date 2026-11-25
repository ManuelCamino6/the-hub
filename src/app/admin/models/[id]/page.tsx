
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
    ModelActions,
} from "@/components/admin/model-actions";

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    requireAdminModel,
} from "@/lib/protocol/admin-context";

import {
    getAllModelSummaries,
} from "@/lib/protocol/admin-service";

type Props = {
    params: Promise<{ id: string }>;
};

async function ModelContent({ params }: Props) {
    const { id } = await params;

    const { user, model } =
        await requireAdminModel(id);

    const t = await getTranslations("Admin");

    const models =
        await getAllModelSummaries(user.id);

    const modelNames = new Map(
        models.map((item) => [item.id, item.name])
    );

    return (
        <>
            <div>
                <Button variant="ghost" asChild>
                    <Link href="/admin/models">
                        <ArrowLeft />
                        {t("models")}
                    </Link>
                </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1>{model.name}</h1>
                    <p>{model.description}</p>
                </div>

                <Button asChild>
                    <Link
                        href={`/admin/models/${id}/edit`}
                    >
                        <Pencil />
                        {t("edit")}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("modelId")}</CardTitle>
                </CardHeader>

                <CardContent>
                    <Input value={model.id} readOnly />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("systemColumns")}
                    </CardTitle>

                    <CardDescription>
                        {t("systemColumnsDescription")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-wrap gap-2">
                    {[
                        "id",
                        "project_id",
                        "created_at",
                        "deleted_at",
                    ].map((name) => (
                        <Badge key={name} variant="outline">
                            {name}
                        </Badge>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("columns")}</CardTitle>
                </CardHeader>

                <CardContent>
                    {model.columns.length === 0 ? (
                        <p>{t("noColumns")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("name")}</TableHead>
                                    <TableHead>{t("columnType")}</TableHead>
                                    <TableHead>{t("nullable")}</TableHead>
                                    <TableHead>{t("constant")}</TableHead>
                                    <TableHead>{t("foreignKey")}</TableHead>
                                    <TableHead>{t("defaultValue")}</TableHead>
                                    <TableHead>{t("possibleValues")}</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {model.columns.map((column) => (
                                    <TableRow key={column.id}>
                                        <TableCell>
                                            <div>{column.name}</div>
                                            <div>{column.description}</div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline">
                                                {column.type}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            {t(column.nullable ? "yes" : "no")}
                                        </TableCell>

                                        <TableCell>
                                            {t(column.constant ? "yes" : "no")}
                                        </TableCell>

                                        <TableCell>
                                            {column.foreign_key
                                                ? modelNames.get(
                                                    column.foreign_key
                                                ) ?? column.foreign_key
                                                : "—"}
                                        </TableCell>

                                        <TableCell>
                                            {column.default_value === null
                                                ? "—"
                                                : JSON.stringify(
                                                    column.default_value
                                                )}
                                        </TableCell>

                                        <TableCell>
                                            {column.possible_values
                                                ? JSON.stringify(
                                                    column.possible_values
                                                )
                                                : "—"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("dangerZone")}
                    </CardTitle>

                    <CardDescription>
                        {t("deleteDescription")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <ModelActions
                        modelId={model.id}
                        modelName={model.name}
                    />
                </CardContent>
            </Card>
        </>
    );
}

export default function ModelPage(props: Props) {
    return (
        <Suspense
            fallback={
                <Skeleton className="h-48 w-full" />
            }
        >
            <ModelContent {...props} />
        </Suspense>
    );
}
