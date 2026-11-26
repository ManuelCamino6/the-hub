import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
    getLocale,
    getTranslations,
} from "next-intl/server";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    requireBillingContext,
} from "@/lib/billing/context";

import {
    getInvoice,
} from "@/lib/billing/invoice-service";

import {
    formatBillingAmount,
    formatBillingDate,
} from "@/lib/billing/format";

import {
    BillingSkeleton,
} from "@/components/billing/billing-skeleton";

import {
    DomainError,
} from "@/lib/api/domain-error";

type Props = {
    params: Promise<{
        id: string;
        invoiceId: string;
    }>;
};

function safeDocumentUrl(
    value: string | null
) {
    if (!value) {
        return null;
    }

    try {
        const url = new URL(value);

        const allowedHosts = [
            "mercadopago.com.ar",
            "www.mercadopago.com.ar",
            "mercadopago.com",
            "www.mercadopago.com",
        ];

        if (
            url.protocol !== "https:" ||
            !allowedHosts.includes(url.hostname) ||
            url.username ||
            url.password ||
            url.port
        ) {
            return null;
        }

        return url.href;

    } catch {
        return null;
    }
}

async function InvoiceContent({
    params,
}: Props) {
    const {
        id,
        invoiceId,
    } = await params;

    const { userId } =
        await requireBillingContext(id);

    if (!z.uuid().safeParse(invoiceId).success) {
        notFound();
    }

    const invoice = await getInvoice(
        userId,
        invoiceId,
        id
    ).catch((error: unknown) => {
        if (
            error instanceof DomainError &&
            error.status === 404
        ) {
            return null;
        }

        throw error;
    });

    if (!invoice) {
        notFound();
    }

    const t = await getTranslations("Billing");
    const common = await getTranslations("Common");
    const locale = await getLocale();

    const documentUrl =
        safeDocumentUrl(invoice.invoice_url);

    const dates = [
        {
            label: t("issuedAt"),
            value: invoice.created_at,
        },
        {
            label: t("dueAt"),
            value: invoice.due_at,
        },
        {
            label: t("paidAt"),
            value: invoice.paid_at,
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div>
                <Button
                    variant="ghost"
                    asChild
                >
                    <Link
                        href={`/p/${id}/billing/invoices`}
                    >
                        {common("back")}
                    </Link>
                </Button>

                <h1 className="text-2xl font-semibold">
                    {t("invoiceDetail")}
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle>
                            {invoice.description}
                        </CardTitle>

                        <Badge
                            variant={
                                invoice.status === "PAID"
                                    ? "default"
                                    : "secondary"
                            }
                        >
                            {t(`invoiceStatuses.${invoice.status}`)}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-6">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {t("amount")}
                        </p>

                        <p className="text-2xl font-semibold">
                            {formatBillingAmount(
                                invoice.amount_minor,
                                invoice.currency,
                                locale
                            )}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {dates.map((date) => (
                            <div key={date.label}>
                                <p className="text-sm text-muted-foreground">
                                    {date.label}
                                </p>

                                <p>
                                    {formatBillingDate(
                                        date.value,
                                        locale
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>

                    {documentUrl ? (
                        <Button asChild>
                            <a
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {t("openDocument")}
                            </a>
                        </Button>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t("noDocument")}
                        </p>
                    )}
                </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
                {t("invoiceNotice")}
            </p>
        </div>
    );
}

export default function InvoicePage(
    props: Props
) {
    return (
        <Suspense fallback={<BillingSkeleton />}>
            <InvoiceContent {...props} />
        </Suspense>
    );
}