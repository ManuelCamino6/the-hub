import Link from "next/link";

import {
    getTranslations,
} from "next-intl/server";

import {
    ArrowRight,
    Info,
} from "lucide-react";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";

import {
    CodeExample,
} from "@/components/docs/code-example";

import {
    GuideSection,
} from "@/components/docs/guide-section";

import {
    examples,
    typescriptExample,
    protocolStates,
} from "@/lib/docs/examples";

import { Badge } from "@/components/ui/badge";

const sections = [
    "quickstart",
    "concepts",
    "authentication",
    "installations",
    "identifiers",
    "permissions",
    "modelDiscovery",
    "setup",
    "transactions",
    "list",
    "pull",
    "confirm",
    "setting",
    "idempotency",
    "states",
    "limits",
    "errors",
    "typescript",
] as const;

const concepts = [
    "business",
    "development",
    "connector",
    "instance",
    "batch",
    "change",
    "propagation",
] as const;

const errors = [
    [400, "Bad Request"],
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [404, "Not Found"],
    [409, "Conflict"],
    [422, "Validation Error"],
    [500, "Internal Server Error"],
    [503, "Service Unavailable"],
] as const;

export default async function DocsPage() {
    const t = await getTranslations("Docs");

    return (
        <article className="flex min-w-0 flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold">
                    {t("title")}
                </h1>

                <p className="text-muted-foreground">
                    {t("introDescription")}
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("guide.contents")}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <nav className="grid gap-2 sm:grid-cols-2">
                        {sections.map((section) => (
                            <a
                                key={section}
                                href={`#${section}`}
                                className="text-sm underline"
                            >
                                {t(`guide.${section}`)}
                            </a>
                        ))}
                    </nav>
                </CardContent>
            </Card>

            <GuideSection
                id="quickstart"
                title={t("guide.quickstart")}
            >
                <p>{t("guide.quickstartText")}</p>

                <Alert>
                    <Info />

                    <AlertDescription>
                        {t("guide.prerequisites")}
                    </AlertDescription>
                </Alert>

                <p>{t("guide.environment")}</p>

                <CodeExample
                    code={examples.environment}
                />
            </GuideSection>

            <GuideSection
                id="concepts"
                title={t("guide.concepts")}
            >
                <Table>
                    <TableBody>
                        {concepts.map((concept) => (
                            <TableRow key={concept}>
                                <TableCell className="font-medium">
                                    {t(`guide.${concept}`)}
                                </TableCell>

                                <TableCell className="whitespace-normal">
                                    {t(`guide.${concept}Text`)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </GuideSection>

            <GuideSection
                id="authentication"
                title={t("guide.authentication")}
            >
                <p>
                    {t("guide.authenticationText")}
                </p>

                <CodeExample
                    language="http"
                    code="Authorization: Bearer YOUR_CONNECTOR_TOKEN"
                />
            </GuideSection>

            <GuideSection
                id="installations"
                title={t("guide.installations")}
            >
                <p>
                    {t("guide.installationsText")}
                </p>

                <CodeExample
                    code={examples.installations}
                />

                <CodeExample
                    code={examples.configuration}
                />
            </GuideSection>

            <GuideSection
                id="identifiers"
                title={t("guide.identifiers")}
            >
                <p>{t("guide.idText")}</p>

                <p>{t("guide.refIdText")}</p>

                <p>{t("guide.globalRefText")}</p>

                <Alert>
                    <Info />

                    <AlertDescription>
                        {t("guide.referencesText")}
                    </AlertDescription>
                </Alert>
            </GuideSection>

            <GuideSection
                id="permissions"
                title={t("guide.permissions")}
            >
                <p>{t("guide.permissionsText")}</p>

                <CodeExample
                    language="text"
                    code={[
                        "can_list",
                        "can_send_post",
                        "can_send_update",
                        "can_send_delete",
                        "can_receive_post",
                        "can_receive_update",
                        "can_receive_delete",
                    ].join("\n")}
                />
            </GuideSection>

            <GuideSection
                id="modelDiscovery"
                title={t("guide.modelDiscovery")}
            >
                <p>
                    {t("guide.modelDiscoveryText")}
                </p>

                <CodeExample code={examples.model} />

                <div>
                    <Button variant="outline" asChild>
                        <Link href="/docs/model">
                            {t("exploreModel")}
                            <ArrowRight />
                        </Link>
                    </Button>
                </div>
            </GuideSection>

            <GuideSection
                id="setup"
                title={t("guide.setup")}
            >
                <p>{t("guide.setupText")}</p>

                <CodeExample code={examples.setup} />

                <Alert>
                    <Info />

                    <AlertDescription>
                        {t("guide.setupWarning")}
                    </AlertDescription>
                </Alert>
            </GuideSection>

            <GuideSection
                id="transactions"
                title={t("guide.transactions")}
            >
                <p>{t("guide.transactionsText")}</p>

                <CodeExample code={examples.begin} />

                <p>{t("guide.beginText")}</p>

                <h3 className="font-medium">
                    {t("guide.create")}
                </h3>

                <CodeExample code={examples.create} />

                <h3 className="font-medium">
                    {t("guide.update")}
                </h3>

                <CodeExample code={examples.update} />

                <h3 className="font-medium">
                    {t("guide.delete")}
                </h3>

                <CodeExample code={examples.delete} />

                <h3 className="font-medium">
                    {t("guide.commit")}
                </h3>

                <p>{t("guide.commitText")}</p>

                <CodeExample code={examples.commit} />

                <h3 className="font-medium">
                    {t("guide.rollback")}
                </h3>

                <p>{t("guide.rollbackText")}</p>

                <CodeExample
                    code={examples.rollback}
                />

                <h3 className="font-medium">
                    {t("guide.batchStatus")}
                </h3>

                <p>{t("guide.batchStatusText")}</p>

                <CodeExample
                    code={examples.batchStatus}
                />
            </GuideSection>

            <GuideSection
                id="list"
                title={t("guide.list")}
            >
                <p>{t("guide.listText")}</p>

                <CodeExample code={examples.list} />
            </GuideSection>

            <GuideSection
                id="pull"
                title={t("guide.pull")}
            >
                <p>{t("guide.pullText")}</p>

                <CodeExample code={examples.pull} />

                <CodeExample
                    code={examples.propagation}
                />
            </GuideSection>

            <GuideSection
                id="confirm"
                title={t("guide.confirm")}
            >
                <p>{t("guide.confirmText")}</p>

                <CodeExample code={examples.confirm} />

                <p>{t("guide.confirmCreateText")}</p>

                <CodeExample
                    language="json"
                    code={examples.confirmCreate}
                />

                <p>{t("guide.failedText")}</p>

                <CodeExample
                    language="json"
                    code={examples.failed}
                />
            </GuideSection>

            <GuideSection
                id="setting"
                title={t("guide.setting")}
            >
                <p>{t("guide.settingText")}</p>

                <CodeExample
                    code={examples.setting}
                />
            </GuideSection>

            <GuideSection
                id="idempotency"
                title={t("guide.idempotency")}
            >
                <p>{t("guide.idempotencyText")}</p>
            </GuideSection>

            <GuideSection
                id="states"
                title={t("guide.states")}
            >
                <Table>
                    <TableBody>
                        {([
                            ["batchStates", protocolStates.batch],
                            [
                                "propagationStates",
                                protocolStates.propagation,
                            ],
                            [
                                "instanceStates",
                                protocolStates.instance,
                            ],
                            [
                                "operationStates",
                                protocolStates.operation,
                            ],
                            [
                                "connectorStates",
                                protocolStates.connector,
                            ],
                        ] as const).map(([label, states]) => (
                            <TableRow key={label}>
                                <TableCell className="whitespace-normal font-medium">
                                    {t(`guide.${label}`)}
                                </TableCell>

                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {states.map((state) => (
                                            <Badge
                                                key={state}
                                                variant="outline"
                                            >
                                                {state}
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Alert>
                    <Info />

                    <AlertDescription>
                        {t("guide.statesNotice")}
                    </AlertDescription>
                </Alert>
            </GuideSection>

            <GuideSection
                id="limits"
                title={t("guide.limits")}
            >
                <p>{t("guide.limitsText")}</p>
            </GuideSection>

            <GuideSection
                id="errors"
                title={t("guide.errors")}
            >
                <p>{t("guide.errorsText")}</p>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>HTTP</TableHead>

                            <TableHead>
                                {t("description")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {errors.map(([status, label]) => (
                            <TableRow key={status}>
                                <TableCell>{status}</TableCell>

                                <TableCell>{label}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <CodeExample
                    language="json"
                    code={examples.error}
                />
            </GuideSection>

            <GuideSection
                id="typescript"
                title={t("guide.typescript")}
            >
                <p>{t("guide.typescriptText")}</p>

                <CodeExample
                    language="typescript"
                    code={typescriptExample}
                />
            </GuideSection>
        </article>
    );
}