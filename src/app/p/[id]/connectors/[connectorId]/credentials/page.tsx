
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
    requireOwnedConnector,
} from "@/lib/connectors/context";

import {
    ConnectorActions,
} from "@/components/connectors/connector-actions";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
    params: Promise<{
        id: string;
        connectorId: string;
    }>;
};

export default function CredentialsPage(props: Props) {
    return (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <CredentialsContent {...props} />
        </Suspense>
    );
}

async function CredentialsContent({ params }: Props) {
    const { id, connectorId } = await params;

    const { canWrite } =
        await requireOwnedConnector(id, connectorId);

    if (!canWrite) {
        redirect(`/p/${id}/connectors/${connectorId}`);
    }

    const t = await getTranslations("Connectors");

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("credentials")}</CardTitle>

                <CardDescription>
                    {t("credentialsDescription")}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="connector-id">
                        {t("connectorId")}
                    </Label>

                    <Input
                        id="connector-id"
                        value={connectorId}
                        readOnly
                        className="font-mono"
                    />
                </div>

                <ConnectorActions
                    projectId={id}
                    connectorId={connectorId}
                    mode="rotate"
                />
            </CardContent>
        </Card>
    );
}
