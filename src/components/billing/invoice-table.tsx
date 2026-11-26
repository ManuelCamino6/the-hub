import Link from "next/link";

import {
  getLocale,
  getTranslations,
} from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  formatBillingAmount,
  formatBillingDate,
} from "@/lib/billing/format";

import type {
  Invoice,
} from "@/lib/billing/schemas";

type Props = {
  projectId: string;
  invoices: Invoice[];
};

export async function InvoiceTable({
  projectId,
  invoices,
}: Props) {
  const t = await getTranslations("Billing");
  const locale = await getLocale();

  if (!invoices.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("emptyInvoices")}
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("invoiceDescription")}
              </TableHead>

              <TableHead>
                {t("amount")}
              </TableHead>

              <TableHead>
                {t("status")}
              </TableHead>

              <TableHead>
                {t("issuedAt")}
              </TableHead>

              <TableHead>
                {t("dueAt")}
              </TableHead>

              <TableHead>
                {t("paidAt")}
              </TableHead>

              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  {invoice.description}
                </TableCell>

                <TableCell>
                  {formatBillingAmount(
                    invoice.amount_minor,
                    invoice.currency,
                    locale
                  )}
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      invoice.status === "PAID"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {t(`invoiceStatuses.${invoice.status}`)}
                  </Badge>
                </TableCell>

                <TableCell>
                  {formatBillingDate(
                    invoice.created_at,
                    locale
                  )}
                </TableCell>

                <TableCell>
                  {formatBillingDate(
                    invoice.due_at,
                    locale
                  )}
                </TableCell>

                <TableCell>
                  {formatBillingDate(
                    invoice.paid_at,
                    locale
                  )}
                </TableCell>

                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`/p/${projectId}/billing/invoices/${invoice.id}`}
                    >
                      {t("viewInvoice")}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {invoices.map((invoice) => (
          <Card key={invoice.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {invoice.description}
                </p>

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

              <p className="text-lg font-semibold">
                {formatBillingAmount(
                  invoice.amount_minor,
                  invoice.currency,
                  locale
                )}
              </p>

              <div className="text-sm text-muted-foreground">
                {t("issuedAt")}:{" "}
                {formatBillingDate(
                  invoice.created_at,
                  locale
                )}
              </div>

              <Button
                variant="outline"
                asChild
              >
                <Link
                  href={`/p/${projectId}/billing/invoices/${invoice.id}`}
                >
                  {t("viewInvoice")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}