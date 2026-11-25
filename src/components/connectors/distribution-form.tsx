
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group";

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    connectorDistributionSchema,
    type ConnectorDistributionInput,
    type ConnectorVisibility,
} from "@/lib/connectors/schemas";

type Props = {
    connectorId: string;
    distribution: ConnectorDistributionInput;
    readOnly?: boolean;
};

export function DistributionForm({
    connectorId,
    distribution,
    readOnly = false,
}: Props) {
    const t = useTranslations("Connectors");
    const common = useTranslations("Common");
    const router = useRouter();

    const [visibility, setVisibility] =
        useState(distribution.visibility);

    const [projectIds, setProjectIds] =
        useState(distribution.project_ids);

    const [projectId, setProjectId] = useState("");
    const [pending, setPending] = useState(false);

    const [message, setMessage] = useState<
        "invalidProjectId" | "invalid" | "error" | "saved" | null
    >(null);

    const disabled = pending || readOnly;

    function addProject() {
        if (disabled) return;

        const id = projectId.trim().toLowerCase();

        if (
            !z.uuid().safeParse(id).success ||
            projectIds.includes(id)
        ) {
            setMessage("invalidProjectId");
            return;
        }

        setProjectIds((items) => [...items, id]);
        setProjectId("");
        setMessage(null);
    }

    async function save(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (disabled) return;

        const parsed = connectorDistributionSchema.safeParse({
            visibility,
            project_ids: projectIds,
        });

        if (!parsed.success) {
            setMessage("invalid");
            return;
        }

        setPending(true);
        setMessage(null);

        try {
            const response = await fetch(
                `/api/connectors/${connectorId}/permissions`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(parsed.data),
                }
            );

            if (!response.ok) {
                setMessage(
                    response.status === 422 ? "invalid" : "error"
                );
                return;
            }

            setMessage("saved");
            router.refresh();
        } catch {
            setMessage("error");
        } finally {
            setPending(false);
        }
    }

    return (
        <form onSubmit={save} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t("visibility")}</CardTitle>
                </CardHeader>

                <CardContent>
                    <RadioGroup
                        value={visibility}
                        disabled={disabled}
                        onValueChange={(value) =>
                            setVisibility(value as ConnectorVisibility)
                        }
                        className="space-y-4"
                    >
                        {(["PRIVATE", "PUBLIC"] as const).map((value) => (
                            <div
                                key={value}
                                className="flex items-start gap-3"
                            >
                                <RadioGroupItem
                                    id={value}
                                    value={value}
                                />

                                <div className="space-y-1">
                                    <Label htmlFor={value}>
                                        {t(`visibilities.${value}`)}
                                    </Label>

                                    <p className="text-sm text-muted-foreground">
                                        {value === "PRIVATE"
                                            ? t("privateDescription")
                                            : t("publicDescription")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("authorizedProjects")}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {!projectIds.length && (
                        <p className="text-sm text-muted-foreground">
                            {t("noAuthorizedProjects")}
                        </p>
                    )}

                    {projectIds.map((id) => (
                        <div
                            key={id}
                            className="flex items-center gap-2"
                        >
                            <Input
                                value={id}
                                readOnly
                                aria-label={t("projectIdPlaceholder")}
                                className="font-mono"
                            />

                            {!readOnly && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={pending}
                                    aria-label={t("removeProject")}
                                    onClick={() =>
                                        setProjectIds((items) =>
                                            items.filter((item) => item !== id)
                                        )
                                    }
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </div>
                    ))}

                    {!readOnly && (
                        <div className="flex flex-wrap gap-2">
                            <Input
                                value={projectId}
                                placeholder={t("projectIdPlaceholder")}
                                aria-label={t("projectIdPlaceholder")}
                                disabled={pending}
                                className="flex-1"
                                onChange={(event) =>
                                    setProjectId(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addProject();
                                    }
                                }}
                            />

                            <Button
                                type="button"
                                variant="outline"
                                disabled={pending || projectIds.length >= 200}
                                onClick={addProject}
                            >
                                <Plus />
                                {t("addProject")}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {!readOnly && (
                <Alert>
                    <AlertDescription>
                        {t("distributionWarning")}
                    </AlertDescription>
                </Alert>
            )}

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

            {!readOnly && (
                <div className="flex justify-end">
                    <Button type="submit" disabled={pending}>
                        {pending ? t("saving") : common("save")}
                    </Button>
                </div>
            )}
        </form>
    );
}
