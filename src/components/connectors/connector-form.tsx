
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    ParameterEditor,
    type ParameterRow,
} from "./parameter-editor";

import { ModelPermissions } from "./model-permissions";
import { TokenDialog } from "./token-dialog";

import {
    createConnectorSchema,
    updateConnectorSchema,
    type ConnectorDetail,
    type ModelPermission,
} from "@/lib/connectors/schemas";

import type { ProtocolTable } from "@/lib/protocol/service";

type Props = {
    projectId: string;
    tables: ProtocolTable[];
    connector?: ConnectorDetail;
    readOnly?: boolean;
};

export function ConnectorForm({
    projectId,
    tables,
    connector,
    readOnly = false,
}: Props) {
    const t = useTranslations("Connectors");
    const common = useTranslations("Common");
    const router = useRouter();

    const [parameters, setParameters] =
        useState<ParameterRow[]>(() =>
            (connector?.parameters ?? []).map((item) => ({
                ...item,
                rowId: item.key,
            }))
        );

    const [permissions, setPermissions] =
        useState<ModelPermission[]>(
            connector?.models_permissions ?? []
        );

    const [pending, setPending] = useState(false);

    const [message, setMessage] = useState<
        "invalid" | "error" | "saved" | null
    >(null);

    const [credential, setCredential] = useState<{
        id: string;
        token: string;
    } | null>(null);

    const base = `/p/${projectId}/connectors`;

    const destination = connector
        ? `${base}/${connector.id}`
        : base;

    async function submit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (pending || credential || readOnly) return;

        const form = new FormData(event.currentTarget);

        const definition = {
            name: form.get("name"),
            description: form.get("description"),
            parameters: parameters.map((item) => ({
                key: item.key,
                type: item.type,
                required: item.required,
                encrypted: item.encrypted,
            })),
            models_permissions: permissions,
        };

        const parsed = connector
            ? updateConnectorSchema.safeParse({
                ...definition,
                status: connector.status,
            })
            : createConnectorSchema.safeParse({
                ...definition,
                project_id: projectId,
            });

        if (!parsed.success) {
            setMessage("invalid");
            return;
        }

        setPending(true);
        setMessage(null);

        try {
            const response = await fetch(
                connector
                    ? `/api/connectors/${connector.id}`
                    : "/api/connectors",
                {
                    method: connector ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(parsed.data),
                    cache: "no-store",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setMessage(
                    response.status === 422 ? "invalid" : "error"
                );
                return;
            }

            if (connector) {
                setMessage("saved");
                router.refresh();
            } else {
                setCredential(result.data);
            }
        } catch {
            setMessage("error");
        } finally {
            setPending(false);
        }
    }

    const disabled =
        pending || credential !== null || readOnly;

    return (
        <>
            <form onSubmit={submit} className="space-y-6">
                {connector && !readOnly && (
                    <Alert>
                        <AlertDescription>
                            {t("definitionWarning")}
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{t("general")}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t("name")}</Label>

                            <Input
                                id="name"
                                name="name"
                                defaultValue={connector?.name}
                                required
                                maxLength={120}
                                disabled={disabled}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">
                                {t("connectorDescription")}
                            </Label>

                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={connector?.description ?? ""}
                                maxLength={2000}
                                disabled={disabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                <ParameterEditor
                    value={parameters}
                    onChange={setParameters}
                    disabled={disabled}
                />

                <ModelPermissions
                    tables={tables}
                    value={permissions}
                    onChange={setPermissions}
                    disabled={disabled}
                />

                {message && (
                    <Alert
                        variant={
                            message === "saved"
                                ? "default"
                                : "destructive"
                        }
                    >
                        <AlertDescription>
                            {t(message)}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending || !!credential}
                        onClick={() => router.push(destination)}
                    >
                        {readOnly ? common("back") : common("cancel")}
                    </Button>

                    {!readOnly && (
                        <Button type="submit" disabled={disabled}>
                            {pending
                                ? connector
                                    ? t("saving")
                                    : t("creating")
                                : connector
                                    ? common("save")
                                    : t("create")}
                        </Button>
                    )}
                </div>
            </form>

            {credential && (
                <TokenDialog
                    token={credential.token}
                    onConfirm={() => {
                        const id = credential.id;

                        setCredential(null);
                        router.replace(`${base}/${id}`);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
