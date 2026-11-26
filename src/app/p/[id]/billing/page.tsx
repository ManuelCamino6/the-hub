import Link from "next/link";
import { Suspense } from "react";

import {
  getTranslations,
} from "next-intl/server";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  requireBillingContext,
} from "@/lib/billing/context";

import {
  getSubscription,
} from "@/lib/billing/subscription-service";

import {
  listInvoices,
} from "@/lib/billing/invoice-service";

import {
  getBillingPlan,
} from "@/lib/billing/config";

import {
  SubscriptionCard,
} from "@/components/billing/subscription-card";

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
};

async function BillingContent({
  params,
}: Props) {
  const { id } = await params;

  const {
    userId,
    isAdmin,
  } = await requireBillingContext(id);

  const t = await getTranslations("Billing");

  const invoices = await listInvoices(
    userId,
    {
      project_id: id,
      limit: 5,
    }
  );

  let subscription = isAdmin
    ? await getSubscription(userId, id)
    : null;

  if (
    subscription &&
    subscription.status === "NONE"
  ) {
    try {
      const plan = getBillingPlan();

      subscription = {
        ...subscription,
        amount_minor: plan.amount_minor,
        currency: plan.currency,
        frequency: plan.frequency,
        frequency_type: plan.frequency_type,
      };

    } catch {
      subscription = {
        ...subscription,
        checkout_enabled: false,
      };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("title")}
        </h1>

        <p className="text-muted-foreground">
          {isAdmin
            ? t("description")
            : t("invoicesDescription")}
        </p>
      </div>

      {subscription && (
        <SubscriptionCard
          projectId={id}
          subscription={subscription}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              {t("invoices")}
            </CardTitle>

            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link
                href={`/p/${id}/billing/invoices`}
              >
                {t("viewAll")}
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <InvoiceTable
            projectId={id}
            invoices={invoices.data}
          />

          <p className="text-sm text-muted-foreground">
            {t("invoiceNotice")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage(
  props: Props
) {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent {...props} />
    </Suspense>
  );
}