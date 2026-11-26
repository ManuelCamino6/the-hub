import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import {
  getTranslations,
} from "next-intl/server";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  requireBillingContext,
} from "@/lib/billing/context";

import {
  listInvoices,
} from "@/lib/billing/invoice-service";

import {
  decodeCursor,
} from "@/lib/api/pagination";

import {
  InvoiceTable,
} from "@/components/billing/invoice-table";

import {
  BillingSkeleton,
} from "@/components/billing/billing-skeleton";

type Props = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    cursor?: string;
  }>;
};

async function InvoicesContent({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { cursor } = await searchParams;

  const { userId } =
    await requireBillingContext(id);

  const t = await getTranslations("Billing");
  const common = await getTranslations("Common");

  if (
    cursor &&
    (
      typeof cursor !== "string" ||
      cursor.length > 512 ||
      !decodeCursor(cursor)
    )
  ) {
    notFound();
  }

  const invoices = await listInvoices(
    userId,
    {
      project_id: id,
      limit: 50,
      cursor,
    }
  );

  const basePath =
    `/p/${id}/billing/invoices`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          asChild
        >
          <Link href={`/p/${id}/billing`}>
            {common("back")}
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold">
          {t("invoices")}
        </h1>

        <p className="text-muted-foreground">
          {t("invoicesDescription")}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <InvoiceTable
            projectId={id}
            invoices={invoices.data}
          />

          <div className="flex flex-wrap justify-end gap-2">
            {cursor && (
              <Button
                variant="outline"
                asChild
              >
                <Link href={basePath}>
                  {t("firstPage")}
                </Link>
              </Button>
            )}

            {invoices.next_cursor && (
              <Button
                variant="outline"
                asChild
              >
                <Link
                  href={`${basePath}?cursor=${encodeURIComponent(
                    invoices.next_cursor
                  )}`}
                >
                  {t("nextPage")}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t("invoiceNotice")}
      </p>
    </div>
  );
}

export default function InvoicesPage(
  props: Props
) {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <InvoicesContent {...props} />
    </Suspense>
  );
}