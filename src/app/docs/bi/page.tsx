import { Suspense } from "react";
import Link from "next/link";

import { getTranslations } from "next-intl/server";

import {
    Database,
    ShieldCheck,
    Gauge,
    Info,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from "@/components/ui/table";


import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata() {
    const t = await getTranslations("BiDocs");

    return {
        title: `${t("title")} | The Hub`,
        description: t("description"),
    };
}

async function BiDocsContent() {
    const t = await getTranslations("BiDocs");

    const connectionFields = [
        ["host", t("connection.configured")],
        ["port", t("connection.configured")],
        ["database", t("connection.configured")],
        ["schema", "analytics"],
        ["username", t("connection.configured")],
        ["password", t("connection.generated")],
        ["ssl", t("connection.required")],
    ] as const;

    return (
        <div className="grid gap-6">
            <div className="grid gap-2">
                <h1>{t("title")}</h1>
                <p>{t("description")}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("gettingStarted.title")}
                    </CardTitle>

                    <CardDescription>
                        {t("gettingStarted.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <ol className="grid list-decimal gap-2 pl-5">
                        <li>{t("gettingStarted.step1")}</li>
                        <li>{t("gettingStarted.step2")}</li>
                        <li>{t("gettingStarted.step3")}</li>
                        <li>{t("gettingStarted.step4")}</li>
                    </ol>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database />
                        {t("connection.title")}
                    </CardTitle>

                    <CardDescription>
                        {t("connection.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Table>
                        <TableBody>
                            {connectionFields.map(
                                ([key, value]) => (
                                    <TableRow key={key}>
                                        <TableCell>
                                            {t(`connection.${key}`)}
                                        </TableCell>

                                        <TableCell>
                                            {value}
                                        </TableCell>
                                    </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("powerBi.title")}
                    </CardTitle>

                    <CardDescription>
                        {t("powerBi.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4">
                    <ol className="grid list-decimal gap-2 pl-5">
                        <li>{t("powerBi.step1")}</li>
                        <li>{t("powerBi.step2")}</li>
                        <li>{t("powerBi.step3")}</li>
                        <li>{t("powerBi.step4")}</li>
                        <li>{t("powerBi.step5")}</li>
                        <li>{t("powerBi.step6")}</li>
                    </ol>

                    <Alert>
                        <Info />
                        <AlertDescription>
                            {t("powerBi.notice")}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("metabase.title")}
                    </CardTitle>

                    <CardDescription>
                        {t("metabase.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <ol className="grid list-decimal gap-2 pl-5">
                        <li>{t("metabase.step1")}</li>
                        <li>{t("metabase.step2")}</li>
                        <li>{t("metabase.step3")}</li>
                        <li>{t("metabase.step4")}</li>
                        <li>{t("metabase.step5")}</li>
                    </ol>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("queries.title")}
                    </CardTitle>

                    <CardDescription>
                        {t("queries.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <strong>{t("queries.select")}</strong>

                        <pre className="overflow-x-auto">
                            <code>{`select id, name, created_at
from analytics.stores
order by created_at desc
limit 100;`}</code>
                        </pre>
                    </div>

                    <div className="grid gap-2">
                        <strong>{t("queries.aggregate")}</strong>

                        <pre className="overflow-x-auto">
                            <code>{`select
    date_trunc('month', created_at) as month,
    count(*) as total
from analytics.stores
group by 1
order by 1;`}</code>
                        </pre>
                    </div>

                    <div className="grid gap-2">
                        <strong>{t("queries.join")}</strong>

                        <pre className="overflow-x-auto">
                            <code>{`select
    s.name,
    count(o.id) as total
from analytics.stores s
left join analytics.orders o
    on o.store_id = s.id
group by s.id, s.name;`}</code>
                        </pre>
                    </div>

                    <Alert>
                        <Info />

                        <AlertDescription>
                            {t("queries.modelNotice")}
                        </AlertDescription>
                    </Alert>

                    <div>
                        <Button variant="outline" asChild>
                            <Link href="/docs/model">
                                Data Model
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck />
                        {t("security.title")}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <ul className="grid list-disc gap-2 pl-5">
                        <li>{t("security.readOnly")}</li>
                        <li>{t("security.isolation")}</li>
                        <li>{t("security.password")}</li>
                        <li>{t("security.rotation")}</li>
                        <li>{t("security.restrictions")}</li>
                        <li>{t("security.exports")}</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gauge />
                        {t("performance.title")}
                    </CardTitle>

                    <CardDescription>
                        {t("performance.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4">
                    <ul className="grid list-disc gap-2 pl-5">
                        <li>{t("performance.filters")}</li>
                        <li>{t("performance.columns")}</li>
                        <li>{t("performance.aggregation")}</li>
                        <li>{t("performance.refresh")}</li>
                        <li>{t("performance.concurrency")}</li>
                    </ul>

                    <Alert>
                        <Info />

                        <AlertDescription>
                            {t("performance.availability")}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}

export default function BiDocsPage() {
    return (
        <Suspense
            fallback={
                <Skeleton className="h-96 w-full" />
            }
        >
            <BiDocsContent />
        </Suspense>
    );
}