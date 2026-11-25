
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import {
    requireOwnedConnector,
} from "@/lib/connectors/context";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type Props = {
    children: ReactNode;
    params: Promise<{
        id: string;
        connectorId: string;
    }>;
};

export default function ConnectorLayout(props: Props) {
    return (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <ConnectorLayoutContent {...props} />
        </Suspense>
    );
}

async function ConnectorLayoutContent({
    children,
    params,
}: Props) {
    const { id, connectorId } = await params;

    const { connector, canWrite } =
        await requireOwnedConnector(id, connectorId);

    const t = await getTranslations("Connectors");
    const common = await getTranslations("Common");

    const base = `/p/${id}/connectors/${connectorId}`;

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href={`/p/${id}/connectors`}>
                    {common("back")}
                </Link>
            </Button>

            <div className="space-y-2">
                <h1 className="text-2xl font-semibold">
                    {connector.name}
                </h1>

                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                        {t(`statuses.${connector.status}`)}
                    </Badge>

                    <Badge variant="outline">
                        {t(`visibilities.${connector.visibility}`)}
                    </Badge>
                </div>
            </div>

            <nav className="flex flex-wrap gap-2">
                <Button variant="ghost" asChild>
                    <Link href={base}>
                        {t("general")}
                    </Link>
                </Button>

                <Button variant="ghost" asChild>
                    <Link href={`${base}/definition`}>
                        {t("definition")}
                    </Link>
                </Button>

                <Button variant="ghost" asChild>
                    <Link href={`${base}/distribution`}>
                        {t("distribution")}
                    </Link>
                </Button>

                {canWrite && (
                    <Button variant="ghost" asChild>
                        <Link href={`${base}/credentials`}>
                            {t("credentials")}
                        </Link>
                    </Button>
                )}
            </nav>

            <Separator />

            {children}
        </div>
    );
}
