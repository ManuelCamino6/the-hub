import {
  getLocale,
  getTranslations,
} from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  formatBillingAmount,
  formatBillingDate,
} from "@/lib/billing/format";

import type {
  Subscription,
} from "@/lib/billing/schemas";

import {
  SubscriptionActions,
} from "./subscription-actions";

import {
  RefreshStatusButton,
} from "./refresh-status-button";

type Props = {
  projectId: string;
  subscription: Subscription;
};

export async function SubscriptionCard({
  projectId,
  subscription,
}: Props) {
  const t = await getTranslations("Billing");
  const locale = await getLocale();

  const badgeVariant =
    subscription.status === "ACTIVE"
      ? "default"
      : subscription.status === "PAST_DUE"
        ? "destructive"
        : "secondary";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {t("subscription")}
          </CardTitle>

          <Badge variant={badgeVariant}>
            {t(`statuses.${subscription.status}`)}
          </Badge>
        </div>

        <CardDescription>
          {t("plan")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div>
          {subscription.amount_minor !== null ? (
            <p className="text-2xl font-semibold">
              {formatBillingAmount(
                subscription.amount_minor,
                subscription.currency,
                locale
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("priceUnavailable")}
            </p>
          )}

          {subscription.frequency !== null &&
            subscription.frequency_type !== null && (
              <p className="text-sm text-muted-foreground">
                {t(
                  subscription.frequency_type === "months"
                    ? "frequencyMonths"
                    : "frequencyDays",
                  {
                    count: subscription.frequency,
                  }
                )}
              </p>
            )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("periodStart")}
            </p>

            <p>
              {formatBillingDate(
                subscription.period_start,
                locale
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              {t("periodEnd")}
            </p>

            <p>
              {formatBillingDate(
                subscription.period_end,
                locale
              )}
            </p>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            {subscription.operational
              ? t("operational")
              : t("notOperational")}
          </AlertDescription>
        </Alert>

        <div>
          <RefreshStatusButton />
        </div>

        <SubscriptionActions
          projectId={projectId}
          subscription={subscription}
        />
      </CardContent>
    </Card>
  );
}