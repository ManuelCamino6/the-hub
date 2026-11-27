import { getTranslations } from "next-intl/server";

import {
    Download,
    Info,
} from "lucide-react";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
    CodeExample,
} from "@/components/docs/code-example";

import {
    buildOpenApi,
} from "@/lib/docs/openapi";

export default async function ApiDocsPage() {
    const t = await getTranslations("Docs");

    const specification = buildOpenApi();

    const endpoints = Object.entries(
        specification.paths
    ).flatMap(([path, methods]) =>
        Object.entries(methods).map(
            ([method, operation]) => ({
                path,
                method,
                operation,
            })
        )
    );

    return (
        <article className="flex min-w-0 flex-col gap-6">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold">
                    {t("apiReference")}
                </h1>

                <p className="text-muted-foreground">
                    {t("apiReferenceDescription")}
                </p>
            </header>

            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                    OpenAPI {specification.openapi}
                </Badge>

                <Badge variant="secondary">
                    {t("endpointCount", {
                        count: endpoints.length,
                    })}
                </Badge>
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                    {t("openApiDescription")}
                </p>

                <div>
                    <Button variant="outline" asChild>
                        <a
                            href="/api/docs/openapi"
                            download="openapi.json"
                        >
                            <Download />
                            {t("openApiDownload")}
                        </a>
                    </Button>
                    <Button variant="outline" asChild>
                        <a
                            href="/docs/api/openapi.yaml"
                            download="openapi.yaml"
                        >
                            <Download />
                            {t("openApiYamlDownload")}
                        </a>
                    </Button>
                </div>
            </div>

            <Alert>
                <Info />

                <AlertDescription>
                    {t("apiContractNotice")}
                </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground">
                {t("contractLanguage")}
            </p>

            {specification.tags.map((tag) => {
                const operations = endpoints.filter(
                    ({ operation }) =>
                        operation.tags.includes(tag.name)
                );

                if (!operations.length) return null;

                return (
                    <section
                        key={tag.name}
                        className="flex min-w-0 flex-col gap-3"
                    >
                        <h2 className="text-lg font-semibold">
                            {tag.name}
                        </h2>

                        <Accordion
                            type="multiple"
                            className="w-full"
                        >
                            {operations.map(
                                ({ path, method, operation }) => (
                                    <AccordionItem
                                        key={operation.operationId}
                                        value={operation.operationId}
                                    >
                                        <AccordionTrigger>
                                            <div className="flex min-w-0 flex-col items-start gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">
                                                        {method.toUpperCase()}
                                                    </Badge>

                                                    <code className="break-all text-xs">
                                                        {path}
                                                    </code>
                                                </div>

                                                <span className="text-sm text-muted-foreground">
                                                    {operation.summary}
                                                </span>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent>
                                            <div className="flex min-w-0 flex-col gap-4">
                                                <p>
                                                    {operation.description}
                                                </p>

                                                <div>
                                                    <Badge variant="secondary">
                                                        {operation.security.length
                                                            ? t("authenticationRequired")
                                                            : t("publicEndpoint")}
                                                    </Badge>
                                                </div>

                                                {operation.parameters && (
                                                    <>
                                                        <h3 className="font-medium">
                                                            {t("parameters")}
                                                        </h3>

                                                        <CodeExample
                                                            language="json"
                                                            code={JSON.stringify(
                                                                operation.parameters,
                                                                null,
                                                                2
                                                            )}
                                                        />
                                                    </>
                                                )}

                                                <h3 className="font-medium">
                                                    {t("requestBody")}
                                                </h3>

                                                {operation.requestBody ? (
                                                    <CodeExample
                                                        language="json"
                                                        code={JSON.stringify(
                                                            operation.requestBody,
                                                            null,
                                                            2
                                                        )}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        {t("noRequestBody")}
                                                    </p>
                                                )}

                                                <h3 className="font-medium">
                                                    {t("response")}
                                                </h3>

                                                {Object.entries(
                                                    operation.responses
                                                ).map(([status, response]) => (
                                                    <div
                                                        key={status}
                                                        className="flex flex-col gap-2"
                                                    >
                                                        <div>
                                                            <Badge variant="outline">
                                                                HTTP {status}
                                                            </Badge>
                                                        </div>

                                                        <CodeExample
                                                            language="json"
                                                            code={JSON.stringify(
                                                                response,
                                                                null,
                                                                2
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            )}
                        </Accordion>
                    </section>
                );
            })}
        </article>
    );
}