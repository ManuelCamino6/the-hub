import Link from "next/link";

import {
    getTranslations,
} from "next-intl/server";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import {
    AlertCircle,
    CheckCircle,
} from "lucide-react";

type Props = {
    projectId: string;
    operational: boolean;
    isAdmin: boolean;
};

export async function CommercialAlert({
    projectId,
    operational,
    isAdmin,
}: Props) {
    const t = await getTranslations("Sync");

    if (operational) {
        return (
            <Alert>
                <CheckCircle />

                <AlertDescription>
                    {t("operational")}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert variant="destructive">
            <AlertCircle />

            <AlertDescription>
                <div className="flex flex-col gap-3">
                    <p>
                        {t("commercialBlock")}
                    </p>

                    {isAdmin ? (
                        <div>
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <Link
                                    href={`/p/${projectId}/billing`}
                                >
                                    {t("viewBilling")}
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <p>
                            {t("commercialBlockMember")}
                        </p>
                    )}
                </div>
            </AlertDescription>
        </Alert>
    );
}