
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import {
    requireOwnedConnector,
} from "@/lib/connectors/context";

import {
    getConnectorDistribution,
} from "@/lib/connectors/service";

import {
    DistributionForm,
} from "@/components/connectors/distribution-form";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
    params: Promise<{
        id: string;
        connectorId: string;
    }>;
};

export default function DistributionPage(props: Props) {
    return (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <DistributionContent {...props} />
        </Suspense>
    );
}

async function DistributionContent({ params }: Props) {
    const { id, connectorId } = await params;

    const { canWrite } =
        await requireOwnedConnector(id, connectorId);

    const [distribution, t] = await Promise.all([
        getConnectorDistribution(connectorId),
        getTranslations("Connectors"),
    ]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">
                {t("distribution")}
            </h2>

            <DistributionForm
                connectorId={connectorId}
                distribution={distribution}
                readOnly={!canWrite}
            />
        </div>
    );
}
